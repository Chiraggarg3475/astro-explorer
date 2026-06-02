/**
 * audit_data.js — Comprehensive data audit
 *
 * 1. Scan ALL CSV columns for empty/zero/useless data
 * 2. Compare CSV vs generated JSON for correctness
 * 3. Special inspection of gaia_VarFlag
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'mine_dataset', 'reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.csv');
const JSON_PATH = path.join(__dirname, '..', 'public', 'data', 'catalog.json');

// ============================================================================
// PART 1: Full CSV Column Audit
// ============================================================================
console.log('='.repeat(80));
console.log('PART 1: FULL CSV COLUMN AUDIT');
console.log('='.repeat(80));

const csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
const csvLines = csvRaw.split('\n').filter(l => l.trim().length > 0);
const csvHeader = csvLines[0].replace(/\r$/, '').split(',');
const csvRows = [];
for (let i = 1; i < csvLines.length; i++) {
  csvRows.push(csvLines[i].replace(/\r$/, '').split(','));
}

console.log(`CSV: ${csvHeader.length} columns, ${csvRows.length} rows\n`);

// For each column, count: nulls, zeros, unique values, value types
const NULLISH = new Set(['nan', 'NaN', '', 'None', 'null', 'NOT_AVAILABLE', 'N/A', '-32768']);

for (let ci = 0; ci < csvHeader.length; ci++) {
  const colName = csvHeader[ci];
  let nullCount = 0;
  let zeroCount = 0;
  let falseCount = 0;
  const uniqueVals = new Set();
  let numericCount = 0;
  let stringCount = 0;
  const sampleValues = [];

  for (let ri = 0; ri < csvRows.length; ri++) {
    const raw = (csvRows[ri][ci] || '').trim();

    if (NULLISH.has(raw)) {
      nullCount++;
      continue;
    }
    if (raw === 'False') {
      falseCount++;
      continue;
    }
    if (raw === 'True') {
      uniqueVals.add('True');
      continue;
    }

    const num = Number(raw);
    if (!isNaN(num) && raw !== '') {
      numericCount++;
      if (num === 0) zeroCount++;
      uniqueVals.add(raw);
    } else {
      stringCount++;
      uniqueVals.add(raw);
    }

    if (sampleValues.length < 5) sampleValues.push(raw);
  }

  const total = csvRows.length;
  const emptyPct = ((nullCount + falseCount + zeroCount) / total * 100).toFixed(1);
  const nullPct = (nullCount / total * 100).toFixed(1);

  // Flag problematic columns
  let flags = [];
  if (nullCount === total) flags.push('ALL NULL');
  if (zeroCount === total) flags.push('ALL ZERO');
  if (falseCount === total) flags.push('ALL FALSE');
  if (nullCount + zeroCount === total) flags.push('ALL NULL/ZERO');
  if (nullCount + falseCount === total) flags.push('ALL NULL/FALSE');
  if (nullCount + zeroCount + falseCount === total) flags.push('ALL NULL/ZERO/FALSE');
  if (uniqueVals.size <= 1 && nullCount > 0) flags.push('SINGLE VALUE + NULLS');
  if (nullPct > 90) flags.push('90%+ NULL');

  if (flags.length > 0 || nullPct > 50) {
    console.log(`⚠️  ${colName}:`);
    console.log(`    Null: ${nullCount}/${total} (${nullPct}%), Zero: ${zeroCount}, False: ${falseCount}`);
    console.log(`    Unique values: ${uniqueVals.size}, Flags: ${flags.join(', ')}`);
    if (sampleValues.length > 0) console.log(`    Samples: ${sampleValues.slice(0, 5).join(', ')}`);
    console.log();
  }
}

// ============================================================================
// PART 2: gaia_VarFlag Deep Inspection
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('PART 2: gaia_VarFlag DEEP INSPECTION');
console.log('='.repeat(80));

const varFlagIdx = csvHeader.indexOf('gaia_VarFlag');
if (varFlagIdx >= 0) {
  const valueCounts = {};
  for (const row of csvRows) {
    const val = (row[varFlagIdx] || '').trim();
    valueCounts[val] = (valueCounts[val] || 0) + 1;
  }
  console.log('\nCSV gaia_VarFlag value distribution:');
  for (const [val, count] of Object.entries(valueCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${val}": ${count} (${(count / csvRows.length * 100).toFixed(1)}%)`);
  }

  // Show some rows where VarFlag is NOT "NOT_AVAILABLE"
  console.log('\nSample rows where gaia_VarFlag != NOT_AVAILABLE:');
  let shown = 0;
  for (let i = 0; i < csvRows.length && shown < 10; i++) {
    const val = (csvRows[i][varFlagIdx] || '').trim();
    if (val !== 'NOT_AVAILABLE' && val !== '' && val !== 'nan') {
      const ra = csvRows[i][csvHeader.indexOf('xmm_SC_RA')];
      const dec = csvRows[i][csvHeader.indexOf('xmm_SC_DEC')];
      console.log(`  Row ${i}: VarFlag="${val}", RA=${ra}, Dec=${dec}`);
      shown++;
    }
  }
} else {
  console.log('gaia_VarFlag column not found in CSV!');
}

// ============================================================================
// PART 3: JSON Verification — Compare CSV vs JSON
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('PART 3: CSV vs JSON COMPARISON');
console.log('='.repeat(80));

const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log(`\nJSON: ${jsonData.columns.length} columns, ${jsonData.rows.length} rows`);
console.log(`CSV:  ${csvHeader.length} columns, ${csvRows.length} rows`);

// Check which columns are missing from JSON
const jsonColSet = new Set(jsonData.columns);
const missingFromJson = csvHeader.filter(c => !jsonColSet.has(c));
console.log(`\nColumns in CSV but not in JSON (${missingFromJson.length}): ${missingFromJson.join(', ')}`);

// For shared columns, compare values row by row
console.log('\nComparing values for shared columns (sampling rows 0,100,500,1000,5000)...');
const sampleRowIndices = [0, 1, 100, 500, 1000, 2000, 5000, 7000].filter(i => i < csvRows.length);
let mismatches = 0;

const jsonColIndex = {};
jsonData.columns.forEach((c, i) => { jsonColIndex[c] = i; });

for (const colName of jsonData.columns) {
  const csvColIdx = csvHeader.indexOf(colName);
  if (csvColIdx < 0) continue;
  const jsonIdx = jsonColIndex[colName];

  for (const ri of sampleRowIndices) {
    const csvRawVal = (csvRows[ri][csvColIdx] || '').trim();
    const jsonVal = jsonData.rows[ri][jsonIdx];

    // Determine expected JSON value from CSV
    let expectedJson;
    if (NULLISH.has(csvRawVal)) {
      expectedJson = null;
    } else if (csvRawVal === 'False') {
      expectedJson = 0;
    } else if (csvRawVal === 'True') {
      expectedJson = 1;
    } else {
      const num = Number(csvRawVal);
      if (!isNaN(num) && csvRawVal !== '' && isFinite(num)) {
        expectedJson = num;
      } else {
        expectedJson = csvRawVal;
      }
    }

    // Compare
    if (jsonVal === null && expectedJson === null) continue;
    if (typeof jsonVal === 'number' && typeof expectedJson === 'number') {
      if (Math.abs(jsonVal - expectedJson) > 1e-10 * Math.max(1, Math.abs(expectedJson))) {
        console.log(`  MISMATCH row ${ri}, col "${colName}": CSV="${csvRawVal}" → JSON=${jsonVal}, expected=${expectedJson}`);
        mismatches++;
      }
    } else if (jsonVal !== expectedJson) {
      console.log(`  MISMATCH row ${ri}, col "${colName}": CSV="${csvRawVal}" → JSON=${jsonVal}, expected=${expectedJson}`);
      mismatches++;
    }
  }
}

if (mismatches === 0) {
  console.log('  ✅ All sampled values match perfectly!');
} else {
  console.log(`\n  ❌ Found ${mismatches} mismatches!`);
}

// ============================================================================
// PART 4: gaia_VarFlag in JSON specifically
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('PART 4: gaia_VarFlag IN JSON');
console.log('='.repeat(80));

if (jsonColIndex['gaia_VarFlag'] !== undefined) {
  const vfIdx = jsonColIndex['gaia_VarFlag'];
  const jsonVfCounts = {};
  for (const row of jsonData.rows) {
    const val = row[vfIdx];
    const key = val === null ? 'null' : String(val);
    jsonVfCounts[key] = (jsonVfCounts[key] || 0) + 1;
  }
  console.log('\nJSON gaia_VarFlag value distribution:');
  for (const [val, count] of Object.entries(jsonVfCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${val}: ${count} (${(count / jsonData.rows.length * 100).toFixed(1)}%)`);
  }
} else {
  console.log('\ngaia_VarFlag NOT present in JSON!');
}

// ============================================================================
// PART 5: Flux columns check (were all zero in old FITS extraction)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('PART 5: FLUX COLUMNS CHECK (previously all-zero from FITS)');
console.log('='.repeat(80));

const fluxCols = ['xmm_SC_EP_8_FLUX', 'xmm_SC_EP_8_FLUX_ERR', 'xmm_SC_EP_8_FMIN', 'xmm_SC_EP_8_FMIN_ERR', 'xmm_SC_EP_8_FMAX', 'xmm_SC_EP_8_FMAX_ERR'];
for (const col of fluxCols) {
  const idx = jsonColIndex[col];
  if (idx === undefined) { console.log(`  ${col}: NOT IN JSON`); continue; }
  let nulls = 0, zeros = 0, nonzero = 0;
  let min = Infinity, max = -Infinity;
  for (const row of jsonData.rows) {
    const v = row[idx];
    if (v === null) { nulls++; continue; }
    if (v === 0) { zeros++; continue; }
    nonzero++;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  console.log(`  ${col}: nulls=${nulls}, zeros=${zeros}, nonzero=${nonzero}, range=[${min}, ${max}]`);
}

console.log('\n✅ Audit complete!');
