const fs = require('fs');

const csv = fs.readFileSync('mine_dataset/reduced_xmm_gaiadr3_xmatch_new_poserr_cluster_20.csv', 'utf8').split('\n');
const hdr = csv[0].replace(/\r$/, '').split(',');

const checkCols = ['gaia_AG', 'gaia_Teff', 'gaia_RV', 'gaia_VarFlag', 'gaia_RVS', 'gaia_logg', 'gaia_[Fe/H]'];
const ciMap = {};
checkCols.forEach(c => { ciMap[c] = hdr.indexOf(c); });

// Find sources where gaia_Teff IS populated
console.log('=== Sources WITH Gaia stellar parameters ===');
let populated = [];
for (let i = 1; i < csv.length && populated.length < 5; i++) {
  const row = csv[i].replace(/\r$/, '').split(',');
  const teff = row[ciMap['gaia_Teff']];
  if (teff && teff !== 'nan' && teff !== '') {
    populated.push(i - 1);
  }
}

populated.forEach(idx => {
  const row = csv[idx + 1].replace(/\r$/, '').split(',');
  console.log(`\nCSV Source #${idx}:`);
  checkCols.forEach(c => {
    console.log(`  ${c}: ${row[ciMap[c]]}`);
  });
});

// Now verify the same in JSON
const json = JSON.parse(fs.readFileSync('public/data/catalog.json', 'utf8'));
const jci = {};
json.columns.forEach((c, i) => { jci[c] = i; });

populated.forEach(idx => {
  const row = json.rows[idx];
  console.log(`\nJSON Source #${idx}:`);
  checkCols.forEach(c => {
    const ji = jci[c];
    console.log(`  ${c}: ${ji !== undefined ? row[ji] : 'NOT IN JSON'}`);
  });
});

// Also check source #6846 in JSON
console.log('\n=== Source #6846 (user-reported) ===');
console.log('JSON:');
checkCols.forEach(c => {
  const ji = jci[c];
  console.log(`  ${c}: ${ji !== undefined ? json.rows[6846][ji] : 'NOT IN JSON'}`);
});

// Count how many sources have gaia_Teff populated
const teffIdx = jci['gaia_Teff'];
let teffCount = 0;
json.rows.forEach(r => { if (r[teffIdx] !== null) teffCount++; });
console.log(`\nTotal sources with gaia_Teff: ${teffCount}/${json.rows.length} (${(teffCount/json.rows.length*100).toFixed(1)}%)`);

const agIdx = jci['gaia_AG'];
let agCount = 0;
json.rows.forEach(r => { if (r[agIdx] !== null) agCount++; });
console.log(`Total sources with gaia_AG: ${agCount}/${json.rows.length} (${(agCount/json.rows.length*100).toFixed(1)}%)`);

const rvIdx = jci['gaia_RV'];
let rvCount = 0;
json.rows.forEach(r => { if (r[rvIdx] !== null) rvCount++; });
console.log(`Total sources with gaia_RV: ${rvCount}/${json.rows.length} (${(rvCount/json.rows.length*100).toFixed(1)}%)`);
