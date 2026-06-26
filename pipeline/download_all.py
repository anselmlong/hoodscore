#!/usr/bin/env python3
"""
download_all.py — Downloads all datasets from data.gov.sg via their API.

Uses the poll-download endpoint pattern:
    https://api-open.data.gov.sg/v1/public/api/datasets/{DATASET_ID}/poll-download

Saves files to ~/hoodscore/data/raw/
"""

import json
import os
import sys
import time
from urllib.parse import urlparse
import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
os.makedirs(DATA_DIR, exist_ok=True)

API_BASE = "https://api-open.data.gov.sg/v1/public/api/datasets"
ALLOWED_DOWNLOAD_HOSTS = {
    "api-open.data.gov.sg",
    "data.gov.sg",
    "s3.ap-southeast-1.amazonaws.com",
    "s3.ap-southeast-1.wasabisys.com",
}
MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024
REQUIRED_PIPELINE_FILES = [
    "ura-mp2025-planning-area.geojson",
    "npc-boundary.geojson",
    "bus-stops.geojson",
    "hdb-resale.csv",
    "schools.csv",
    "mrt-exits.geojson",
    "hawker-centres.geojson",
    "parks-nature-reserves.geojson",
    "crime-by-npc.csv",
]

# Dataset definitions: (dataset_id, filename, description)
DATASETS = [
    ("d_8b84c4ee58e3cfc0ece0d773c8ca6abc", "hdb-resale.csv", "HDB Resale Flat Prices"),
    ("d_3f172c6feb3f4f92a2f47d93eed2908a", "bus-stops.geojson", "LTA Bus Stop Locations"),
    # Skipping MRT Station Exits due to data.gov.sg API constraints
    # Skipping Hawker Centres due to data.gov.sg API constraints  
    # Skipping NParks Parks & Nature Reserves due to data.gov.sg API constraints
    # Skipping Crime by NPC due to data.gov.sg API constraints
    # Skipping NPC Boundary due to data.gov.sg API constraints
    # Skipping URA MP2025 Planning Area Boundary due to data.gov.sg API constraints
]

# School data: collection 457 provides a CSV via a different pattern
# The data.gov.sg collection API may redirect or provide a download URL
SCHOOL_COLLECTION_ID = "457"
SCHOOL_FILENAME = "schools.csv"
SCHOOL_DESCRIPTION = "MOE Schools Directory"


def is_allowed_download_url(url: str) -> bool:
    """Restrict downloader redirects to expected public data hosts."""
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname in ALLOWED_DOWNLOAD_HOSTS


def stream_download(url: str, save_path: str) -> None:
    """Download with a hard byte cap to avoid unexpected large responses."""
    with requests.get(url, timeout=120, stream=True) as response:
        response.raise_for_status()
        total = 0
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise ValueError(f"Download exceeded {MAX_DOWNLOAD_BYTES:,} bytes")
                f.write(chunk)


def check_required_files() -> bool:
    """Report whether every processor input exists locally."""
    missing = [
        filename for filename in REQUIRED_PIPELINE_FILES
        if not os.path.exists(os.path.join(DATA_DIR, filename))
    ]
    if not missing:
        return True

    print("\nMissing required pipeline inputs:")
    for filename in missing:
        print(f"  - {filename}")
    print("Add these files to data/raw before running the full processing pipeline.")
    return False


def download_dataset(dataset_id: str, filename: str, description: str, max_retries: int = 3) -> bool:
    """Download a single dataset via poll-download API.

    Returns True on success, False on failure.
    """
    url = f"{API_BASE}/{dataset_id}/poll-download"
    save_path = os.path.join(DATA_DIR, filename)

    print(f"\\n{'='*60}")
    print(f"Downloading: {description}")
    print(f"  Dataset ID: {dataset_id}")
    print(f"  Saving to:  {save_path}")

    for attempt in range(max_retries):
        try:
            # Step 1: Call poll-download to get the download URL
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            # The response structure varies. Try common patterns.
            download_url = None
            if "data" in data and "url" in data["data"]:
                download_url = data["data"]["url"]
            elif "url" in data:
                download_url = data["url"]
            elif "result" in data and "url" in data["result"]:
                download_url = data["result"]["url"]

            if not download_url:
                # Some datasets return a list of records in the response directly
                print(f"  No download URL in response. Trying direct JSON save...")
                # Save the response as JSON
                if "data" in data and isinstance(data["data"], list):
                    with open(save_path.replace(".csv", ".json").replace(".geojson", ".json"), "w") as f:
                        json.dump(data["data"], f, indent=2)
                    print(f"  Saved JSON response to {save_path}")
                    return True
                print(f"  WARNING: Could not find download URL in response.")
                print(f"  Response keys: {list(data.keys())}")
                return False

            if not is_allowed_download_url(download_url):
                print(f"  Refusing untrusted download URL: {download_url}")
                return False

            print(f"  Download URL: {download_url[:80]}...")

            # Step 2: Download the actual file
            stream_download(download_url, save_path)

            file_size = os.path.getsize(save_path)
            print(f"  ✅ Downloaded: {file_size:,} bytes")
            return True

        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  ⚠️ Attempt {attempt + 1} failed: {e}")
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"  ❌ HTTP Error: {e}")
                return False
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  ⚠️ Attempt {attempt + 1} failed: {e}")
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"  ❌ Unexpected error: {e}")
                return False


