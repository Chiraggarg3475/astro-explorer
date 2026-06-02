/**
 * generate_col_stats.js — Generate column statistics for documentation
 */
const fs = require('fs');
const path = require('path');

const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'catalog.json'), 'utf8'));
const ci = {};
json.columns.forEach((c, i) => { ci[c] = i; });

const stats = {};
for (const col of json.columns) {
  const idx = ci[col];
  let nulls = 0, count = 0;
  let min = Infinity, max = -Infinity;
  let isNumeric = true;
  const uniqueVals = new Set();

  for (const row of json.rows) {
    const v = row[idx];
    if (v === null || v === undefined) { nulls++; continue; }
    count++;
    if (typeof v === 'number' && isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    } else {
      isNumeric = false;
    }
    uniqueVals.add(v);
  }

  stats[col] = {
    total: json.rows.length,
    valid: count,
    nulls,
    nullPct: (nulls / json.rows.length * 100).toFixed(1),
    min: isNumeric && count > 0 ? min : null,
    max: isNumeric && count > 0 ? max : null,
    unique: uniqueVals.size,
  };
}

console.log(JSON.stringify(stats, null, 2));
