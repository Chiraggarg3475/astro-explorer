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

// ============================================================================
// DERIVED COLUMNS — computed from existing data
// ============================================================================
console.log('\nComputing derived columns...');

// Helper: get column index by name
function colIdx(name) { return columns.indexOf(name); }

const iPlx       = colIdx('gaia_Plx');
const iFlux      = colIdx('xmm_SC_EP_8_FLUX');
const iGmag      = colIdx('gaia_Gmag');
const iRPmag     = colIdx('gaia_RPmag');
const iBPmag     = colIdx('gaia_BPmag');

// Physical constants
const PC_TO_CM = 3.0857e18;       // 1 parsec in cm
const FOUR_PI  = 4.0 * Math.PI;
const Weff     = 4052.97;          // Effective bandwidth for G band
const ZP       = 2.5e-9;           // Zero point flux

// Define the 7 new derived columns
const derivedCols = [
  'distance_pc',       // 1/(Plx_mas * 0.001) = 1000/Plx_mas
  'Lx',                // X-ray luminosity
  'gaia_color_GRP',    // G - RP
  'gaia_color_BPRP',   // BP - RP
  'MG',                // Absolute G magnitude
  'G_flux_corr_Gaia',  // Corrected Gaia G-band flux
  'Flux_ratio_xo',     // X-ray to optical flux ratio
];

// Add derived column names to the columns array
derivedCols.forEach(c => columns.push(c));

// Track null counts for derived columns
derivedCols.forEach(c => { nullCounts[c] = 0; });

// Compute derived values for each row
for (const row of rows) {
  const plx   = row[iPlx];
  const flux  = row[iFlux];
  const gmag  = row[iGmag];
  const rpmag = row[iRPmag];
  const bpmag = row[iBPmag];

  // 1. distance_pc = 1000 / Plx (Plx in mas → distance in pc)
  //    Only valid for positive parallax
  let distance_pc = null;
  if (plx !== null && plx > 0) {
    distance_pc = 1000.0 / plx;
  }

  // 2. Lx = Flux × 4π × distance_cm²
  let Lx = null;
  if (distance_pc !== null && flux !== null) {
    const dist_cm = distance_pc * PC_TO_CM;
    Lx = flux * FOUR_PI * dist_cm * dist_cm;
  }

  // 3. gaia_color_GRP = Gmag - RPmag
  let color_GRP = null;
  if (gmag !== null && rpmag !== null) {
    color_GRP = gmag - rpmag;
  }

  // 4. gaia_color_BPRP = BPmag - RPmag
  let color_BPRP = null;
  if (bpmag !== null && rpmag !== null) {
    color_BPRP = bpmag - rpmag;
  }

  // 5. MG = Gmag - 5 × log10(distance_pc / 10)
  let MG = null;
  if (gmag !== null && distance_pc !== null && distance_pc > 0) {
    MG = gmag - 5.0 * Math.log10(distance_pc / 10.0);
  }

  // 6. G_flux_corr_Gaia = 10^(-0.4 × Gmag) × Weff × ZP
  let G_flux = null;
  if (gmag !== null) {
    G_flux = Math.pow(10, -0.4 * gmag) * Weff * ZP;
  }

  // 7. Flux_ratio_xo = xmm_flux / G_flux_corr
  let Fx_Fo = null;
  if (flux !== null && G_flux !== null && G_flux > 0) {
    Fx_Fo = flux / G_flux;
  }

  // Append all derived values to this row
  const derivedValues = [distance_pc, Lx, color_GRP, color_BPRP, MG, G_flux, Fx_Fo];
  for (let i = 0; i < derivedValues.length; i++) {
    const v = derivedValues[i];
    row.push(v);
    if (v === null) nullCounts[derivedCols[i]]++;
  }
}

// Report derived column stats
console.log('Derived column null counts:');
for (const col of derivedCols) {
  const pct = ((nullCounts[col] / totalRows) * 100).toFixed(1);
  console.log(`  ${col}: ${nullCounts[col]}/${totalRows} (${pct}% null)`);
}

// Spot-check derived values for first valid source
const firstValid = rows.find(r => r[colIdx('distance_pc')] !== null);
if (firstValid) {
  console.log('\nSpot-check derived (first valid):');
  derivedCols.forEach(c => {
    console.log(`  ${c}: ${firstValid[colIdx(c)]}`);
  });
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
