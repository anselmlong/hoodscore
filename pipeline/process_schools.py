#!/usr/bin/env python3
"""
process_schools.py — Schools dimension processor.

Computes: for each planning area, school count and density.
Also computes distance from centroid to nearest school.
The MOE Schools CSV already has a planning_area column — no geocoding needed!
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


class SchoolsProcessor(DimensionProcessor):
    """Schools score: school count per planning area, density, nearest distance."""

    def __init__(self):
        super().__init__(
            dimension_name="schools",
            label="Schools",
            unit="schools",
        )

    def download(self) -> None:
        pass

    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        print("  Loading schools CSV...")
        schools_path = os.path.join(RAW_DIR, "schools.csv")
        debug_path = os.path.join(RAW_DIR, "schools_debug.json")

        if not os.path.exists(schools_path):
            # Try finding any schools file
            alt_paths = [
                os.path.join(RAW_DIR, "schools.csv"),
                os.path.join(RAW_DIR, "schools_directory.csv"),
                os.path.join(RAW_DIR, "moe_schools.csv"),
            ]
            schools_path = None
            for p in alt_paths:
                if os.path.exists(p):
                    schools_path = p
                    break

            if schools_path is None:
                raise FileNotFoundError(
                    f"Schools data not found. Run download_all.py first."
                )
            print(f"  Found at: {schools_path}")

        # Load CSV — try different encodings
        df = None
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "ISO-8859-1"]:
            try:
                df = pd.read_csv(schools_path, encoding=encoding)
                print(f"  Loaded with encoding: {encoding} ({len(df)} rows, {len(df.columns)} cols)")
                break
            except (UnicodeDecodeError, pd.errors.EmptyDataError):
                continue

        if df is None:
            raise ValueError("Could not load schools CSV with any encoding.")

        # Find the planning_area column — try different names
        planning_area_col = None
        for col in ["planning_area", "planningarea", "PLANNING_AREA", "area", "town"]:
            if col in df.columns:
                planning_area_col = col
                break

        if planning_area_col is None:
            print(f"  WARNING: No planning_area column found. Columns: {list(df.columns)}")
            # If we have coordinates, we can do spatial join
            lat_col, lng_col = None, None
            for c in df.columns:
                cl = c.lower()
                if cl in ("latitude", "lat", "y_coord", "y"):
                    lat_col = c
                if cl in ("longitude", "lng", "lon", "long", "x_coord", "x"):
                    lng_col = c

            if lat_col and lng_col:
                print(f"  Using lat/lng columns: {lat_col}, {lng_col}")
                gdf = gpd.GeoDataFrame(
                    df,
                    geometry=gpd.points_from_xy(df[lng_col], df[lat_col]),
                    crs="EPSG:4326",
                )
                if gdf.crs != planning_areas.crs:
                    gdf = gdf.to_crs(planning_areas.crs)

                joined = gpd.sjoin(gdf, planning_areas[["name", "geometry"]], predicate="within")
                counts = joined.groupby("name").size().reset_index(name="count")
            else:
                raise ValueError(
                    f"Cannot determine planning area. CSV has no planning_area column "
                    f"and no lat/lng columns. Columns: {list(df.columns)}"
                )
        else:
            print(f"  Using planning_area column: '{planning_area_col}'")
            # Clean and group
            df[planning_area_col] = df[planning_area_col].astype(str).str.strip()
            counts = df.groupby(planning_area_col).size().reset_index(name="count")
            counts = counts.rename(columns={planning_area_col: "name"})

        # Merge with all planning areas (some may have 0 schools)
        all_areas = planning_areas[["name"]].drop_duplicates().copy()
        all_areas = all_areas.merge(counts, on="name", how="left").fillna(0)
        all_areas["count"] = all_areas["count"].astype(int)

        # Compute area sizes and density
        area_sizes = compute_area_areas(planning_areas)
        school_data = all_areas.merge(area_sizes, on="name", how="left")
        school_data["density_sqkm"] = (
            school_data["count"] / school_data["area_sq_km"].replace(0, pd.NA)
        ).fillna(0.0)

        # Compute distance from centroid to nearest school
        print("  Computing distances to nearest school...")
        if planning_area_col in df.columns:
            # If we have planning_area mapping directly, we can't compute distances
            # (no coordinates in the CSV). Set to None.
            nearest_distance = pd.Series(pd.NA, index=school_data.index)
        else:
            # We have coordinates — compute distance to nearest school
            areas_utm = planning_areas.to_crs("EPSG:32648")
            centroids = areas_utm.geometry.centroid
            schools_utm = gdf.to_crs("EPSG:32648")
            school_coords = schools_utm.geometry
            # For each area, find min distance to any school
            distances = []
            for i, (_, area) in enumerate(areas_utm.iterrows()):
                centroid = centroids.iloc[i]
                min_dist = school_coords.distance(centroid).min()
                distances.append(min_dist)
            nearest_distance = pd.Series(distances, index=school_data.index)

        # Normalise: more schools = better score
        raw_values = school_data.set_index("name")["count"]
        scores = normalise_scores(raw_values, lower_is_better=False)

        result = pd.DataFrame({
            "planning_area": scores.index,
            "dimension": self.dimension_name,
            "label": self.label,
            "score": scores.round(1).values,
            "raw_value": raw_values.values,
            "unit": self.unit,
            "nearest_school_distance_km": nearest_distance.values,
        }).reset_index(drop=True)

        out_path = os.path.join(PROCESSED_DIR, f"{self.dimension_name}.csv")
        result.to_csv(out_path, index=False)
        print(f"  Saved: {out_path}")

        return result


def main():
    print("Processing Schools dimension...")
    processor = SchoolsProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()