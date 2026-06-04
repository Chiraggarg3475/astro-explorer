/**
 * column-groups.js — Exact 10 semantic column groupings per spec §3.1
 *
 * Each column has: label, unit, group, format, shortLabel
 * Groups are ordered for dropdown rendering.
 */

const GROUPS = [
  'ML / Classification',
  'XMM Timing & Exposure',
  'XMM Position & Astrometry',
  'XMM Photometry & Flux',
  'XMM Hardness Ratios',
  'XMM Variability & Extent',
  'XMM Flags & Quality',
  'Gaia Astrometry & Proper Motion',
  'Gaia Photometry & Colors',
  'Gaia Stellar Parameters & RV',
  'Derived Properties',
];

const COLUMN_META = {
  // ── Group 1: ML / Classification ──
  'dMEC':         { label: 'dMEC (Cross-Match Distance)', short: 'dMEC', unit: 'arcsec', group: 'ML / Classification', format: 'fixed:3' },
  'chi2Pos':      { label: 'χ² Position', short: 'χ²Pos', unit: '', group: 'ML / Classification', format: 'fixed:3' },
  'proba_xg':     { label: 'Match Probability P(X|G)', short: 'P(X|G)', unit: '', group: 'ML / Classification', format: 'fixed:4' },
  'proba_x_g':    { label: 'Match Probability P(X,G)', short: 'P(X,G)', unit: '', group: 'ML / Classification', format: 'fixed:4' },
  'xmm_No/Nx':    { label: 'No/Nx Ratio', short: 'No/Nx', unit: '', group: 'ML / Classification', format: 'fixed:3' },

  // ── Group 2: XMM Timing & Exposure ──
  'xmm_PN_TEXP_1': { label: 'PN Exposure Time', short: 'PN Exp', unit: 's', group: 'XMM Timing & Exposure', format: 'fixed:0' },
  'xmm_MJD_FIRST': { label: 'MJD First Detection', short: 'MJD First', unit: 'MJD', group: 'XMM Timing & Exposure', format: 'fixed:2' },
  'xmm_MJD_LAST':  { label: 'MJD Last Detection', short: 'MJD Last', unit: 'MJD', group: 'XMM Timing & Exposure', format: 'fixed:2' },

  // ── Group 3: XMM Position & Astrometry ──
  'xmm_SC_RA':      { label: 'XMM RA', short: 'XMM RA', unit: 'deg', group: 'XMM Position & Astrometry', format: 'fixed:6' },
  'xmm_SC_DEC':     { label: 'XMM Dec', short: 'XMM Dec', unit: 'deg', group: 'XMM Position & Astrometry', format: 'fixed:6' },
  'xmm_SC_POSERR':  { label: 'XMM Position Error', short: 'PosErr', unit: 'arcsec', group: 'XMM Position & Astrometry', format: 'fixed:3' },
  'xmm_GAL_LONG_1': { label: 'Galactic Longitude', short: 'Gal. l', unit: 'deg', group: 'XMM Position & Astrometry', format: 'fixed:4' },
  'xmm_GAL_LAT_1':  { label: 'Galactic Latitude', short: 'Gal. b', unit: 'deg', group: 'XMM Position & Astrometry', format: 'fixed:4' },

  // ── Group 4: XMM Photometry & Flux ──
  'xmm_EP_8_RATE':         { label: 'EP Band 8 Rate', short: 'EP8 Rate', unit: 'ct/s', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_EP_8_RATE_ERR':     { label: 'EP Band 8 Rate Error', short: 'EP8 Rate Err', unit: 'ct/s', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_EP_8_CTS':          { label: 'EP Band 8 Counts', short: 'EP8 Cts', unit: 'ct', group: 'XMM Photometry & Flux', format: 'fixed:1' },
  'xmm_EP_8_CTS_ERR':      { label: 'EP Band 8 Counts Error', short: 'EP8 Cts Err', unit: 'ct', group: 'XMM Photometry & Flux', format: 'fixed:1' },
  'xmm_SC_EP_8_FLUX':      { label: 'EP8 Flux', short: 'EP8 Flux', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_SC_EP_8_FLUX_ERR':  { label: 'EP8 Flux Error', short: 'EP8 Flux Err', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_SC_EP_8_FMIN':      { label: 'EP8 Flux Min', short: 'EP8 Fmin', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_SC_EP_8_FMIN_ERR':  { label: 'EP8 Flux Min Error', short: 'EP8 Fmin Err', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_SC_EP_8_FMAX':      { label: 'EP8 Flux Max', short: 'EP8 Fmax', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },
  'xmm_SC_EP_8_FMAX_ERR':  { label: 'EP8 Flux Max Error', short: 'EP8 Fmax Err', unit: 'erg/s/cm²', group: 'XMM Photometry & Flux', format: 'exp' },

  // ── Group 5: XMM Hardness Ratios ──
  'xmm_SC_HR1':     { label: 'Hardness Ratio 1', short: 'HR1', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR1_ERR': { label: 'HR1 Error', short: 'HR1 Err', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR2':     { label: 'Hardness Ratio 2', short: 'HR2', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR2_ERR': { label: 'HR2 Error', short: 'HR2 Err', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR3':     { label: 'Hardness Ratio 3', short: 'HR3', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR3_ERR': { label: 'HR3 Error', short: 'HR3 Err', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR4':     { label: 'Hardness Ratio 4', short: 'HR4', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },
  'xmm_SC_HR4_ERR': { label: 'HR4 Error', short: 'HR4 Err', unit: '', group: 'XMM Hardness Ratios', format: 'fixed:3' },

  // ── Group 6: XMM Variability ──
  'xmm_SC_FVAR':    { label: 'Fractional Variability', short: 'Fvar', unit: '', group: 'XMM Variability & Extent', format: 'fixed:3' },
  'xmm_SC_FVARERR': { label: 'Frac. Variability Error', short: 'Fvar Err', unit: '', group: 'XMM Variability & Extent', format: 'fixed:3' },

  // ── Group 7: XMM Flags & Quality ──
  'xmm_SUM_FLAG':       { label: 'Summary Flag', short: 'Sum Flag', unit: '', group: 'XMM Flags & Quality', format: 'fixed:0' },
  'xmm_SC_SUM_FLAG':    { label: 'SC Summary Flag', short: 'SC Flag', unit: '', group: 'XMM Flags & Quality', format: 'fixed:0' },
  'xmm_SC_DET_ML':      { label: 'Detection Likelihood', short: 'Det ML', unit: '', group: 'XMM Flags & Quality', format: 'fixed:2' },
  'xmm_SC_VAR_FLAG':    { label: 'Variability Flag', short: 'Var Flag', unit: '', group: 'XMM Flags & Quality', format: 'fixed:0' },

  // ── Group 8: Gaia Astrometry & Proper Motion ──
  'gaia_RA_ICRS':   { label: 'Gaia RA', short: 'Gaia RA', unit: 'deg', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:6' },
  'gaia_DE_ICRS':   { label: 'Gaia Dec', short: 'Gaia Dec', unit: 'deg', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:6' },
  'gaia_e_RA_ICRS': { label: 'Gaia RA Error', short: 'RA Err', unit: 'mas', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_e_DE_ICRS': { label: 'Gaia Dec Error', short: 'Dec Err', unit: 'mas', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_pmRA':      { label: 'Proper Motion RA', short: 'PM RA', unit: 'mas/yr', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_e_pmRA':    { label: 'PM RA Error', short: 'PM RA Err', unit: 'mas/yr', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_pmDE':      { label: 'Proper Motion Dec', short: 'PM Dec', unit: 'mas/yr', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_e_pmDE':    { label: 'PM Dec Error', short: 'PM Dec Err', unit: 'mas/yr', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_Plx':       { label: 'Parallax', short: 'Parallax', unit: 'mas', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_e_Plx':     { label: 'Parallax Error', short: 'Plx Err', unit: 'mas', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:3' },
  'gaia_RPlx':      { label: 'Parallax / Error', short: 'Plx/Err', unit: '', group: 'Gaia Astrometry & Proper Motion', format: 'fixed:2' },

  // ── Group 9: Gaia Photometry & Colors ──
  'gaia_Gmag':       { label: 'G mag', short: 'G', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_e_Gmag':     { label: 'G mag Error', short: 'G Err', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:4' },
  'gaia_BPmag':      { label: 'BP mag', short: 'BP', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_e_BPmag':    { label: 'BP mag Error', short: 'BP Err', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:4' },
  'gaia_RPmag':      { label: 'RP mag', short: 'RP', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_e_RPmag':    { label: 'RP mag Error', short: 'RP Err', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:4' },
  'gaia_AG':         { label: 'G-band Extinction', short: 'AG', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_b_AG':       { label: 'AG Lower Bound', short: 'AG lo', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_B_AG':       { label: 'AG Upper Bound', short: 'AG hi', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_E(BP-RP)':   { label: 'E(BP−RP)', short: 'E(BP−RP)', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_b_E(BP-RP)': { label: 'E(BP−RP) Lower', short: 'E lo', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },
  'gaia_B_E(BP-RP)': { label: 'E(BP−RP) Upper', short: 'E hi', unit: 'mag', group: 'Gaia Photometry & Colors', format: 'fixed:3' },

  // ── Group 10: Gaia Stellar Parameters & RV ──
  'gaia_Teff':      { label: 'Effective Temperature', short: 'Teff', unit: 'K', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_b_Teff':    { label: 'Teff Lower Bound', short: 'Teff lo', unit: 'K', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_B_Teff':    { label: 'Teff Upper Bound', short: 'Teff hi', unit: 'K', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_logg':      { label: 'Surface Gravity (log g)', short: 'log g', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_b_logg':    { label: 'log g Lower Bound', short: 'log g lo', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_B_logg':    { label: 'log g Upper Bound', short: 'log g hi', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_[Fe/H]':    { label: 'Metallicity [Fe/H]', short: '[Fe/H]', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_b_[Fe/H]':  { label: '[Fe/H] Lower Bound', short: '[Fe/H] lo', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_B_[Fe/H]':  { label: '[Fe/H] Upper Bound', short: '[Fe/H] hi', unit: 'dex', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },
  'gaia_RV':        { label: 'Radial Velocity', short: 'RV', unit: 'km/s', group: 'Gaia Stellar Parameters & RV', format: 'fixed:2' },
  'gaia_e_RV':      { label: 'RV Error', short: 'RV Err', unit: 'km/s', group: 'Gaia Stellar Parameters & RV', format: 'fixed:2' },
  'gaia_n_RV':      { label: 'RV Transit Count', short: 'n RV', unit: '', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_o_RV':      { label: 'RV Observation Count', short: 'o RV', unit: '', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_RVchi2':    { label: 'RV χ²', short: 'RV χ²', unit: '', group: 'Gaia Stellar Parameters & RV', format: 'fixed:2' },
  'gaia_RVTdur':    { label: 'RV Time Duration', short: 'RV Tdur', unit: 'days', group: 'Gaia Stellar Parameters & RV', format: 'fixed:1' },
  'gaia_RVamp':     { label: 'RV Amplitude', short: 'RV Amp', unit: 'km/s', group: 'Gaia Stellar Parameters & RV', format: 'fixed:2' },
  'gaia_VarFlag':   { label: 'Variability Flag (0=No, 1=Yes)', short: 'VarFlag', unit: '', group: 'Gaia Stellar Parameters & RV', format: 'fixed:0' },
  'gaia_RVS':       { label: 'RVS Magnitude', short: 'RVS', unit: 'mag', group: 'Gaia Stellar Parameters & RV', format: 'fixed:3' },

  // ── Group 11: Derived Properties ──
  'distance_pc':      { label: 'Distance', short: 'Dist', unit: 'pc', group: 'Derived Properties', format: 'fixed:1' },
  'Lx':               { label: 'X-ray Luminosity', short: 'Lx', unit: 'erg/s', group: 'Derived Properties', format: 'exp' },
  'gaia_color_GRP':   { label: 'Color (G − RP)', short: 'G−RP', unit: 'mag', group: 'Derived Properties', format: 'fixed:3' },
  'gaia_color_BPRP':  { label: 'Color (BP − RP)', short: 'BP−RP', unit: 'mag', group: 'Derived Properties', format: 'fixed:3' },
  'MG':               { label: 'Absolute G Magnitude', short: 'MG', unit: 'mag', group: 'Derived Properties', format: 'fixed:2' },
  'G_flux_corr_Gaia': { label: 'Corrected Gaia G Flux', short: 'FG', unit: 'erg/s/cm²', group: 'Derived Properties', format: 'exp' },
  'Flux_ratio_xo':    { label: 'X-ray/Optical Flux Ratio', short: 'Fx/Fo', unit: '', group: 'Derived Properties', format: 'exp' },
};

/**
 * Get the ordered list of group names.
 */
export function getGroups() {
  return GROUPS;
}

/**
 * Get columns belonging to a specific group, in definition order.
 */
export function getColumnsForGroup(groupName) {
  return Object.entries(COLUMN_META)
    .filter(([, meta]) => meta.group === groupName)
    .map(([col]) => col);
}

/**
 * Get all known column names.
 */
export function getAllColumns() {
  return Object.keys(COLUMN_META);
}

/**
 * Get display label for a column (with units).
 */
export function getLabel(colName) {
  const meta = COLUMN_META[colName];
  if (!meta) return colName;
  return meta.unit ? `${meta.label} (${meta.unit})` : meta.label;
}

/**
 * Get short label (no units).
 */
export function getShortLabel(colName) {
  return COLUMN_META[colName]?.short || colName;
}

/**
 * Get column metadata.
 */
export function getColumnMeta(colName) {
  return COLUMN_META[colName] || null;
}

/**
 * Get the group a column belongs to.
 */
export function getColumnGroup(colName) {
  return COLUMN_META[colName]?.group || null;
}

export default COLUMN_META;
