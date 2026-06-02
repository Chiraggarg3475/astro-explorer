#!/usr/bin/env python3
"""
convert_fits.py — Convert FITS astronomy dataset to browser-friendly JSON.

Usage:
    python convert_fits.py

Input:  ../mine_dataset/reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.fits
Output: ../public/data/catalog.json
        ../public/data/stats.json (per-column statistics)

The output JSON structure:
{
    "columns": ["col1", "col2", ...],
    "rows": [[val1, val2, ...], ...],
    "meta": { "total_rows": N, "total_columns": M }
}
"""

import json
import os
import sys
import math

try:
    from astropy.io import fits
    from astropy.table import Table
    import numpy as np
except ImportError:
    print("ERROR: astropy and numpy are required.")
    print("Install with: pip install astropy numpy")
    sys.exit(1)


def clean_value(val):
    """Convert a single value to a JSON-safe Python type."""
    if hasattr(val, 'mask') or str(type(val)) == "<class 'numpy.ma.core.MaskedConstant'>":
        return None
    try:
        if np.ma.is_masked(val):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(val, (bytes, np.bytes_)):
        return val.decode("utf-8", errors="replace").strip()
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 8)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return round(val, 8)
    return val


def compute_column_stats(values):
    """Compute statistics for a numeric column (list of values, may contain None)."""
    clean = [v for v in values if v is not None and isinstance(v, (int, float))]
    if not clean:
        return {"count": 0, "valid": 0, "min": None, "max": None, "mean": None, "median": None, "stddev": None}

    arr = np.array(clean, dtype=np.float64)
    return {
        "count": len(values),
        "valid": len(clean),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "mean": round(float(np.mean(arr)), 8),
        "median": round(float(np.median(arr)), 8),
        "stddev": round(float(np.std(arr)), 8),
    }


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fits_path = os.path.join(
        script_dir, "..", "mine_dataset",
        "reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.fits"
    )
    output_dir = os.path.join(script_dir, "..", "public", "data")
    catalog_path = os.path.join(output_dir, "catalog.json")
    stats_path = os.path.join(output_dir, "stats.json")

    # Read FITS
    print(f"Reading FITS file: {fits_path}")
    table = Table.read(fits_path)
    print(f"  Rows: {len(table)}, Columns: {len(table.colnames)}")
    print(f"  Columns: {table.colnames}")

    columns = list(table.colnames)

    # Convert rows
    print("Converting to JSON-safe format...")
    rows = []
    for i, row in enumerate(table):
        cleaned_row = [clean_value(row[col]) for col in columns]
        rows.append(cleaned_row)
        if (i + 1) % 2000 == 0:
            print(f"  Processed {i + 1}/{len(table)} rows...")
    print(f"  Processed {len(table)}/{len(table)} rows. Done.")

    # Build output
    output = {
        "columns": columns,
        "rows": rows,
        "meta": {
            "total_rows": len(rows),
            "total_columns": len(columns),
            "source_file": "reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.fits",
        },
    }

    os.makedirs(output_dir, exist_ok=True)

    # Write catalog JSON
    print(f"Writing catalog JSON to: {catalog_path}")
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))
    file_size_mb = os.path.getsize(catalog_path) / (1024 * 1024)
    print(f"  Catalog size: {file_size_mb:.2f} MB")

    # Compute and write stats
    print("Computing per-column statistics...")
    stats = {}
    col_index = {col: i for i, col in enumerate(columns)}
    for col in columns:
        idx = col_index[col]
        values = [row[idx] for row in rows]
        stats[col] = compute_column_stats(values)
    
    print(f"Writing stats JSON to: {stats_path}")
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print("Done!")


if __name__ == "__main__":
    main()
