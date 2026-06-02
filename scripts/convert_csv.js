/**
 * convert_csv.js — Convert the CSV dataset to catalog.json
 *
 * Usage: node scripts/convert_csv.js
 *
 * Reads: mine_dataset/reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.csv
 * Writes: public/data/catalog.json
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'mine_dataset', 'reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.csv');
const OUT_PATH = path.join(__dirname, '..', 'public', 'data', 'catalog.json');

// Columns that are known to be entirely zero/NaN/false/empty — skip them
const SKIP_COLUMNS = new Set([
  'xmm_SC_EXTENT',
  'xmm_SC_EXT_ERR',
  'xmm_CONFUSED',
  'xmm_HIGH_BACKGROUND',
]);

// Categorical string columns → numeric encoding for plotting
// Maps: column_name → { string_value → numeric_value }
const CATEGORICAL_ENCODINGS = {
  'gaia_VarFlag': { 'VARIABLE': 1, 'NOT_AVAILABLE': 0 },
};

// Sentinel values that should be treated as null
const NULL_VALUES = new Set(['nan', 'NaN', '', 'None', 'null', 'N/A', '-32768']);

function parseValue(raw, colName) {
  const trimmed = raw.trim();

  // Check categorical encoding first (before null check, since some
  // categorical values like 'NOT_AVAILABLE' have specific numeric meanings)
  if (CATEGORICAL_ENCODINGS[colName]) {
    const encoding = CATEGORICAL_ENCODINGS[colName];
    if (encoding[trimmed] !== undefined) return encoding[trimmed];
  }

  // Check for null/sentinel values
  if (NULL_VALUES.has(trimmed)) return null;

  // Boolean values → treat "False" as 0, "True" as 1
  if (trimmed === 'False') return 0;
  if (trimmed === 'True') return 1;

  // Try parsing as number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    // Check for non-finite values
    if (!isFinite(num)) return null;
    return num;
  }

  // Return as string if nothing else matches
  return trimmed;
}

console.log('Reading CSV...');
const raw = fs.readFileSync(CSV_PATH, 'utf8');
const lines = raw.split('\n').filter(line => line.trim().length > 0);

console.log(`Total lines (including header): ${lines.length}`);

// Parse header
const allColumns = lines[0].replace(/\r$/, '').split(',');
console.log(`Total columns in CSV: ${allColumns.length}`);

// Determine which column indices to keep (skip the known-bad columns)
const keepIndices = [];
const columns = [];
for (let i = 0; i < allColumns.length; i++) {
  if (!SKIP_COLUMNS.has(allColumns[i])) {
    keepIndices.push(i);
    columns.push(allColumns[i]);
  } else {
    console.log(`  Skipping column: ${allColumns[i]}`);
  }
}

console.log(`Keeping ${columns.length} columns, skipping ${allColumns.length - columns.length}`);

// Parse data rows
const rows = [];
let nullCounts = {};
columns.forEach(c => { nullCounts[c] = 0; });

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const parts = line.split(',');
  const row = [];

  for (let k = 0; k < keepIndices.length; k++) {
    const idx = keepIndices[k];
    const colName = columns[k];
    const val = parseValue(parts[idx] || '', colName);
    row.push(val);
    if (val === null) {
      nullCounts[colName]++;
    }
  }

  rows.push(row);
}

console.log(`Parsed ${rows.length} data rows`);

// Report columns with high null counts
console.log('\nNull counts per column:');
const totalRows = rows.length;
for (const col of columns) {
  const pct = ((nullCounts[col] / totalRows) * 100).toFixed(1);
  if (nullCounts[col] > 0) {
    console.log(`  ${col}: ${nullCounts[col]}/${totalRows} (${pct}% null)`);
  }
}

// Spot-check a few values to verify correct extraction
console.log('\nSpot-check first row:');
for (let i = 0; i < Math.min(10, columns.length); i++) {
  console.log(`  ${columns[i]}: ${rows[0][i]}`);
}

// Write output
const output = {
  columns,
  rows,
  meta: {
    source: 'reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.csv',
    totalColumns: columns.length,
    totalRows: rows.length,
    skippedColumns: Array.from(SKIP_COLUMNS),
    convertedAt: new Date().toISOString(),
  },
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output));

const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
console.log(`\nWrote ${OUT_PATH} (${sizeMB} MB)`);
console.log('Done!');
