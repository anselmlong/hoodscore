#!/usr/bin/env python3
"""
process_safety.py — Safety dimension processor.

Downloads Crime by NPC (CSV) + NPC Boundary (GEOJSON).
Intersects NPC boundaries with planning areas and apportions crimes by
overlap area. For each planning area, compute crimes per sq km. Invert
the score so high crime = low safety score.
"""

import os

import geopandas as gpd
import pandas as pd

from process_base import (
    DimensionProcessor,
    RAW_DIR,
    PROCESSED_DIR,
    compute_area_areas,
    load_planning_areas,
    normalise_scores,
)


class SafetyProcessor(DimensionProcessor):
    """Safety score: crimes per sq km (inverted)."""

    def __init__(self):
        super().__init__(
            dimension_name="safety",
            label="Safety",
            unit="crimes per sq km",
        )

    def download(self) -> None:
        pass

    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        print("  Loading crime CSV...")
        crime_path = os.path.join(RAW_DIR, "crime-by-npc.csv")
        if not os.path.exists(crime_path):
            raise FileNotFoundError(
                f"Crime data not found at {crime_path}. Run download_all.py first."
            )

        # Load crime data
        crime_df = None
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "ISO-8859-1"]:
            try:
                crime_df = pd.read_csv(crime_path, encoding=encoding)
                print(f"  Loaded with encoding: {encoding} ({len(crime_df)} rows)")
                break
            except (UnicodeDecodeError, pd.errors.EmptyDataError):
                continue

        if crime_df is None:
            raise ValueError("Could not load crime CSV.")

        print(f"  Crime CSV columns: {list(crime_df.columns)}")

        # Find relevant columns
        npc_col = None
        for col in ["npc", "neighbourhood_police_centre", "neighbourhood police centre",
                     "police_centre", "police centre", "NPC", "Neighbourhood Police Centre"]:
            if col in crime_df.columns:
                npc_col = col
                break

        crime_value_col = None
        for col in ["crime_count", "value", "count", "total", "offence_count", "incidents",
                     "crime_count_per_100000", "val"]:
            if col in crime_df.columns:
                crime_value_col = col
                break

        # Also look for numeric columns that might be crime counts
        if crime_value_col is None:
            for col in crime_df.columns:
                if crime_df[col].dtype in ("int64", "float64") and col != npc_col:
                    crime_value_col = col
                    break

        # Also look for year/population columns
        year_col = None
        for col in ["year", "Year", "period"]:
            if col in crime_df.columns:
                year_col = col
                break

        # Find the population column if it exists in the crime CSV
        pop_col = None
        for col in ["population", "Population", "residents", "total_population"]:
            if col in crime_df.columns:
                pop_col = col
                break

        if npc_col is None:
            raise ValueError(f"Cannot find NPC column in crime CSV. Columns: {list(crime_df.columns)}")

        print(f"  NPC column: '{npc_col}'")
        print(f"  Crime value column: '{crime_value_col}'")
        if year_col:
            print(f"  Year column: '{year_col}'")

        # If there's a year column, filter to most recent year
        if year_col:
            years = crime_df[year_col].dropna().unique()
            if len(years) > 1:
                try:
                    max_year = sorted(years, reverse=True)[0]
                    crime_df = crime_df[crime_df[year_col] == max_year].copy()
                    print(f"  Filtered to year: {max_year}")
                except (TypeError, ValueError):
                    pass

        # Aggregate crimes by NPC
        if crime_value_col:
            crime_by_npc = crime_df.groupby(npc_col)[crime_value_col].sum().reset_index()
        else:
            # If no value column, count rows per NPC
            crime_by_npc = crime_df.groupby(npc_col).size().reset_index(name="crime_count")
            crime_value_col = "crime_count"

        crime_by_npc.columns = ["npc_name", "total_crimes"]
        crime_by_npc["npc_name"] = crime_by_npc["npc_name"].astype(str).str.strip()
        print(f"  Aggregated crime data: {len(crime_by_npc)} NPCs")

        print("  Loading NPC boundaries...")
        npc_boundary_path = os.path.join(RAW_DIR, "npc-boundary.geojson")
        if not os.path.exists(npc_boundary_path):
            raise FileNotFoundError(
                f"NPC boundary not found at {npc_boundary_path}. Run download_all.py first."
            )
        npc_gdf = gpd.read_file(npc_boundary_path)

        # Find the NPC name column in boundary
        npc_boundary_col = None
        for col in ["name", "npc_name", "npc", "NPC", "Name", "sector"]:
            if col in npc_gdf.columns:
                npc_boundary_col = col
                break

        if npc_boundary_col is None:
            # Use first string column
            for col in npc_gdf.columns:
                if npc_gdf[col].dtype == object and col != "geometry":
                    npc_boundary_col = col
                    break

        npc_gdf["npc_name"] = npc_gdf[npc_boundary_col].astype(str).str.strip()
        print(f"  NPC boundary column: '{npc_boundary_col}' ({len(npc_gdf)} NPCs)")

        # Merge crime data with NPC boundaries
        npc_merged = npc_gdf.merge(crime_by_npc, on="npc_name", how="left").fillna(0)

        if npc_merged.crs != planning_areas.crs:
            npc_merged = npc_merged.to_crs(planning_areas.crs)

        # For NPCs that overlap multiple areas, apportion crimes by true clipped overlap area.
        print("  Apportioning crimes by true polygon overlap...")
        utm_crs = "EPSG:32648"
        npc_utm = npc_merged[["npc_name", "total_crimes", "geometry"]].to_crs(utm_crs)
        areas_utm = planning_areas[["name", "geometry"]].to_crs(utm_crs)

        overlap = gpd.overlay(npc_utm, areas_utm, how="intersection", keep_geom_type=False)
        overlap["overlap_area"] = overlap.geometry.area
        npc_total_area = overlap.groupby("npc_name")["overlap_area"].transform("sum")
        overlap["area_fraction"] = (overlap["overlap_area"] / npc_total_area.replace(0, pd.NA)).fillna(0)
        overlap["apportioned_crimes"] = overlap["total_crimes"] * overlap["area_fraction"]

        # Sum crimes per planning area
        crime_by_area = overlap.groupby("name")["apportioned_crimes"].sum().reset_index()
        crime_by_area.columns = ["name", "total_crimes"]

        print("  Computing safety score (crimes per sq km, inverted)...")
        area_sizes = compute_area_areas(planning_areas)

        safety_data = planning_areas[["name"]].drop_duplicates().merge(
            crime_by_area, on="name", how="left"
        ).fillna(0)
        safety_data = safety_data.merge(area_sizes, on="name", how="left")

        # Crimes per sq km as a proxy for crimes per 10,000 residents
        safety_data["crimes_per_sqkm"] = (
            safety_data["total_crimes"] / safety_data["area_sq_km"].replace(0, pd.NA)
        ).fillna(0.0)

        # Normalise: lower crime = higher safety score (lower_is_better=True)
        raw_values = safety_data.set_index("name")["crimes_per_sqkm"]
        scores = normalise_scores(raw_values, lower_is_better=True)

        result = pd.DataFrame({
            "planning_area": scores.index,
            "dimension": self.dimension_name,
            "label": self.label,
            "score": scores.round(1).values,
            "raw_value": raw_values.values,
            "unit": self.unit,
        }).reset_index(drop=True)

        out_path = os.path.join(PROCESSED_DIR, f"{self.dimension_name}.csv")
        result.to_csv(out_path, index=False)
        print(f"  Saved: {out_path}")

        return result


def main():
    print("Processing Safety dimension...")
    processor = SafetyProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()
