#!/usr/bin/env python3
"""
process_transit.py — Transit dimension processor.

Computes: for each planning area, count of bus stops + MRT exits within 1km
of area centroid, and density per sq km. Returns normalised transit score.
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
    spatial_join_count,
)


class TransitProcessor(DimensionProcessor):
    """Transit score: bus stop + MRT exit density within 1km of area centroid."""

    def __init__(self):
        super().__init__(
            dimension_name="transit",
            label="Transit",
            unit="stops & stations within 1km",
        )

    def download(self) -> None:
        # Data is already downloaded by download_all.py
        pass

    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        print("  Loading bus stops...")
        bus_path = os.path.join(RAW_DIR, "bus-stops.geojson")
        if not os.path.exists(bus_path):
            raise FileNotFoundError(f"Bus stops not found at {bus_path}. Run download_all.py first.")
        bus_gdf = gpd.read_file(bus_path)

        print("  Loading MRT exits...")
        mrt_path = os.path.join(RAW_DIR, "mrt-exits.geojson")
        if not os.path.exists(mrt_path):
            raise FileNotFoundError(f"MRT exits not found at {mrt_path}. Run download_all.py first.")
        mrt_gdf = gpd.read_file(mrt_path)

        print("  Computing transit counts within 1km of area centroids...")
        # Ensure both are in the same CRS as planning areas
        if bus_gdf.crs != planning_areas.crs:
            bus_gdf = bus_gdf.to_crs(planning_areas.crs)
        if mrt_gdf.crs != planning_areas.crs:
            mrt_gdf = mrt_gdf.to_crs(planning_areas.crs)

        # Combine bus stops and MRT exits
        combined = pd.concat([bus_gdf, mrt_gdf], ignore_index=True)
        if "geometry" not in combined.columns:
            combined = gpd.GeoDataFrame(combined, geometry="geometry", crs=planning_areas.crs)

        counts = spatial_join_count(combined, planning_areas, buffer_metres=1000)

        # Compute area sizes
        area_sizes = compute_area_areas(planning_areas)

        # Merge counts with area sizes
        transit_data = counts.merge(area_sizes, on="name", how="left")
        transit_data["density_sqkm"] = transit_data["count"] / transit_data["area_sq_km"].replace(0, pd.NA)
        transit_data["density_sqkm"] = transit_data["density_sqkm"].fillna(0.0)

        # Normalise: more transit = better score
        raw_values = transit_data.set_index("name")["count"]
        scores = normalise_scores(raw_values, lower_is_better=False)

        result = pd.DataFrame({
            "planning_area": scores.index,
            "dimension": self.dimension_name,
            "label": self.label,
            "score": scores.round(1).values,
            "raw_value": raw_values.values,
            "unit": self.unit,
        }).reset_index(drop=True)

        # Save
        out_path = os.path.join(PROCESSED_DIR, f"{self.dimension_name}.csv")
        result.to_csv(out_path, index=False)
        print(f"  Saved: {out_path}")

        return result


def main():
    print("Processing Transit dimension...")
    processor = TransitProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()