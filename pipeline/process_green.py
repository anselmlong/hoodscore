#!/usr/bin/env python3
"""
process_green.py — Green Space dimension processor.

Uses spatial overlap to compute actual % of each planning area covered
by parks/nature reserves. Returns normalised green score.
"""

import os

import geopandas as gpd
import pandas as pd

from process_base import (
    DimensionProcessor,
    RAW_DIR,
    PROCESSED_DIR,
    load_planning_areas,
    normalise_scores,
    spatial_overlap_fraction,
)


class GreenProcessor(DimensionProcessor):
    """Green score: percentage of planning area covered by parks/nature reserves."""

    def __init__(self):
        super().__init__(
            dimension_name="green",
            label="Green Space",
            unit="% green coverage",
        )

    def download(self) -> None:
        pass

    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        print("  Loading parks & nature reserves...")
        parks_path = os.path.join(RAW_DIR, "parks-nature-reserves.geojson")
        if not os.path.exists(parks_path):
            raise FileNotFoundError(
                f"Parks data not found at {parks_path}. Run download_all.py first."
            )
        parks_gdf = gpd.read_file(parks_path)

        if parks_gdf.crs != planning_areas.crs:
            parks_gdf = parks_gdf.to_crs(planning_areas.crs)

        # Ensure we only have polygon geometries
        parks_gdf = parks_gdf[parks_gdf.geometry.type.isin(
            ["Polygon", "MultiPolygon"]
        )].copy()

        print(f"  Loaded {len(parks_gdf)} park/nature reserve polygons.")
        print("  Computing spatial overlap with planning areas...")

        overlap = spatial_overlap_fraction(parks_gdf, planning_areas)

        # Convert fraction to percentage
        raw_values = overlap.set_index("name")["overlap_fraction"] * 100

        # Normalise: more green = better score
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
    print("Processing Green Space dimension...")
    processor = GreenProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()