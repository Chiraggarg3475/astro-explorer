/**
 * density.js — 2D point density estimation for scatter plot coloring
 * 
 * Uses 2D histogram binning with optional Gaussian smoothing.
 * Returns a density value per point that maps to the copper colorscale.
 */

/**
 * Compute density for each point using 2D histogram grid.
 * @param {number[]} x - X coordinates
 * @param {number[]} y - Y coordinates
 * @param {number} gridSize - Number of bins per axis (default 64)
 * @returns {number[]} density values (0-1 normalized) per point
 */
export function computeDensity(x, y, gridSize = 64) {
  const n = x.length;
  if (n === 0) return [];

  // Find bounds
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    if (x[i] < xMin) xMin = x[i];
    if (x[i] > xMax) xMax = x[i];
    if (y[i] < yMin) yMin = y[i];
    if (y[i] > yMax) yMax = y[i];
  }

  // Handle degenerate cases
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xScale = (gridSize - 1) / xRange;
  const yScale = (gridSize - 1) / yRange;

  // Build 2D histogram
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < n; i++) {
    const gx = Math.min(gridSize - 1, Math.floor((x[i] - xMin) * xScale));
    const gy = Math.min(gridSize - 1, Math.floor((y[i] - yMin) * yScale));
    grid[gy * gridSize + gx]++;
  }

  // Simple 3×3 Gaussian-ish smoothing
  const smoothed = new Float32Array(gridSize * gridSize);
  const kernel = [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625];
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      let val = 0;
      let ki = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = gy + dy;
          const nx = gx + dx;
          if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize) {
            val += grid[ny * gridSize + nx] * kernel[ki];
          }
          ki++;
        }
      }
      smoothed[gy * gridSize + gx] = val;
    }
  }

  // Look up density for each point
  const densities = new Float32Array(n);
  let maxDensity = 0;
  for (let i = 0; i < n; i++) {
    const gx = Math.min(gridSize - 1, Math.floor((x[i] - xMin) * xScale));
    const gy = Math.min(gridSize - 1, Math.floor((y[i] - yMin) * yScale));
    densities[i] = smoothed[gy * gridSize + gx];
    if (densities[i] > maxDensity) maxDensity = densities[i];
  }

  // Normalize to [0, 1]
  if (maxDensity > 0) {
    for (let i = 0; i < n; i++) {
      densities[i] /= maxDensity;
    }
  }

  return densities;
}

/**
 * Copper-based colorscale for Plotly (low density → dark, high → bright copper).
 * Returns array of [position, color] pairs.
 */
export function getCopperColorscale() {
  return [
    [0.0,  '#1C1F26'],   // Near-black (sparse)
    [0.15, '#3B2F24'],   // Dark brown
    [0.3,  '#6B4D35'],   // Warm brown
    [0.5,  '#8B6914'],   // Deep copper
    [0.7,  '#D4A373'],   // Copper (accent-primary)
    [0.85, '#E9C496'],   // Light copper
    [1.0,  '#F5DEB3'],   // Warm wheat (densest)
  ];
}
