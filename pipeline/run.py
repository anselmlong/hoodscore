#!/usr/bin/env python3
"""
run.py — Orchestrator for the full HoodScore data pipeline.

Single entry point that:
  1. Runs download_all.py to fetch all datasets
  2. Runs each process_*.py to compute dimension scores
  3. Runs seed_db.py to upsert into Vercel Postgres

Usage:
    python run.py              # Full pipeline
    python run.py --skip-download   # Skip download step
    python run.py --skip-seed       # Skip database seeding
    python run.py --dimension transit  # Run only one dimension
"""

import importlib
import os
import subprocess
import sys
import traceback

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))

# Order of processing
PROCESSOR_MODULES = [
    "process_transit",
    "process_food",
    "process_schools",
    "process_green",
    "process_safety",
    "process_hdb",
]


def run_module(module_name: str) -> bool:
    """Run a Python module as a subprocess."""
    print(f"\n{'='*60}")
    print(f"  Running: {module_name}")
    print(f"{'='*60}")

    script_path = os.path.join(PIPELINE_DIR, f"{module_name}.py")
    if not os.path.exists(script_path):
        print(f"  ❌ Script not found: {script_path}")
        return False

    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=False,
        cwd=PIPELINE_DIR,
    )

    if result.returncode != 0:
        print(f"  ❌ {module_name} failed with exit code {result.returncode}")
        return False

    print(f"  ✅ {module_name} completed successfully.")
    return True


def run_imported_module(module_name: str) -> bool:
    """Run a Python module by importing and calling main()."""
    try:
        # Add pipeline dir to path
        if PIPELINE_DIR not in sys.path:
            sys.path.insert(0, PIPELINE_DIR)

        mod = importlib.import_module(module_name)
        if hasattr(mod, "main"):
            print(f"\n{'='*60}")
            print(f"  Running: {module_name}")
            print(f"{'='*60}")
            mod.main()
            print(f"  ✅ {module_name} completed successfully.")
            return True
        else:
            print(f"  ⚠️ {module_name} has no main() function.")
            return False
    except Exception as e:
        print(f"  ❌ {module_name} failed: {e}")
        traceback.print_exc()
        return False


def main():
    # Parse arguments
    args = set(sys.argv[1:])
    skip_download = "--skip-download" in args
    skip_seed = "--skip-seed" in args
    single_dimension = None
    for arg in args:
        if arg.startswith("--dimension="):
            single_dimension = arg.split("=", 1)[1]
        elif arg.startswith("-d="):
            single_dimension = arg.split("=", 1)[1]

    print("=" * 60)
    print("  🏡 HoodScore Data Pipeline")
    print("=" * 60)
    print(f"  Pipeline directory: {PIPELINE_DIR}")
    print(f"  Options: skip_download={skip_download}, skip_seed={skip_seed}, dimension={single_dimension}")
    print()

    # Step 1: Download
    if not skip_download:
        print("=" * 60)
        print("  STEP 1: Download all datasets")
        print("=" * 60)
        if not run_module("download_all"):
            print("\n  ❌ Download step failed. Aborting.")
            return 1
    else:
        print("  ⏭️  Skipping download step.")

    # Step 2: Process dimensions
    if single_dimension:
        modules_to_run = [f"process_{single_dimension}"]
    else:
        modules_to_run = PROCESSOR_MODULES

    for mod_name in modules_to_run:
        if not run_imported_module(mod_name):
            print(f"\n  ❌ Processing failed at {mod_name}. Aborting.")
            return 1

    # Step 3: Seed database
    if not skip_seed and not single_dimension:
        print("=" * 60)
        print("  STEP 3: Seed database")
        print("=" * 60)
        run_module("seed_db")
    elif single_dimension:
        print("  ⏭️  Skipping seed for single-dimension run.")
    else:
        print("  ⏭️  Skipping database seed.")

    print(f"\n{'='*60}")
    print("  ✅ Pipeline complete!")
    print(f"{'='*60}")
    return 0


if __name__ == "__main__":
    sys.exit(main())