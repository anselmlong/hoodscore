#!/usr/bin/env python3
"""
process_hdb.py — Affordability dimension processor.

Downloads HDB resale flat prices CSV. Groups by town (maps to planning areas).
Computes median resale price per sqm.
Invert so higher price = lower affordability score.
Returns normalised affordability score.
"""

import os

import pandas as pd

from process_base import (
    DimensionProcessor,
    RAW_DIR,
    PROCESSED_DIR,
    load_planning_areas,
    normalise_scores,
)


class HDBProcessor(DimensionProcessor):
    """Affordability score: median resale price per sqm (inverted)."""

    def __init__(self):
        super().__init__(
            dimension_name="affordability",
            label="Affordability",
            unit="median resale price (S$)",
        )

    def download(self) -> None:
        pass

    def compute(self, planning_areas: pd.DataFrame) -> pd.DataFrame:
        print("  Loading HDB resale data...")
        hdb_path = os.path.join(RAW_DIR, "hdb-resale.csv")
        if not os.path.exists(hdb_path):
            raise FileNotFoundError(
                f"HDB resale data not found at {hdb_path}. Run download_all.py first."
            )

        # Load CSV — try different encodings
        hdb_df = None
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "ISO-8859-1"]:
            try:
                hdb_df = pd.read_csv(hdb_path, encoding=encoding)
                print(f"  Loaded with encoding: {encoding} ({len(hdb_df)} rows, {len(hdb_df.columns)} cols)")
                break
            except (UnicodeDecodeError, pd.errors.EmptyDataError):
                continue

        if hdb_df is None:
            raise ValueError("Could not load HDB resale CSV.")

        print(f"  HDB CSV columns: {list(hdb_df.columns)}")

        # Find town column
        town_col = None
        for col in ["town", "Town", "area", "planning_area"]:
            if col in hdb_df.columns:
                town_col = col
                break

        # Find price column
        price_col = None
        for col in ["resale_price", "price", "Price", "resaleprice", "RESALE_PRICE"]:
            if col in hdb_df.columns:
                price_col = col
                break

        # Find floor area column
        area_col = None
        for col in ["floor_area_sqm", "area_sqm", "floor_area", "sqm",
                     "FLOOR_AREA_SQM", "floor_are_sqm"]:
            if col in hdb_df.columns:
                area_col = col
                break

        if town_col is None:
            raise ValueError(f"Cannot find town column in HDB CSV. Columns: {list(hdb_df.columns)}")

        if price_col is None:
            raise ValueError(f"Cannot find price column in HDB CSV. Columns: {list(hdb_df.columns)}")

        print(f"  Town column: '{town_col}'")
        print(f"  Price column: '{price_col}'")
        print(f"  Area column: '{area_col}'")

        # Clean data
        hdb_df[town_col] = hdb_df[town_col].astype(str).str.strip()
        hdb_df[price_col] = pd.to_numeric(hdb_df[price_col], errors="coerce")

        month_col = None
        for col in ["month", "Month", "transaction_month", "sale_month"]:
            if col in hdb_df.columns:
                month_col = col
                break

        if month_col:
            hdb_df[month_col] = pd.to_datetime(hdb_df[month_col], errors="coerce")
            latest_month = hdb_df[month_col].max()
            if pd.notna(latest_month):
                cutoff = latest_month - pd.DateOffset(months=24)
                before_count = len(hdb_df)
                hdb_df = hdb_df[hdb_df[month_col] >= cutoff].copy()
                print(
                    f"  Filtered to transactions from {cutoff.date()} onward "
                    f"({len(hdb_df)}/{before_count} rows)."
                )

        if area_col:
            hdb_df[area_col] = pd.to_numeric(hdb_df[area_col], errors="coerce")
            # Compute price per sqm
            hdb_df["price_per_sqm"] = hdb_df[price_col] / hdb_df[area_col]
        else:
            # Use price directly if no area column
            hdb_df["price_per_sqm"] = hdb_df[price_col]
            print("  WARNING: No floor area column found. Using raw resale price.")

        # Group by town and compute median price per sqm
        town_prices = (
            hdb_df.groupby(town_col)["price_per_sqm"]
            .median()
            .reset_index()
            .rename(columns={town_col: "town"})
        )

        print(f"  Computed median prices for {len(town_prices)} towns.")

        # Map town names to planning areas
        # Build a mapping from town to planning area name
        planning_names = planning_areas["name"].str.strip().str.lower().unique()
        planning_names_set = set(planning_names)

        town_prices["planning_area"] = town_prices["town"].str.strip()
        # Check if towns directly match planning area names
        town_prices["name_lower"] = town_prices["planning_area"].str.lower()
        matched = town_prices["name_lower"].isin(planning_names_set)
        print(f"  Towns matching planning areas: {matched.sum()}/{len(town_prices)}")

        if not matched.all():
            # Some towns might use different naming conventions, try partial matching
            # Common mappings: "KALLANG/WHAMPOA" → "Kallang", etc.
            print(f"  Unmatched towns: {town_prices[~matched]['town'].tolist()}")

            # Create a fuzzy mapping
            unmatched = town_prices[~matched].copy()
            for _, row in unmatched.iterrows():
                town_clean = row["planning_area"].lower().replace("/", " ").replace("-", " ")
                for pn in planning_names:
                    pn_lower = pn.lower()
                    if town_clean == pn_lower or town_clean in pn_lower or pn_lower in town_clean:
                        town_prices.loc[town_prices["town"] == row["town"], "planning_area"] = pn.title()
                        break

        # Merge with all planning areas
        all_areas = planning_areas[["name"]].drop_duplicates().copy()
        merged = all_areas.merge(
            town_prices[["planning_area", "price_per_sqm"]],
            left_on="name",
            right_on="planning_area",
            how="left",
        )
        # Fill missing areas with median of all
        global_median = town_prices["price_per_sqm"].median()
        merged["price_per_sqm"] = merged["price_per_sqm"].fillna(global_median)
        print(f"  Filled {merged['price_per_sqm'].isna().sum()} missing values with global median: ${global_median:.2f}")

        # Normalise: higher price = lower affordability score (lower_is_better=True)
        raw_values = merged.set_index("name")["price_per_sqm"]
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
    print("Processing Affordability dimension...")
    processor = HDBProcessor()
    areas = load_planning_areas()
    result = processor.compute(areas)
    print(f"  Computed scores for {len(result)} planning areas.")
    print(f"  Mean score: {result['score'].mean():.1f}")
    return result


if __name__ == "__main__":
    main()
