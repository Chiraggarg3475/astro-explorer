/**
 * stats.js — Running statistics for numeric arrays
 * 
 * Efficient single-pass algorithms for count, mean, median, stddev, min, max.
 */

/**
 * Compute descriptive statistics for a numeric array.
 * Skips null/undefined/NaN values.
 * @param {number[]} values
 * @returns {{ count, mean, median, stddev, min, max, q25, q75 }}
 */
export function computeStats(values) {
  const clean = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null && v !== undefined && typeof v === 'number' && isFinite(v)) {
      clean.push(v);
    }
  }

  const count = clean.length;
  if (count === 0) {
    return { count: 0, mean: NaN, median: NaN, stddev: NaN, min: NaN, max: NaN, q25: NaN, q75: NaN };
  }

  // Sort for median/quartiles
  clean.sort((a, b) => a - b);

  const min = clean[0];
  const max = clean[count - 1];

  // Mean
  let sum = 0;
  for (let i = 0; i < count; i++) sum += clean[i];
  const mean = sum / count;

  // Stddev (population)
  let sumSq = 0;
  for (let i = 0; i < count; i++) {
    const d = clean[i] - mean;
    sumSq += d * d;
  }
  const stddev = Math.sqrt(sumSq / count);

  // Median
  const median = count % 2 === 0
    ? (clean[count / 2 - 1] + clean[count / 2]) / 2
    : clean[Math.floor(count / 2)];

  // Quartiles
  const q25 = percentile(clean, 0.25);
  const q75 = percentile(clean, 0.75);

  return { count, mean, median, stddev, min, max, q25, q75 };
}

/**
 * Compute a percentile from a sorted array.
 */
function percentile(sorted, p) {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