def download_schools() -> bool:
    """Download MOE Schools data from collection 457.

    Collection 457 may expose datasets via a different API pattern.
    """
    save_path = os.path.join(DATA_DIR, SCHOOL_FILENAME)
    print(f"\n{'='*60}")
    print(f"Downloading: {SCHOOL_DESCRIPTION}")
    print(f"  Collection ID: {SCHOOL_COLLECTION_ID}")
    print(f"  Saving to:     {save_path}")

    # Try multiple known patterns to fetch collection data
    strategies = [
        f"https://api-open.data.gov.sg/v1/public/api/collections/{SCHOOL_COLLECTION_ID}/datasets",
        f"https://api-open.data.gov.sg/v1/public/api/collections/{SCHOOL_COLLECTION_ID}",
        f"https://data.gov.sg/api/action/datastore_search?resource_id={SCHOOL_COLLECTION_ID}",
    ]

    for strategy_url in strategies:
        try:
            print(f"  Trying: {strategy_url}")
            resp = requests.get(strategy_url, timeout=30)
            if resp.status_code != 200:
                print(f"    Status: {resp.status_code} — skipping")
                continue

            data = resp.json()

            # Try to find a CSV download URL in the response
            def find_csv_url(obj, depth=0):
                if depth > 10:
                    return None
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if isinstance(value, str) and (value.endswith(".csv") or "/download" in value.lower()):
                            return value
                        if key.lower() in ("download_url", "url", "file_url", "resource_url", "csv_url"):
                            if isinstance(value, str) and len(value) > 10:
                                return value
                        result = find_csv_url(value, depth + 1)
                        if result:
                            return result
                elif isinstance(obj, list):
                    for item in obj:
                        result = find_csv_url(item, depth + 1)
                        if result:
                            return result
                return None

            csv_url = find_csv_url(data)
            if csv_url:
                if not is_allowed_download_url(csv_url):
                    print(f"  Refusing untrusted CSV URL: {csv_url}")
                    continue
                print(f"  Found CSV URL: {csv_url[:80]}...")
                stream_download(csv_url, save_path)
                file_size = os.path.getsize(save_path)
                print(f"  ✅ Downloaded: {file_size:,} bytes")
                return True

            # Maybe the response itself is the data in CSV-like format
            # Save as JSON for inspection if we can't figure it out
            debug_path = save_path.replace(".csv", "_debug.json")
            with open(debug_path, "w") as f:
                json.dump(data, f, indent=2, default=str)
            print(f"  Saved debug JSON: {debug_path}")

        except Exception as e:
            print(f"    Error: {e}")
            continue

    print(f"  ❌ Could not download school data via any strategy.")
    print(f"  Please download manually from: https://data.gov.sg/collections/{SCHOOL_COLLECTION_ID}/view")
    return False


def main():
    print("=" * 60)
    print("  Data.gov.sg Dataset Downloader")
    print(f"  Target: {DATA_DIR}")
    print("=" * 60)

    results = {}

    # Download standard datasets via poll-download
    for i, (dataset_id, filename, description) in enumerate(DATASETS):
        success = download_dataset(dataset_id, filename, description)
        results[description] = "✅" if success else "❌"
        
        # Add delay between downloads to avoid rate limits
        if i < len(DATASETS) - 1:  # Don't delay after the last dataset
            time.sleep(5)  # 5 second delay between downloads

    # Download schools (collection-based)
    school_ok = download_schools()
    results[SCHOOL_DESCRIPTION] = "✅" if school_ok else "❌"

    # Summary
    print(f"\n{'='*60}")
    print("  DOWNLOAD SUMMARY")
    print(f"{'='*60}")
    for name, status in results.items():
        print(f"  {status} {name}")

    total_ok = sum(1 for v in results.values() if v == "✅")
    total = len(results)
    print(f"\n  {total_ok}/{total} datasets downloaded successfully.")
    required_ok = check_required_files()

    # List all files
    print(f"\n  Files in {DATA_DIR}:")
    for f in sorted(os.listdir(DATA_DIR)):
        fpath = os.path.join(DATA_DIR, f)
        size = os.path.getsize(fpath)
        print(f"    {f} ({size:,} bytes)")

    return 0 if total_ok == total and required_ok else 1


if __name__ == "__main__":
    sys.exit(main())
