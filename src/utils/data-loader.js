/**
 * data-loader.js — Fetch and parse the preprocessed catalog JSON.
 *
 * Returns a CatalogData object with column-access methods and index maps.
 */

/**
 * Load the catalog data from /data/catalog.json.
 * @param {function} onProgress — Callback with 0–100 percentage
 * @returns {Promise<CatalogData>}
 */
export async function loadCatalog(onProgress) {
  onProgress?.(10);

  const base = import.meta.env.BASE_URL || './';
  const response = await fetch(`${base}data/catalog.json`);
  if (!response.ok) throw new Error(`Failed to load catalog: ${response.status}`);

  onProgress?.(30);

  const text = await response.text();
  onProgress?.(60);

  const data = JSON.parse(text);
  onProgress?.(80);

  // Build column index map
  const colIndex = {};
  data.columns.forEach((col, i) => { colIndex[col] = i; });

  onProgress?.(90);

  const catalog = {
    columns: data.columns,
    rows: data.rows,
    meta: data.meta,
    _colIndex: colIndex,

    /**
     * Get all values for a single column as an array.
     */
    getColumn(name) {
      const idx = colIndex[name];
      if (idx === undefined) {
        console.warn(`Column "${name}" not found in dataset.`);
        return [];
      }
      return data.rows.map(row => row[idx]);
    },

    /**
     * Get a single row as a keyed object.
     */
    getRow(index) {
      const row = data.rows[index];
      if (!row) return null;
      const obj = {};
      data.columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    },

    /**
     * Get numeric (non-null, finite) values for a column, with original indices.
     */
    getNumericColumn(name) {
      const idx = colIndex[name];
      if (idx === undefined) return { values: [], indices: [] };
      const values = [];
      const indices = [];
      for (let i = 0; i < data.rows.length; i++) {
        const v = data.rows[i][idx];
        if (v !== null && v !== undefined && typeof v === 'number' && isFinite(v)) {
          values.push(v);
          indices.push(i);
        }
      }
      return { values, indices };
    },

    /**
     * Get column value for a specific row by column name.
     */
    getValue(rowIndex, colName) {
      const ci = colIndex[colName];
      if (ci === undefined) return null;
      return data.rows[rowIndex]?.[ci] ?? null;
    },

    /**
     * Check if a column exists in the dataset.
     */
    hasColumn(name) {
      return colIndex[name] !== undefined;
    },
  };

  onProgress?.(100);
  return catalog;
}
