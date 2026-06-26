#!/usr/bin/env python3
"""
process_base.py — Base class for all dimension processors.

Provides:
  - DimensionProcessor base class with abstract download() and compute() methods.
  - Spatial join utility: count points/polygons per planning area and compute density.
  - Min-max normalisation with 5th/95th percentile clipping (scores 0-100).
"""

import os
import re
from abc import ABC, abstractmethod
from typing import Optional

import geopandas as gpd
import numpy as np
import pandas as pd


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)


class DimensionProcessor(ABC):
    """Abstract base class for all dimension score processors."""

    def __init__(self, dimension_name: str, label: str, unit: str):
        self.dimension_name = dimension_name
        self.label = label
        self.unit = unit

    @abstractmethod
    def download(self) -> None:
        """Download the required dataset(s)."""
        pass

    @abstractmethod
    def compute(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        """Compute dimension scores for each planning area.

        Args:
            planning_areas: GeoDataFrame of planning area boundaries (must have 'name' column).

        Returns:
            DataFrame with columns: planning_area, score, raw_value, unit
        """
        pass

    def run(self, planning_areas: gpd.GeoDataFrame) -> pd.DataFrame:
        """Convenience: download then compute."""
        self.download()
        return self.compute(planning_areas)


# ── Spatial utilities ──────────────────────────────────────────────────────────

def spatial_join_count(
    points_gdf: gpd.GeoDataFrame,
    areas_gdf: gpd.GeoDataFrame,
    area_id_col: str = "name",
    buffer_metres: Optional[float] = None,
) -> pd.DataFrame:
    """Count points (or features) intersecting each planning area, optionally buffering.

    Args:
        points_gdf: GeoDataFrame of point features (or any geometry).
        areas_gdf: GeoDataFrame of polygon boundaries.
        area_id_col: Column name in areas_gdf that identifies each area.
        buffer_metres: If set, buffer centroids/areas by this distance in metres.
                       Uses a transient UTM zone to do the buffering accurately.

    Returns:
        DataFrame with columns: [area_id_col, count]
    """
    # Ensure both are in the same CRS
    if points_gdf.crs is None or areas_gdf.crs is None:
        raise ValueError("Both GeoDataFrames must have a CRS set.")

    if points_gdf.crs != areas_gdf.crs:
        points_gdf = points_gdf.to_crs(areas_gdf.crs)

    if buffer_metres:
        # Project to a local UTM for accurate buffering
        utm_crs = _estimate_utm_crs(areas_gdf)
        areas_utm = areas_gdf.to_crs(utm_crs)
        points_utm = points_gdf.to_crs(utm_crs)

        # Compute area centroids, buffer them
        centroids = areas_utm.geometry.centroid
        buffered = centroids.buffer(buffer_metres)

        # Spatial join: which points fall within each buffer?
        buffered_areas = gpd.GeoDataFrame(
            areas_utm[[area_id_col]].copy(),
            geometry=buffered,
            crs=utm_crs,
        )
        joined = gpd.sjoin(
            points_utm,
            buffered_areas,
            predicate="within",
            how="inner",
        )
    else:
        # Direct spatial join
        joined = gpd.sjoin(
            points_gdf,
            areas_gdf[[area_id_col, "geometry"]],
            predicate="within",
            how="inner",
        )

    # Count per area
    count_series = joined.groupby(area_id_col).size()
    result = (
        areas_gdf[[area_id_col]]
        .drop_duplicates()
        .merge(
            count_series.rename("count").reset_index(),
            on=area_id_col,
            how="left",
        )
        .fillna(0)
    )
    result["count"] = result["count"].astype(int)
    return result


def spatial_overlap_fraction(
    polygons_gdf: gpd.GeoDataFrame,
    areas_gdf: gpd.GeoDataFrame,
    area_id_col: str = "name",
) -> pd.DataFrame:
    """Compute the fraction of each planning area covered by a set of polygons.

    Args:
        polygons_gdf: GeoDataFrame of polygon features (e.g. parks).
        areas_gdf: GeoDataFrame of planning area boundaries.
        area_id_col: Column identifying each area.

    Returns:
        DataFrame with columns: [area_id_col, overlap_fraction]
    """
    if polygons_gdf.crs is None or areas_gdf.crs is None:
        raise ValueError("Both GeoDataFrames must have a CRS set.")

    if polygons_gdf.crs != areas_gdf.crs:
        polygons_gdf = polygons_gdf.to_crs(areas_gdf.crs)

    results = []
    for _, area in areas_gdf.iterrows():
        area_geom = area.geometry
        area_name = area[area_id_col]
        area_area_sq = area_geom.area

        if area_area_sq <= 0:
            results.append({"area": area_name, "overlap_fraction": 0.0})
            continue

        # Find overlapping park polygons
        intersecting = polygons_gdf[polygons_gdf.intersects(area_geom)]
        if intersecting.empty:
            results.append({"area": area_name, "overlap_fraction": 0.0})
            continue

        # Union of intersecting park polygons clipped to area boundary
        clipped = gpd.clip(intersecting, area_geom)
        overlap_area = clipped.area.sum()
        fraction = overlap_area / area_area_sq
        results.append({"area": area_name, "overlap_fraction": fraction})

    result_df = pd.DataFrame(results)
    result_df.columns = [area_id_col, "overlap_fraction"]
    return result_df


def compute_area_density(
    counts_df: pd.DataFrame,
    areas_gdf: gpd.GeoDataFrame,
    area_id_col: str = "name",
    area_sq_km_col: str = "area_sq_km",
) -> pd.DataFrame:
    """Compute density per square km for each area.

    Args:
        counts_df: DataFrame with [area_id_col, count].
        areas_gdf: Must have area_sq_km for each area (pre-computed).
        area_id_col: Column name.
        area_sq_km_col: Column name for area in square km.

    Returns:
        DataFrame with columns: [area_id_col, count, density_sqkm]
    """
    merged = counts_df.merge(
        areas_gdf[[area_id_col, area_sq_km_col]],
        on=area_id_col,
        how="left",
    )
    merged["density_sqkm"] = merged["count"] / merged[area_sq_km_col].replace(0, np.nan)
    merged["density_sqkm"] = merged["density_sqkm"].fillna(0.0)
    return merged


def compute_area_areas(areas_gdf: gpd.GeoDataFrame, area_id_col: str = "name") -> pd.DataFrame:
    """Compute area (sq km) for each planning area.

    Projects to an equal-area CRS for accurate area measurement.

    Returns:
        DataFrame with columns: [area_id_col, area_sq_km]
    """
    utm_crs = _estimate_utm_crs(areas_gdf)
    areas_utm = areas_gdf.to_crs(utm_crs)
    area_series = areas_utm.geometry.area / 1_000_000  # sq m → sq km
    result = areas_gdf[[area_id_col]].copy()
    result["area_sq_km"] = area_series.values
    return result


def normalise_scores(
    values: pd.Series,
    lower_is_better: bool = False,
    clip_percentile: float = 5.0,
) -> pd.Series:
    """Min-max normalisation with percentile clipping, producing scores 0-100.

    Args:
        values: Raw values to normalise.
        lower_is_better: If True, invert so lower raw → higher score.
        clip_percentile: Percentile for clipping outliers (default: 5th/95th).

    Returns:
        Series with values in [0, 100].
    """
    vals = values.copy().astype(float)

    # Clip at percentiles
    lo = np.nanpercentile(vals, clip_percentile)
    hi = np.nanpercentile(vals, 100 - clip_percentile)
    vals = vals.clip(lo, hi)

    # Min-max
    vmin = vals.min()
    vmax = vals.max()
    if vmax - vmin == 0:
        return pd.Series(50.0, index=vals.index)

    if lower_is_better:
        scores = (vmax - vals) / (vmax - vmin)
    else:
        scores = (vals - vmin) / (vmax - vmin)

    return scores * 100.0


def _estimate_utm_crs(gdf: gpd.GeoDataFrame) -> str:
    """Estimate a suitable UTM CRS for Singapore (EPSG:32648 = UTM zone 48N)."""
    # Singapore is in UTM zone 48N
    return "EPSG:32648"


def slugify_area_name(value: str) -> str:
    """Create the stable slug used by the frontend from a planning area name."""
    text = str(value).strip().lower().replace("&", "and")
    text = re.sub(r"[/_]+", "-", text)
    text = re.sub(r"[^a-z0-9-]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def load_planning_areas() -> gpd.GeoDataFrame:
    """Load the URA MP2025 planning area boundary GeoJSON."""
    path = os.path.join(RAW_DIR, "ura-mp2025-planning-area.geojson")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Planning area boundary not found at {path}. "
            "Run download_all.py first."
        )
    gdf = gpd.read_file(path)

    # Normalise the name column — search for common name fields
    for col in ["name", "pln_area_n", "planning_area", "area_name", "PLN_AREA_N"]:
        if col in gdf.columns:
            gdf = gdf.rename(columns={col: "name"})
            break

    if "name" not in gdf.columns:
        # Use first string column as name
        for col in gdf.columns:
            if gdf[col].dtype == object:
                gdf = gdf.rename(columns={col: "name"})
                break

    gdf["name"] = gdf["name"].astype(str).str.strip()
    return gdf
