#!/usr/bin/env python3
"""Convert URA Master Plan 2025 planning area boundaries to our app format.

Reads the high-resolution GeoJSON from data/raw, maps URA area names to
our slug format, and writes the result to public/planning-areas.geojson
with slug/name/region properties for the Map component.

Areas in our dataset without real URA boundaries get approximate bounding boxes.
"""

import json
import sys
from pathlib import Path

RAW_BOUNDARIES = Path("data/raw/ura-mp2025-planning-area.geojson")
OUTPUT = Path("public/planning-areas.geojson")

# Manual overrides for names that don't slugify cleanly
NAME_OVERRIDES = {
    "KALLANG": "kallang-whampoa",
    "SIMPANG": "sim-pang",
}

# URA areas we skip (not in our dataset)
SKIP_AREAS = {"CENTRAL WATER CATCHMENT", "NORTH-EASTERN ISLANDS", "PAYA LEBAR", "SELETAR"}

REGION_MAP = {
    "CENTRAL REGION": "Central",
    "EAST REGION": "East",
    "NORTH REGION": "North",
    "NORTH-EAST REGION": "North-East",
    "WEST REGION": "West",
}

# Approximate bounding boxes for areas in our dataset but not in URA boundaries
FALLBACK_FEATURES = [
    {
        "properties": {"name": "Benoi", "slug": "benoi", "region": "West"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[103.700, 1.315], [103.720, 1.315], [103.720, 1.300], [103.700, 1.300], [103.700, 1.315]]],
        },
    },
    {
        "properties": {"name": "Central Area", "slug": "central-area", "region": "Central"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[103.838, 1.296], [103.862, 1.296], [103.862, 1.278], [103.838, 1.278], [103.838, 1.296]]],
        },
    },
    {
        "properties": {"name": "Gul", "slug": "gul", "region": "West"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[103.660, 1.322], [103.682, 1.322], [103.682, 1.303], [103.660, 1.303], [103.660, 1.322]]],
        },
    },
    {
        "properties": {"name": "Mandai Wildlife", "slug": "mandai-wildlife", "region": "North"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[103.828, 1.422], [103.862, 1.422], [103.862, 1.398], [103.828, 1.398], [103.828, 1.422]]],
        },
    },
]


def to_slug(name: str) -> str:
    """Convert URA uppercase name to our slug format."""
    if name in NAME_OVERRIDES:
        return NAME_OVERRIDES[name]
    return name.lower().replace(" ", "-").replace("/", "-")


def main():
    if not RAW_BOUNDARIES.exists():
        print(f"ERROR: {RAW_BOUNDARIES} not found", file=sys.stderr)
        sys.exit(1)

    with open(RAW_BOUNDARIES) as f:
        ura = json.load(f)

    features_out = []
    skipped = []
    slug_seen = set()

    for feat in ura["features"]:
        props = feat["properties"]
        name = props.get("PLN_AREA_N", "")
        if not name:
            continue

        if name in SKIP_AREAS:
            skipped.append(name)
            continue

        slug = to_slug(name)
        region = REGION_MAP.get(props.get("REGION_N", ""), props.get("REGION_N", ""))

        # Skip duplicates (shouldn't happen but be safe)
        if slug in slug_seen:
            continue
        slug_seen.add(slug)

        features_out.append({
            "type": "Feature",
            "properties": {
                "name": name.title().replace("/", "/"),
                "slug": slug,
                "region": region,
            },
            "geometry": feat["geometry"],
        })

    # Add fallback bounding boxes for areas in our dataset without real boundaries
    for fb in FALLBACK_FEATURES:
        slug = fb["properties"]["slug"]
        if slug not in slug_seen:
            features_out.append({
                "type": "Feature",
                "properties": fb["properties"],
                "geometry": fb["geometry"],
            })
            slug_seen.add(slug)

    collection = {"type": "FeatureCollection", "features": features_out}

    with open(OUTPUT, "w") as f:
        json.dump(collection, f, ensure_ascii=False)

    print(f"✓ Wrote {len(features_out)} features to {OUTPUT}")
    if skipped:
        print(f"  Skipped (not in dataset): {', '.join(skipped)}")


if __name__ == "__main__":
    main()