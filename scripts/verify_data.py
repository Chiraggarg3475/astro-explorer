#!/usr/bin/env python3
"""Verify FITS to JSON conversion integrity."""
import json
import sys
import math
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from astropy.table import Table
    import numpy as np
except ImportError:
    print("ERROR: astropy and numpy required. pip install astropy numpy")
    sys.exit(1)

script_dir = os.path.dirname(os.path.abspath(__file__))
fits_path = os.path.join(script_dir, "..", "mine_dataset", "reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.fits")
json_path = os.path.join(script_dir, "..", "public", "data", "catalog.json")

# Read FITS
print("=== FITS File ===")
table = Table.read(fits_path)
print(f"Rows: {len(table)}")
print(f"Columns: {len(table.colnames)}")
print(f"Column names: {table.colnames}")

# Read JSON
print("\n=== JSON File ===")
with open(json_path, "r") as f:
    data = json.load(f)
print(f"Rows: {data['meta']['total_rows']}")
print(f"Columns: {data['meta']['total_columns']}")
print(f"Column names: {data['columns']}")

# Compare
print("\n=== Comparison ===")
fits_cols = set(table.colnames)
json_cols = set(data["columns"])

print(f"FITS rows: {len(table)}, JSON rows: {len(data['rows'])}")
print(f"FITS cols: {len(fits_cols)}, JSON cols: {len(json_cols)}")

if fits_cols == json_cols:
    print("[OK] Column names MATCH perfectly")
else:
    missing_in_json = fits_cols - json_cols
    extra_in_json = json_cols - fits_cols
    if missing_in_json:
        print(f"[FAIL] Missing in JSON: {missing_in_json}")
    if extra_in_json:
        print(f"[FAIL] Extra in JSON: {extra_in_json}")

# Check data integrity: compare first 5 rows, all columns
print("\n=== Data Spot Check (first 5 rows) ===")
errors = 0
col_index = {col: i for i, col in enumerate(data["columns"])}
for row_i in range(min(5, len(table))):
    for col in table.colnames:
        fits_val = table[col][row_i]
        json_idx = col_index.get(col)
        if json_idx is None:
            continue
        json_val = data["rows"][row_i][json_idx]
        
        # Handle masked/null
        is_masked = False
        try:
            is_masked = np.ma.is_masked(fits_val)
        except:
            pass
        if is_masked or (hasattr(fits_val, 'mask') and fits_val.mask):
            if json_val is not None:
                print(f"  Row {row_i}, {col}: FITS=masked, JSON={json_val}")
                errors += 1
            continue
        
        # Handle NaN/Inf
        try:
            fv = float(fits_val)
            if math.isnan(fv) or math.isinf(fv):
                if json_val is not None:
                    print(f"  Row {row_i}, {col}: FITS=NaN/Inf, JSON={json_val}")
                    errors += 1
                continue
        except (TypeError, ValueError):
            pass
        
        # Compare numeric
        if isinstance(json_val, (int, float)) and isinstance(fits_val, (int, float, np.integer, np.floating)):
            fv = float(fits_val)
            jv = float(json_val)
            if abs(fv) > 1e-10:
                rel_err = abs(fv - jv) / abs(fv)
                if rel_err > 1e-5:
                    print(f"  Row {row_i}, {col}: FITS={fv}, JSON={jv}, rel_err={rel_err:.2e}")
                    errors += 1

if errors == 0:
    print("[OK] All spot-checked values match")
else:
    print(f"[FAIL] {errors} mismatches found")

# Check null counts per column
print("\n=== Null/Missing Value Summary ===")
for col in table.colnames[:10]:  # Show first 10
    json_idx = col_index[col]
    json_nulls = sum(1 for row in data["rows"] if row[json_idx] is None)
    
    fits_nulls = 0
    for val in table[col]:
        try:
            if np.ma.is_masked(val):
                fits_nulls += 1
                continue
        except:
            pass
        try:
            fv = float(val)
            if math.isnan(fv) or math.isinf(fv):
                fits_nulls += 1
        except:
            pass
    
    status = "[OK]" if fits_nulls == json_nulls else "[FAIL]"
    print(f"  {status} {col}: FITS nulls={fits_nulls}, JSON nulls={json_nulls}")

# Check column ranges for key columns
print("\n=== Key Column Ranges ===")
key_cols = ['xmm_SC_RA', 'xmm_SC_DEC', 'xmm_SC_EP_8_FLUX', 'gaia_Gmag', 
            'xmm_GAL_LONG_1', 'xmm_GAL_LAT_1', 'xmm_SC_HR1']
for col in key_cols:
    if col not in col_index:
        print(f"  [WARN] {col}: not in JSON")
        continue
    json_idx = col_index[col]
    vals = [row[json_idx] for row in data["rows"] if row[json_idx] is not None and isinstance(row[json_idx], (int, float))]
    if vals:
        print(f"  {col}: min={min(vals):.6g}, max={max(vals):.6g}, count={len(vals)}")
    else:
        print(f"  {col}: no numeric values")

print("\n=== Done ===")
