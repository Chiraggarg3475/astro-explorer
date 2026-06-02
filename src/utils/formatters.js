/**
 * formatters.js — Scientific number formatting, RA/Dec, value display
 */

import { getColumnMeta } from './column-groups.js';

/**
 * Format a numeric value according to the column's format hint.
 */
export function formatValue(colName, value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  
  const meta = getColumnMeta(colName);
  if (!meta) return typeof value === 'number' ? value.toPrecision(6) : String(value);

  if (meta.format === 'exp') return value.toExponential(3);
  if (meta.format.startsWith('fixed:')) {
    const digits = parseInt(meta.format.split(':')[1], 10);
    return value.toFixed(digits);
  }
  return String(value);
}

/**
 * Format a number compactly (for axis ticks, stats).
 */
export function formatCompact(value) {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 1e6 || abs < 1e-3) return value.toExponential(2);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 1) return value.toPrecision(4);
  return value.toPrecision(3);
}

/**
 * Format RA in degrees to HH:MM:SS.ss
 */
export function formatRA(deg) {
  if (deg === null || deg === undefined) return '—';
  const h = deg / 15;
  const hh = Math.floor(h);
  const m = (h - hh) * 60;
  const mm = Math.floor(m);
  const ss = (m - mm) * 60;
  return `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}m${ss.toFixed(2)}s`;
}

/**
 * Format Dec in degrees to ±DD:MM:SS.s
 */
export function formatDec(deg) {
  if (deg === null || deg === undefined) return '—';
  const sign = deg < 0 ? '−' : '+';
  const abs = Math.abs(deg);
  const dd = Math.floor(abs);
  const m = (abs - dd) * 60;
  const mm = Math.floor(m);
  const ss = (m - mm) * 60;
  return `${sign}${String(dd).padStart(2, '0')}°${String(mm).padStart(2, '0')}′${ss.toFixed(1)}″`;
}
