#!/usr/bin/env python3
"""
process_food.py — Food (Hawker Centre) dimension processor.

Computes: for each planning area, count of hawker centres within 1km
of area centroid, and density. Returns normalised food score.
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


class FoodProcessor(DimensionProcessor):
    """Food score: hawker centre density within 1km of area centroid."""

    def __init__(self):
        super().__init__(
            dimension_name="food",
            label="Food",
            unit="hawker centres within 1km",
        )

    def download(self) -> None:
        pass

    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        print("  Loading hawker centres...")
        hawker_path = os.path.join(RAW_DIR, "hawker-centres.geojson")
        if not os.path.exists(hawker_path):
            raise FileNotFoundError(
                f"Hawker centres not found at {hawker_path}. Run download_all.py first."
            )
        hawker_gdf = gpd.read_file(hawker_path)

        if hawker_gdf.crs != planning_areas.crs:
            hawker_gdf = hawker_gdf.to_crs(planning_areas.crs)

        print("  Computing hawker centre counts within 1km of area centroids...")
        counts = spatial_join_count(hawker_gdf, planning_areas, buffer_metres=1000)

        area_sizes = compute_area_areas(planning_areas)
        food_data = counts.merge(area_sizes, on="name", how="left")
        food_data["density_sqkm"] = food_data["count"] / food_data["area_sq_km"].replace(0, pd.NA)
        food_data["density_sqkm"] = food_data["density_sqkm"].fillna(0.0)

        raw_values = food_data.set_index("name")["count"]
        scores = normalise_scores(raw_values, lower_is_better=False)

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
    print("Processing Food dimension...")
    processor = FoodProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()