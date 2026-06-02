import json
d = json.load(open("public/data/catalog.json"))
ci = {c: i for i, c in enumerate(d["columns"])}

# Check flux column
idx = ci["xmm_SC_EP_8_FLUX"]
vals = [r[idx] for r in d["rows"] if r[idx] is not None]
print(f"xmm_SC_EP_8_FLUX: count={len(vals)}, unique={len(set(vals))}")
print("  First 20:", vals[:20])
print(f"  min={min(vals)}, max={max(vals)}")
nonzero = [v for v in vals if v != 0]
print(f"  Non-zero count: {len(nonzero)}")
if nonzero:
    print(f"  Non-zero min={min(nonzero)}, max={max(nonzero)}")

# Check all columns with ALL zeros
print("\n=== Columns where ALL values are zero ===")
for col in d["columns"]:
    idx2 = ci[col]
    numeric = [r[idx2] for r in d["rows"] if r[idx2] is not None and isinstance(r[idx2], (int, float))]
    if numeric and all(v == 0 for v in numeric):
        print(f"  {col}: {len(numeric)} values, ALL ZERO")

# Check columns with negative values (important for log scale)
print("\n=== Columns with negative values ===")
for col in d["columns"]:
    idx2 = ci[col]
    numeric = [r[idx2] for r in d["rows"] if r[idx2] is not None and isinstance(r[idx2], (int, float))]
    if numeric:
        neg = sum(1 for v in numeric if v < 0)
        if neg > 0:
            print(f"  {col}: {neg}/{len(numeric)} negative ({100*neg/len(numeric):.1f}%)")
