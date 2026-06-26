#!/usr/bin/env python3
"""
generate_scores_json.py — Converts processed dimension scores into the
static scores.json that the Next.js API reads at runtime.

Output: ~/hoodscore/data/scores.json (array of AreaScore objects)

Reads from data/processed/ (CSVs) or falls back to seed/mock defaults.
Designed to be replaced by the full pipeline once datasets are available.
"""
import json
import os
import sys

import pandas as pd

try:
    from process_base import slugify_area_name
except ImportError:
    import re

    def slugify_area_name(value: str) -> str:
        text = str(value).strip().lower().replace("&", "and")
        text = re.sub(r"[/_]+", "-", text)
        text = re.sub(r"[^a-z0-9-]+", "-", text)
        return re.sub(r"-+", "-", text).strip("-")

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PIPELINE_DIR, "..", "data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
OUTPUT_DIR = os.path.join(PIPELINE_DIR, "..", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "scores.json")
OUTPUT_AREAS_PATH = os.path.join(OUTPUT_DIR, "areas.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Fallback seed data (55 URA Master Plan areas) ──────────────────────
FALLBACK_AREAS = [
    {"id": 1, "slug": "ang-mo-kio", "name": "Ang Mo Kio", "region": "North-East", "population": 152000},
    {"id": 2, "slug": "bedok", "name": "Bedok", "region": "East", "population": 289000},
    {"id": 3, "slug": "bishan", "name": "Bishan", "region": "Central", "population": 92000},
    {"id": 4, "slug": "boon-lay", "name": "Boon Lay", "region": "West", "population": 65000},
    {"id": 5, "slug": "bukit-batok", "name": "Bukit Batok", "region": "West", "population": 140000},
    {"id": 6, "slug": "bukit-merah", "name": "Bukit Merah", "region": "Central", "population": 156000},
    {"id": 7, "slug": "bukit-panjang", "name": "Bukit Panjang", "region": "West", "population": 139000},
    {"id": 8, "slug": "bukit-timah", "name": "Bukit Timah", "region": "Central", "population": 78000},
    {"id": 9, "slug": "central-area", "name": "Central Area", "region": "Central", "population": 45000},
    {"id": 10, "slug": "changi", "name": "Changi", "region": "East", "population": 25000},
    {"id": 11, "slug": "choa-chu-kang", "name": "Choa Chu Kang", "region": "West", "population": 179000},
    {"id": 12, "slug": "clementi", "name": "Clementi", "region": "West", "population": 96000},
    {"id": 13, "slug": "geylang", "name": "Geylang", "region": "Central", "population": 115000},
    {"id": 14, "slug": "hougang", "name": "Hougang", "region": "North-East", "population": 215000},
    {"id": 15, "slug": "jurong-east", "name": "Jurong East", "region": "West", "population": 125000},
    {"id": 16, "slug": "jurong-west", "name": "Jurong West", "region": "West", "population": 262000},
    {"id": 17, "slug": "kallang-whampoa", "name": "Kallang/Whampoa", "region": "Central", "population": 108000},
    {"id": 18, "slug": "lim-chu-kang", "name": "Lim Chu Kang", "region": "North", "population": 2000},
    {"id": 19, "slug": "mandai", "name": "Mandai", "region": "North", "population": 3000},
    {"id": 20, "slug": "marine-parade", "name": "Marine Parade", "region": "East", "population": 46000},
    {"id": 21, "slug": "pasir-ris", "name": "Pasir Ris", "region": "East", "population": 139000},
    {"id": 22, "slug": "punggol", "name": "Punggol", "region": "North-East", "population": 195000},
    {"id": 23, "slug": "queenstown", "name": "Queenstown", "region": "Central", "population": 98000},
    {"id": 24, "slug": "sembawang", "name": "Sembawang", "region": "North", "population": 104000},
    {"id": 25, "slug": "sengkang", "name": "Sengkang", "region": "North-East", "population": 240000},
    {"id": 26, "slug": "serangoon", "name": "Serangoon", "region": "North-East", "population": 96000},
    {"id": 27, "slug": "tampines", "name": "Tampines", "region": "East", "population": 265000},
    {"id": 28, "slug": "toa-payoh", "name": "Toa Payoh", "region": "Central", "population": 121000},
    {"id": 29, "slug": "woodlands", "name": "Woodlands", "region": "North", "population": 255000},
    {"id": 30, "slug": "yishun", "name": "Yishun", "region": "North", "population": 218000},
    {"id": 31, "slug": "novena", "name": "Novena", "region": "Central", "population": 52000},
    {"id": 32, "slug": "tanglin", "name": "Tanglin", "region": "Central", "population": 28000},
    {"id": 33, "slug": "tengah", "name": "Tengah", "region": "West", "population": 10000},
    {"id": 34, "slug": "sungei-kadut", "name": "Sungei Kadut", "region": "North", "population": 1500},
    {"id": 35, "slug": "tuas", "name": "Tuas", "region": "West", "population": 1000},
    {"id": 36, "slug": "western-islands", "name": "Western Islands", "region": "West", "population": 2000},
    {"id": 37, "slug": "western-water-catchment", "name": "Western Water Catchment", "region": "West", "population": 500},
    {"id": 38, "slug": "sim-pang", "name": "Simpang", "region": "North", "population": 2000},
    {"id": 39, "slug": "southern-islands", "name": "Southern Islands", "region": "Central", "population": 1500},
    {"id": 40, "slug": "downtown-core", "name": "Downtown Core", "region": "Central", "population": 8000},
    {"id": 41, "slug": "marina-south", "name": "Marina South", "region": "Central", "population": 1000},
    {"id": 42, "slug": "marina-east", "name": "Marina East", "region": "Central", "population": 500},
    {"id": 43, "slug": "straits-view", "name": "Straits View", "region": "Central", "population": 200},
    {"id": 44, "slug": "singapore-river", "name": "Singapore River", "region": "Central", "population": 6000},
    {"id": 45, "slug": "rochor", "name": "Rochor", "region": "Central", "population": 14000},
    {"id": 46, "slug": "outram", "name": "Outram", "region": "Central", "population": 22000},
    {"id": 47, "slug": "museum", "name": "Museum", "region": "Central", "population": 3500},
    {"id": 48, "slug": "newton", "name": "Newton", "region": "Central", "population": 7000},
    {"id": 49, "slug": "orchard", "name": "Orchard", "region": "Central", "population": 1000},
    {"id": 50, "slug": "river-valley", "name": "River Valley", "region": "Central", "population": 10000},
    {"id": 51, "slug": "changi-bay", "name": "Changi Bay", "region": "East", "population": 100},
    {"id": 52, "slug": "pioneer", "name": "Pioneer", "region": "West", "population": 3000},
    {"id": 53, "slug": "gul", "name": "Gul", "region": "West", "population": 500},
    {"id": 54, "slug": "benoi", "name": "Benoi", "region": "West", "population": 500},
    {"id": 55, "slug": "mandai-wildlife", "name": "Mandai Wildlife", "region": "North", "population": 500},
]

# Fallback seed dimensions per area
FALLBACK_DIMENSIONS = {
    "ang-mo-kio": [
        {"dimension": "transit", "label": "Transit", "score": 88, "rawValue": 42, "unit": "stops & stations within 1km", "description": "Excellent MRT & bus connectivity with two MRT lines"},
        {"dimension": "food", "label": "Food", "score": 92, "rawValue": 18, "unit": "hawker centres within 1km", "description": "Rich hawker culture, famous for Ang Mo Kio 628 Market"},
        {"dimension": "schools", "label": "Schools", "score": 85, "rawValue": 31, "unit": "schools within 2km", "description": "Well-served by primary & secondary schools"},
        {"dimension": "green", "label": "Green Space", "score": 70, "rawValue": 24, "unit": "% green coverage", "description": "Several parks including Ang Mo Kio Town Garden West"},
        {"dimension": "safety", "label": "Safety", "score": 82, "rawValue": 3.2, "unit": "crimes per 10,000 residents", "description": "Below-average crime rate for mature estate"},
        {"dimension": "affordability", "label": "Affordability", "score": 72, "rawValue": 480000, "unit": "median resale price (S$)", "description": "Moderately priced HDB resale flats"},
    ],
    "bedok": [
        {"dimension": "transit", "label": "Transit", "score": 82, "rawValue": 38, "unit": "stops & stations within 1km", "description": "Bedok MRT interchange and extensive bus network"},
        {"dimension": "food", "label": "Food", "score": 95, "rawValue": 22, "unit": "hawker centres within 1km", "description": "Famous for Bedok 85 Fengshan Market and hawker scene"},
        {"dimension": "schools", "label": "Schools", "score": 84, "rawValue": 29, "unit": "schools within 2km", "description": "Good mix of primary & secondary schools"},
        {"dimension": "green", "label": "Green Space", "score": 65, "rawValue": 20, "unit": "% green coverage", "description": "Bedok Reservoir Park is a major attraction"},
        {"dimension": "safety", "label": "Safety", "score": 80, "rawValue": 3.5, "unit": "crimes per 10,000 residents", "description": "Generally safe with typical estate crime rates"},
        {"dimension": "affordability", "label": "Affordability", "score": 75, "rawValue": 450000, "unit": "median resale price (S$)", "description": "Affordable HDB flats in a mature estate"},
    ],
    "bishan": [
        {"dimension": "transit", "label": "Transit", "score": 87, "rawValue": 40, "unit": "stops & stations within 1km", "description": "Bishan MRT interchange (Circle & North-South lines)"},
        {"dimension": "food", "label": "Food", "score": 80, "rawValue": 12, "unit": "hawker centres within 1km", "description": "Good food at Junction 8 and Bishan Street 11 market"},
        {"dimension": "schools", "label": "Schools", "score": 92, "rawValue": 35, "unit": "schools within 2km", "description": "Top schools including Raffles Institution nearby"},
        {"dimension": "green", "label": "Green Space", "score": 78, "rawValue": 28, "unit": "% green coverage", "description": "Bishan-Ang Mo Kio Park is a flagship green space"},
        {"dimension": "safety", "label": "Safety", "score": 88, "rawValue": 2.4, "unit": "crimes per 10,000 residents", "description": "Very low crime rate"},
        {"dimension": "affordability", "label": "Affordability", "score": 58, "rawValue": 580000, "unit": "median resale price (S$)", "description": "Premier location commands premium HDB prices"},
    ],
    "jurong-east": [
        {"dimension": "transit", "label": "Transit", "score": 90, "rawValue": 45, "unit": "stops & stations within 1km", "description": "Jurong East MRT major interchange (NSL, EWL, JRL)"},
        {"dimension": "food", "label": "Food", "score": 84, "rawValue": 14, "unit": "hawker centres within 1km", "description": "Jurong Point & Taman Jurong Market"},
        {"dimension": "schools", "label": "Schools", "score": 80, "rawValue": 26, "unit": "schools within 2km", "description": "Several schools including Jurong Secondary"},
        {"dimension": "green", "label": "Green Space", "score": 64, "rawValue": 20, "unit": "% green coverage", "description": "Jurong Lake Gardens, Chinese Garden"},
        {"dimension": "safety", "label": "Safety", "score": 76, "rawValue": 3.9, "unit": "crimes per 10,000 residents", "description": "Moderate crime rate"},
        {"dimension": "affordability", "label": "Affordability", "score": 76, "rawValue": 440000, "unit": "median resale price (S$)", "description": "Affordable with good future prospects"},
    ],
    "jurong-west": [
        {"dimension": "transit", "label": "Transit", "score": 72, "rawValue": 28, "unit": "stops & stations within 1km", "description": "Pioneer and Boon Lay MRT stations"},
        {"dimension": "food", "label": "Food", "score": 76, "rawValue": 11, "unit": "hawker centres within 1km", "description": "Decent hawker options in HDB blocks"},
        {"dimension": "schools", "label": "Schools", "score": 74, "rawValue": 22, "unit": "schools within 2km", "description": "Near Nanyang Technological University"},
        {"dimension": "green", "label": "Green Space", "score": 58, "rawValue": 16, "unit": "% green coverage", "description": "Limited green space, mostly built-up"},
        {"dimension": "safety", "label": "Safety", "score": 78, "rawValue": 3.6, "unit": "crimes per 10,000 residents", "description": "Moderate safety record"},
        {"dimension": "affordability", "label": "Affordability", "score": 86, "rawValue": 360000, "unit": "median resale price (S$)", "description": "Very affordable, popular with young families"},
    ],
    "central-area": [
        {"dimension": "transit", "label": "Transit", "score": 98, "rawValue": 60, "unit": "stops & stations within 1km", "description": "Ultimate connectivity: City Hall, Raffles Place, multiple lines"},
        {"dimension": "food", "label": "Food", "score": 92, "rawValue": 20, "unit": "hawker centres within 1km", "description": "Lau Pa Sat, Maxwell, Chinatown Complex \u2014 world-class"},
        {"dimension": "schools", "label": "Schools", "score": 60, "rawValue": 15, "unit": "schools within 2km", "description": "Fewer schools in the CBD core"},
        {"dimension": "green", "label": "Green Space", "score": 50, "rawValue": 12, "unit": "% green coverage", "description": "Limited parks but Gardens by the Bay nearby"},
        {"dimension": "safety", "label": "Safety", "score": 75, "rawValue": 4.0, "unit": "crimes per 10,000 residents", "description": "High footfall area with typical city crime"},
        {"dimension": "affordability", "label": "Affordability", "score": 5, "rawValue": 2000000, "unit": "median resale price (S$)", "description": "Extremely expensive, mostly commercial"},
    ],
    "downtown-core": [
        {"dimension": "transit", "label": "Transit", "score": 100, "rawValue": 65, "unit": "stops & stations within 1km", "description": "Ultimate connectivity: Raffles Place, Downtown, Telok Ayer"},
        {"dimension": "food", "label": "Food", "score": 88, "rawValue": 18, "unit": "hawker centres within 1km", "description": "Amoy Street, Telok Ayer, Lau Pa Sat"},
        {"dimension": "schools", "label": "Schools", "score": 40, "rawValue": 6, "unit": "schools within 2km", "description": "Very few schools in CBD"},
        {"dimension": "green", "label": "Green Space", "score": 35, "rawValue": 8, "unit": "% green coverage", "description": "Limited parks but Marina Bay area"},
        {"dimension": "safety", "label": "Safety", "score": 72, "rawValue": 4.5, "unit": "crimes per 10,000 residents", "description": "Business district with typical city crime"},
        {"dimension": "affordability", "label": "Affordability", "score": 5, "rawValue": 2500000, "unit": "median resale price (S$)", "description": "Most expensive area in Singapore"},
    ],
    "tampines": [
        {"dimension": "transit", "label": "Transit", "score": 84, "rawValue": 38, "unit": "stops & stations within 1km", "description": "Tampines MRT interchange (EWL & DTL)"},
        {"dimension": "food", "label": "Food", "score": 86, "rawValue": 14, "unit": "hawker centres within 1km", "description": "Tampines Round Market & Century Square"},
        {"dimension": "schools", "label": "Schools", "score": 84, "rawValue": 28, "unit": "schools within 2km", "description": "Top schools: Temasek Junior College, East Spring"},
        {"dimension": "green", "label": "Green Space", "score": 66, "rawValue": 21, "unit": "% green coverage", "description": "Tampines Eco Green, Sun Plaza Park"},
        {"dimension": "safety", "label": "Safety", "score": 82, "rawValue": 3.2, "unit": "crimes per 10,000 residents", "description": "Safe, well-planned estate"},
        {"dimension": "affordability", "label": "Affordability", "score": 72, "rawValue": 480000, "unit": "median resale price (S$)", "description": "Reasonably priced regional centre"},
    ],
    "woodlands": [
        {"dimension": "transit", "label": "Transit", "score": 80, "rawValue": 34, "unit": "stops & stations within 1km", "description": "Woodlands MRT, bus interchange, JB link"},
        {"dimension": "food", "label": "Food", "score": 78, "rawValue": 11, "unit": "hawker centres within 1km", "description": "Woodlands Market & Causeway Point"},
        {"dimension": "schools", "label": "Schools", "score": 78, "rawValue": 24, "unit": "schools within 2km", "description": "Good schools including Woodlands Ring Primary"},
        {"dimension": "green", "label": "Green Space", "score": 66, "rawValue": 22, "unit": "% green coverage", "description": "Admiralty Park, Woodlands Waterfront"},
        {"dimension": "safety", "label": "Safety", "score": 78, "rawValue": 3.7, "unit": "crimes per 10,000 residents", "description": "Moderate crime rate for large estate"},
        {"dimension": "affordability", "label": "Affordability", "score": 76, "rawValue": 440000, "unit": "median resale price (S$)", "description": "Affordable northern estate"},
    ],
}

# Add remaining areas with default scores (middle-of-range)
DEFAULT_DIMENSIONS = [
    {"dimension": "transit", "label": "Transit", "score": 70, "rawValue": 25, "unit": "stops & stations within 1km", "description": "Average transit connectivity"},
    {"dimension": "food", "label": "Food", "score": 70, "rawValue": 8, "unit": "hawker centres within 1km", "description": "Average food options"},
    {"dimension": "schools", "label": "Schools", "score": 65, "rawValue": 15, "unit": "schools within 2km", "description": "Average school coverage"},
    {"dimension": "green", "label": "Green Space", "score": 60, "rawValue": 20, "unit": "% green coverage", "description": "Average green space coverage"},
    {"dimension": "safety", "label": "Safety", "score": 82, "rawValue": 3.0, "unit": "crimes per 10,000 residents", "description": "Generally safe"},
    {"dimension": "affordability", "label": "Affordability", "score": 75, "rawValue": 450000, "unit": "median resale price (S$)", "description": "Average pricing"},
]


def compute_overall(dimensions, weights=None):
    """Compute weighted overall score (0-100)."""
    if weights is None:
        weights = {}
    total_weight = 0
    weighted_sum = 0
    for d in dimensions:
        w = weights.get(d["dimension"], 1.0)
        weighted_sum += d["score"] * w
        total_weight += w
    if total_weight == 0:
        return 0
    return round(weighted_sum / total_weight, 2)


def generate_from_processed_csvs():
    """Try to read processed CSV scores and build the JSON."""
    if not os.path.isdir(PROCESSED_DIR):
        print("  Processed data directory is missing. Using fallback seed data.")
        return None

    csvs = [f for f in os.listdir(PROCESSED_DIR) if f.endswith(".csv")]
    if not csvs:
        print("  No processed CSV files found. Using fallback seed data.")
        return None

    print(f"  Found {len(csvs)} processed dimensions: {csvs}")
    # Read all dimension scores
    all_scores = {}
    for csv_file in csvs:
        df = pd.read_csv(os.path.join(PROCESSED_DIR, csv_file))
        required = {"planning_area", "dimension", "score"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"{csv_file} is missing required columns: {sorted(missing)}")
        for _, row in df.iterrows():
            area_name = str(row["planning_area"])
            area_slug = slugify_area_name(area_name)
            if area_slug not in all_scores:
                all_scores[area_slug] = []
            all_scores[area_slug].append({
                "dimension": str(row["dimension"]),
                "label": str(row.get("label", row["dimension"])),
                "score": float(row["score"]),
                "rawValue": float(row["raw_value"]) if pd.notna(row.get("raw_value")) else None,
                "unit": str(row.get("unit", "")),
                "description": str(row.get("description", "")),
            })
    return all_scores


def build_area_scores(dimensions_data):
    """Build the full AreaScore array from dimension data."""
    results = []
    required_dimensions = {"transit", "food", "schools", "green", "safety", "affordability"}
    using_processed = dimensions_data is not FALLBACK_DIMENSIONS

    for area in FALLBACK_AREAS:
        slug = area["slug"]
        dims = dimensions_data.get(slug)
        if using_processed:
            if dims is None:
                raise ValueError(f"Missing processed scores for planning area '{slug}'.")
            found_dimensions = {d["dimension"] for d in dims}
            missing_dimensions = required_dimensions - found_dimensions
            if missing_dimensions:
                raise ValueError(
                    f"Planning area '{slug}' is missing dimensions: {sorted(missing_dimensions)}"
                )
        else:
            dims = dims or DEFAULT_DIMENSIONS

        overall = compute_overall(dims)
        results.append({
            "area": area,
            "overall": overall,
            "dimensions": dims,
        })
    return results


def main():
    print("=" * 60)
    print("  Generating scores.json & areas.json")
    print("=" * 60)

    # Try reading from processed CSVs
    dims_from_csv = generate_from_processed_csvs()

    if dims_from_csv:
        print("\n  Building AreaScores from processed data...")
        scores = build_area_scores(dims_from_csv)
    else:
        print("\n  Building AreaScores from fallback seed data...")
        # Find all slugs that have custom data vs defaults
        scores = build_area_scores(FALLBACK_DIMENSIONS)

    # Compute default overall for sorting
    scores.sort(key=lambda s: s["overall"], reverse=True)

    # Write scores.json
    with open(OUTPUT_PATH, "w") as f:
        json.dump(scores, f, indent=2, ensure_ascii=False)
    print(f"  ✅ scores.json: {len(scores)} areas ({os.path.getsize(OUTPUT_PATH):,} bytes)")

    # Write areas.json (without scores, just the planning area metadata)
    areas = [{k: v for k, v in s["area"].items()} for s in scores]
    with open(OUTPUT_AREAS_PATH, "w") as f:
        json.dump(areas, f, indent=2, ensure_ascii=False)
    print(f"  ✅ areas.json: {len(areas)} areas ({os.path.getsize(OUTPUT_AREAS_PATH):,} bytes)")

    # Quick stats
    for s in scores[:5]:
        print(f"    {s['area']['name']:25s}  {s['overall']:5.1f}")
    print("    ...")
    for s in scores[-3:]:
        print(f"    {s['area']['name']:25s}  {s['overall']:5.1f}")

    print(f"\n  ✅ Done! Run `vercel build` or `npm run build` to rebuild the app.")


if __name__ == "__main__":
    sys.exit(main())
