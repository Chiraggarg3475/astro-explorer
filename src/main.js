/**
 * main.js — AstroML v2 Application Entry Point
 *
 * Architecture:
 *   1. Load catalog data (FITS→JSON)
 *   2. Build custom dropdown selectors with grouped columns
 *   3. Render scatter plot with Plotly WebGL + density coloring
 *   4. Wire all controls (opacity, size, log, theme, presets)
 *   5. Render marginal histograms
 *   6. Data table with "Load more" pagination
 *   7. Source detail panel on click
 *   8. Export (PNG, CSV)
 *   9. Statistics panel
 *  10. Auto log-scale management for negative/zero columns
 */

import Plotly from 'plotly.js-dist-min';
import { loadCatalog } from './utils/data-loader.js';
import {
  getGroups, getColumnsForGroup,
} from './utils/column-groups.js';
import { formatValue, formatCompact, formatRA, formatDec } from './utils/formatters.js';
import { computeStats } from './utils/stats.js';
import { computeDensity, getCopperColorscale } from './utils/density.js';

// ============================================================================
// STATE
// ============================================================================
let catalog = null;
let currentXCol = 'gaia_Gmag';
let currentYCol = 'xmm_EP_8_RATE';  // EP8 Rate has real data (flux columns are all zero)
let selectedRowIndex = null;

// Column metadata cache: which columns are log-safe (all values > 0)
let columnLogSafe = {};

// Table state
let tablePage = 0;
const TABLE_PAGE_SIZE = 50;
let tableData = [];
let tableSortCol = null;
let tableSortAsc = true;
const TABLE_COLUMNS = [
  'xmm_SC_RA', 'xmm_SC_DEC', 'xmm_EP_8_RATE', 'xmm_SC_HR1', 'xmm_SC_HR2',
  'gaia_Gmag', 'gaia_BPmag', 'gaia_RPmag', 'gaia_Plx', 'gaia_Teff',
];

// Presets — scientifically meaningful (avoiding all-zero columns)
const PRESETS = [
  { label: 'G mag vs Rate',     x: 'gaia_Gmag',         y: 'xmm_EP_8_RATE',   logx: false, logy: true },
  { label: 'HR1 vs HR2',        x: 'xmm_SC_HR1',        y: 'xmm_SC_HR2',      logx: false, logy: false },
  { label: 'Gal l vs Gal b',    x: 'xmm_GAL_LONG_1',    y: 'xmm_GAL_LAT_1',   logx: false, logy: false },
  { label: 'Rate vs HR1',       x: 'xmm_EP_8_RATE',     y: 'xmm_SC_HR1',      logx: true,  logy: false },
  { label: 'BP−RP vs G',        x: 'gaia_BPmag',         y: 'gaia_Gmag',       logx: false, logy: false },
  { label: 'PM RA vs PM Dec',   x: 'gaia_pmRA',          y: 'gaia_pmDE',       logx: false, logy: false },
  { label: 'Teff vs log g',     x: 'gaia_Teff',          y: 'gaia_logg',       logx: false, logy: false },
  { label: 'Parallax vs G',     x: 'gaia_Plx',           y: 'gaia_Gmag',       logx: false, logy: false },
];

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Detect system theme
  const saved = localStorage.getItem('astroml-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  try {
    catalog = await loadCatalog((pct) => {
      const bar = document.getElementById('loading-bar');
      if (bar) bar.style.width = pct + '%';
    });

    // Precompute log-safety for all columns
    buildColumnLogSafety();

    // Update badge
    document.getElementById('header-badge').textContent =
      `${catalog.rows.length.toLocaleString()} sources`;
    document.getElementById('footer-sources').textContent =
      `${catalog.rows.length.toLocaleString()} sources`;

    // Hide loading, show app
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
    document.getElementById('app').style.display = '';

    // Init components
    initDropdown('dropdown-x-wrapper', 'dropdown-x', 'dropdown-x-label', currentXCol, (col) => {
      currentXCol = col;
      autoSetLogScale();
      renderPlot();
      updateStats();
    });
    initDropdown('dropdown-y-wrapper', 'dropdown-y', 'dropdown-y-label', currentYCol, (col) => {
      currentYCol = col;
      autoSetLogScale();
      renderPlot();
      updateStats();
    });
    initPresets();
    initControls();
    initThemeToggle();
    initTableToggle();
    initExportButtons();

    // Auto-set log for initial axes
    autoSetLogScale();

    renderPlot();
    renderTable();
    updateStats();

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Failed to initialize AstroML:', err);
    const sub = document.querySelector('.loading-subtitle');
    if (sub) sub.textContent = 'Error loading data. Check console.';
  }
});

// ============================================================================
// LOG SCALE SAFETY
// ============================================================================
/**
 * Precompute which columns can safely use log scale (all finite values > 0).
 */
function buildColumnLogSafety() {
  columnLogSafe = {};
  for (const col of catalog.columns) {
    const { values } = catalog.getNumericColumn(col);
    if (values.length === 0) {
      columnLogSafe[col] = false;
      continue;
    }
    // Log-safe if ALL values are strictly positive
    let safe = true;
    let hasNonZero = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= 0) { safe = false; break; }
      if (values[i] !== 0) hasNonZero = true;
    }
    columnLogSafe[col] = safe && hasNonZero;
  }
}

/**
 * Auto-set log scale toggles based on current columns.
 * If a column has negative/zero values, force log OFF.
 * If a column is strictly positive with wide dynamic range, suggest log ON.
 */
function autoSetLogScale() {
  const logXEl = document.getElementById('toggle-logx');
  const logYEl = document.getElementById('toggle-logy');

  logXEl.checked = columnLogSafe[currentXCol] === true && shouldSuggestLog(currentXCol);
  logYEl.checked = columnLogSafe[currentYCol] === true && shouldSuggestLog(currentYCol);
}

/**
 * Suggest log scale if the dynamic range is > 100x.
 */
function shouldSuggestLog(col) {
  const { values } = catalog.getNumericColumn(col);
  if (values.length < 2) return false;
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (v > 0 && v < min) min = v;
    if (v > max) max = v;
  }
  if (min <= 0 || max <= 0) return false;
  return (max / min) > 100;
}

// ============================================================================
// CUSTOM DROPDOWN
// ============================================================================
function initDropdown(wrapperId, triggerId, labelId, initialValue, onChange) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = document.getElementById(triggerId);
  const labelEl = document.getElementById(labelId);
  let menuEl = null;
  let isOpen = false;
  let currentValue = initialValue;

  // Set initial label
  labelEl.textContent = initialValue;

  function open() {
    if (isOpen) return;
    isOpen = true;
    trigger.classList.add('active');

    // Build menu
    menuEl = document.createElement('div');
    menuEl.className = 'dropdown__menu';

    // Search input
    const search = document.createElement('input');
    search.className = 'dropdown__search';
    search.placeholder = 'Search columns\u2026';
    search.type = 'text';
    menuEl.appendChild(search);

    // Groups
    const groups = getGroups();
    const allItems = [];
    groups.forEach(groupName => {
      const cols = getColumnsForGroup(groupName);
      if (cols.length === 0) return;

      // Only show columns that exist in the dataset
      const validCols = cols.filter(c => catalog.hasColumn(c));
      if (validCols.length === 0) return;

      const header = document.createElement('div');
      header.className = 'dropdown__group-header';
      header.textContent = groupName;
      menuEl.appendChild(header);

      validCols.forEach(col => {
        const item = document.createElement('button');
        const isAllZero = isColumnAllZero(col);
        item.className = 'dropdown__item' + (col === currentValue ? ' selected' : '') + (isAllZero ? ' zero-col' : '');
        item.textContent = col + (isAllZero ? ' (all zero)' : '');
        item.dataset.col = col;
        item.type = 'button';
        if (!isAllZero) {
          item.addEventListener('click', () => {
            currentValue = col;
            labelEl.textContent = col;
            close();
            onChange(col);
          });
        } else {
          item.disabled = true;
          item.style.opacity = '0.35';
          item.style.cursor = 'not-allowed';
        }
        menuEl.appendChild(item);
        allItems.push({ el: item, header, col, label: col.toLowerCase() });
      });
    });

    wrapper.appendChild(menuEl);

    // Focus search
    setTimeout(() => search.focus(), 50);

    // Search filtering
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      const visibleHeaders = new Set();
      allItems.forEach(({ el, header, col, label }) => {
        const match = !q || label.includes(q) || col.toLowerCase().includes(q);
        el.style.display = match ? '' : 'none';
        if (match) visibleHeaders.add(header);
      });
      const headers = menuEl.querySelectorAll('.dropdown__group-header');
      headers.forEach(h => {
        h.style.display = visibleHeaders.has(h) ? '' : 'none';
      });
    });

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    trigger.classList.remove('active');
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
    document.removeEventListener('click', handleOutsideClick);
  }

  function handleOutsideClick(e) {
    if (!wrapper.contains(e.target)) {
      close();
    }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? close() : open();
  });

  // Expose setter
  wrapper._setValue = (col) => {
    currentValue = col;
    labelEl.textContent = col;
  };
}

/**
 * Check if a column has all zero values (useless for plotting).
 */
function isColumnAllZero(col) {
  const { values } = catalog.getNumericColumn(col);
  if (values.length === 0) {
    // Check if the column has ANY non-null values (could be strings)
    const raw = catalog.getColumn(col);
    return !raw.some(v => v !== null && v !== undefined);
  }
  return values.every(v => v === 0);
}

// ============================================================================
// PRESETS
// ============================================================================
function initPresets() {
  const grid = document.getElementById('presets-grid');
  grid.innerHTML = '';
  PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      currentXCol = preset.x;
      currentYCol = preset.y;
      document.getElementById('dropdown-x-wrapper')._setValue(currentXCol);
      document.getElementById('dropdown-y-wrapper')._setValue(currentYCol);
      // Apply preset log settings
      document.getElementById('toggle-logx').checked = preset.logx;
      document.getElementById('toggle-logy').checked = preset.logy;
      updatePresetHighlight();
      renderPlot();
      updateStats();
    });
    grid.appendChild(btn);
  });
  updatePresetHighlight();
}

function updatePresetHighlight() {
  const btns = document.querySelectorAll('.preset-btn');
  btns.forEach((btn, i) => {
    const p = PRESETS[i];
    btn.classList.toggle('active', p.x === currentXCol && p.y === currentYCol);
  });
}

// ============================================================================
// CONTROLS
// ============================================================================
function initControls() {
  const opSlider = document.getElementById('slider-opacity');
  const opVal = document.getElementById('val-opacity');
  opSlider.addEventListener('input', () => {
    opVal.textContent = opSlider.value;
    updatePlotStyle();
  });

  const szSlider = document.getElementById('slider-size');
  const szVal = document.getElementById('val-size');
  szSlider.addEventListener('input', () => {
    szVal.textContent = szSlider.value;
    updatePlotStyle();
  });

  document.getElementById('toggle-logx').addEventListener('change', () => {
    renderPlot();
    updateStats();
  });
  document.getElementById('toggle-logy').addEventListener('change', () => {
    renderPlot();
    updateStats();
  });
  document.getElementById('toggle-density').addEventListener('change', () => {
    renderPlot();
  });

  // Swap axes
  document.getElementById('btn-swap-axes').addEventListener('click', () => {
    const tmp = currentXCol;
    currentXCol = currentYCol;
    currentYCol = tmp;
    document.getElementById('dropdown-x-wrapper')._setValue(currentXCol);
    document.getElementById('dropdown-y-wrapper')._setValue(currentYCol);
    autoSetLogScale();
    updatePresetHighlight();
    renderPlot();
    updateStats();
  });

  // Reset selection button
  document.getElementById('btn-reset-selection').addEventListener('click', () => {
    resetPlotSelection();
  });
}

// ============================================================================
// SCATTER PLOT
// ============================================================================
function getPlotData() {
  const xAll = catalog.getColumn(currentXCol);
  const yAll = catalog.getColumn(currentYCol);
  const logX = document.getElementById('toggle-logx').checked;
  const logY = document.getElementById('toggle-logy').checked;

  const x = [], y = [], indices = [], hoverTexts = [];
  let skippedByLog = 0;

  for (let i = 0; i < xAll.length; i++) {
    const xv = xAll[i], yv = yAll[i];
    if (xv !== null && yv !== null && typeof xv === 'number' && typeof yv === 'number'
        && isFinite(xv) && isFinite(yv)) {
      // Filter out values incompatible with log scale
      if (logX && xv <= 0) { skippedByLog++; continue; }
      if (logY && yv <= 0) { skippedByLog++; continue; }
      x.push(xv);
      y.push(yv);
      indices.push(i);
    }
  }

  // Hover text
  for (let k = 0; k < x.length; k++) {
    const i = indices[k];
    const ra = catalog.getValue(i, 'xmm_SC_RA');
    const dec = catalog.getValue(i, 'xmm_SC_DEC');
    hoverTexts.push(
      `<b>Source #${i}</b><br>` +
      `RA: ${ra !== null ? formatRA(ra) : '\u2014'}<br>` +
      `Dec: ${dec !== null ? formatDec(dec) : '\u2014'}<br>` +
      `${currentXCol}: ${formatValue(currentXCol, x[k])}<br>` +
      `${currentYCol}: ${formatValue(currentYCol, y[k])}`
    );
  }
  return { x, y, indices, hoverTexts, skippedByLog };
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    bgColor:    isDark ? '#0B0D10' : '#FFFFFF',
    gridColor:  isDark ? '#252A33' : '#E2E5E9',
    textColor:  isDark ? '#A0A8B8' : '#5A6270',
    lineColor:  isDark ? '#2E3440' : '#D1D5DB',
    pointColor: isDark ? '#D4A373' : '#B8864E',
    histColor:  isDark ? 'rgba(212,163,115,0.6)' : 'rgba(184,134,78,0.5)',
    hoverBg:    isDark ? '#1C1F26' : '#FFFFFF',
    hoverBorder:isDark ? '#2E3440' : '#D1D5DB',
  };
}

function renderPlot() {
  const { x, y, indices, hoverTexts, skippedByLog } = getPlotData();
  const opacity = parseFloat(document.getElementById('slider-opacity').value);
  const size = parseFloat(document.getElementById('slider-size').value);
  const logX = document.getElementById('toggle-logx').checked;
  const logY = document.getElementById('toggle-logy').checked;
  const useDensity = document.getElementById('toggle-density').checked;
  const colors = getThemeColors();

  // Marker config
  let markerConfig;
  if (useDensity && x.length > 10) {
    const densities = computeDensity(x, y);
    markerConfig = {
      color: Array.from(densities),
      colorscale: getCopperColorscale(),
      opacity: opacity,
      size: size,
      line: { width: 0 },
      showscale: false,
    };
  } else {
    markerConfig = {
      color: colors.pointColor,
      opacity: opacity,
      size: size,
      line: { width: 0 },
    };
  }

  const trace = {
    x, y,
    type: 'scattergl',
    mode: 'markers',
    marker: markerConfig,
    hoverinfo: 'text',
    hovertext: hoverTexts,
    customdata: indices,
  };

  const layout = {
    xaxis: {
      title: { text: currentXCol, font: { size: 12, color: colors.textColor, family: 'Inter, system-ui, sans-serif' }, standoff: 12 },
      type: logX ? 'log' : 'linear',
      gridcolor: colors.gridColor,
      gridwidth: 1,
      griddash: 'dot',
      zerolinecolor: colors.lineColor,
      zerolinewidth: 1,
      tickfont: { size: 11, color: colors.textColor, family: 'Inter, system-ui, sans-serif' },
      linecolor: colors.lineColor,
      linewidth: 1,
      showline: true,
      mirror: false,
    },
    yaxis: {
      title: { text: currentYCol, font: { size: 12, color: colors.textColor, family: 'Inter, system-ui, sans-serif' }, standoff: 12 },
      type: logY ? 'log' : 'linear',
      gridcolor: colors.gridColor,
      gridwidth: 1,
      griddash: 'dot',
      zerolinecolor: colors.lineColor,
      zerolinewidth: 1,
      tickfont: { size: 11, color: colors.textColor, family: 'Inter, system-ui, sans-serif' },
      linecolor: colors.lineColor,
      linewidth: 1,
      showline: true,
      mirror: false,
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: colors.bgColor,
    margin: { l: 62, r: 16, t: 12, b: 52 },
    hovermode: 'closest',
    dragmode: 'zoom',
    font: { family: 'Inter, system-ui, sans-serif', color: colors.textColor },
    hoverlabel: {
      bgcolor: colors.hoverBg,
      bordercolor: colors.hoverBorder,
      font: { family: 'JetBrains Mono, monospace', size: 11, color: colors.textColor },
    },
  };

  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['autoScale2d', 'pan2d', 'select2d', 'lasso2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: `astroml_${currentXCol}_vs_${currentYCol}`,
      scale: 2,
    },
  };

  const plotDiv = document.getElementById('scatter-plot');
  Plotly.react(plotDiv, [trace], layout, config);

  // Click handler -> show source details
  plotDiv.removeAllListeners?.('plotly_click');
  plotDiv.on('plotly_click', (eventData) => {
    if (eventData.points.length > 0) {
      const rowIdx = eventData.points[0].customdata;
      showSourceDetail(rowIdx);
    }
  });

  // Update URL hash
  updateUrlHash();
}

function updatePlotStyle() {
  const opacity = parseFloat(document.getElementById('slider-opacity').value);
  const size = parseFloat(document.getElementById('slider-size').value);
  const useDensity = document.getElementById('toggle-density').checked;

  if (useDensity) {
    renderPlot();
  } else {
    const colors = getThemeColors();
    Plotly.restyle('scatter-plot', {
      'marker.color': colors.pointColor,
      'marker.opacity': opacity,
      'marker.size': size,
    });
  }
}

function resetPlotSelection() {
  const plotDiv = document.getElementById('scatter-plot');
  // Reset any box/lasso selection by re-rendering with same data
  Plotly.update(plotDiv, { selectedpoints: [null] }, {});
  // Also force a complete re-render to clear visual artifacts
  renderPlot();
}


// ============================================================================
// STATISTICS
// ============================================================================
function updateStats() {
  const { x, y, skippedByLog } = getPlotData();

  const totalRows = catalog.rows.length;
  document.getElementById('stat-visible').textContent = x.length.toLocaleString();

  if (x.length > 0) {
    const xStats = computeStats(x);
    const yStats = computeStats(y);
    document.getElementById('stat-xmean').textContent = formatCompact(xStats.mean);
    document.getElementById('stat-xmedian').textContent = formatCompact(xStats.median);
    document.getElementById('stat-xstd').textContent = formatCompact(xStats.stddev);
    document.getElementById('stat-ymean').textContent = formatCompact(yStats.mean);
    document.getElementById('stat-ymedian').textContent = formatCompact(yStats.median);
    document.getElementById('stat-ystd').textContent = formatCompact(yStats.stddev);
  } else {
    ['stat-xmean', 'stat-xmedian', 'stat-xstd', 'stat-ymean', 'stat-ymedian', 'stat-ystd']
      .forEach(id => { document.getElementById(id).textContent = '\u2014'; });
  }

  // Show null count AND log-hidden count
  const nullCount = totalRows - x.length - skippedByLog;
  const nullPct = ((totalRows - x.length) / totalRows * 100).toFixed(1);
  let missingText = `${nullPct}%`;
  if (skippedByLog > 0) {
    missingText += ` (${skippedByLog} log-hidden)`;
  }
  document.getElementById('stat-nullpct').textContent = missingText;
}

// ============================================================================
// SOURCE DETAIL PANEL
// ============================================================================
function showSourceDetail(rowIndex) {
  const row = catalog.getRow(rowIndex);
  if (!row) return;

  selectedRowIndex = rowIndex;
  const panel = document.getElementById('detail-panel');
  const body = document.getElementById('detail-body');

  let html = `<div class="detail-panel__source-id">Source #${rowIndex}</div>`;
  const groups = getGroups();
  groups.forEach(groupName => {
    const cols = getColumnsForGroup(groupName);
    const validCols = cols.filter(c => catalog.hasColumn(c));
    if (validCols.length === 0) return;

    html += `<div class="detail-panel__group-header">${groupName}</div>`;
    validCols.forEach(col => {
      const val = row[col];
      html += `
        <div class="detail-row">
          <span class="detail-row__key">${col}</span>
          <span class="detail-row__val">${formatValue(col, val)}</span>
        </div>`;
    });
  });

  body.innerHTML = html;
  panel.style.display = '';

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btn-close-detail').onclick = () => {
    panel.style.display = 'none';
    selectedRowIndex = null;
  };
}

// ============================================================================
// DATA TABLE
// ============================================================================
function initTableToggle() {
  const header = document.querySelector('.table-section__header');
  const wrapper = document.getElementById('table-wrapper');
  const toggleBtn = document.getElementById('btn-toggle-table');

  header.addEventListener('click', () => {
    const isOpen = wrapper.style.display !== 'none';
    wrapper.style.display = isOpen ? 'none' : '';
    toggleBtn.querySelector('i')?.setAttribute('data-lucide', isOpen ? 'chevron-down' : 'chevron-up');
    if (window.lucide) window.lucide.createIcons();
  });

  document.getElementById('table-search').addEventListener('input', (e) => {
    filterTable(e.target.value.trim());
  });

  document.getElementById('btn-load-more').addEventListener('click', () => {
    tablePage++;
    appendTablePage();
  });
}

function renderTable() {
  // Build header — add # column
  const thead = document.getElementById('table-head');
  thead.innerHTML = '<tr><th data-col="_index" title="Source Index">#</th>' +
    TABLE_COLUMNS.map(col =>
      `<th data-col="${col}" title="${col}">${col}</th>`
    ).join('') + '</tr>';

  // Sort on header click
  thead.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      if (tableSortCol === col) {
        tableSortAsc = !tableSortAsc;
      } else {
        tableSortCol = col;
        tableSortAsc = true;
      }
      thead.querySelectorAll('th').forEach(t => t.classList.remove('sorted'));
      th.classList.add('sorted');
      filterTable(document.getElementById('table-search').value.trim());
    });
  });

  // Initial data
  tableData = catalog.rows.map((row, i) => ({ row, index: i }));
  document.getElementById('table-count-badge').textContent =
    `${tableData.length.toLocaleString()} rows`;
  tablePage = 0;
  renderTableFull();
}

function filterTable(query) {
  const q = query.toLowerCase();
  tableData = catalog.rows
    .map((row, i) => ({ row, index: i }))
    .filter(({ row, index }) => {
      if (!query) return true;
      // Allow search by source number (e.g. "#3476" or "3476")
      const numQuery = query.replace(/^#/, '');
      if (/^\d+$/.test(numQuery)) {
        if (String(index) === numQuery) return true;
        if (String(index).includes(numQuery)) return true;
      }
      return TABLE_COLUMNS.some(col => {
        const idx = catalog._colIndex[col];
        if (idx === undefined) return false;
        const val = row[idx];
        return val !== null && String(val).toLowerCase().includes(q);
      });
    });

  if (tableSortCol) {
    if (tableSortCol === '_index') {
      tableData.sort((a, b) => tableSortAsc ? a.index - b.index : b.index - a.index);
    } else {
      const sortIdx = catalog._colIndex[tableSortCol];
      if (sortIdx !== undefined) {
        tableData.sort((a, b) => {
          const av = a.row[sortIdx], bv = b.row[sortIdx];
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return tableSortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
    }
  }

  document.getElementById('table-count-badge').textContent =
    `${tableData.length.toLocaleString()} rows`;
  tablePage = 0;
  renderTableFull();
}

function renderTableFull() {
  const tbody = document.getElementById('table-body');
  const end = Math.min((tablePage + 1) * TABLE_PAGE_SIZE, tableData.length);
  const pageData = tableData.slice(0, end);

  tbody.innerHTML = pageData.map(({ row, index }) =>
    `<tr data-idx="${index}" class="${index === selectedRowIndex ? 'selected' : ''}">` +
    `<td style="color:var(--text-tertiary)">${index}</td>` +
    TABLE_COLUMNS.map(col => {
      const idx = catalog._colIndex[col];
      const val = idx !== undefined ? row[idx] : null;
      return `<td>${formatValue(col, val)}</td>`;
    }).join('') + '</tr>'
  ).join('');

  // Row click -> show details
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const idx = parseInt(tr.getAttribute('data-idx'), 10);
      showSourceDetail(idx);
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
    });
  });

  // Show/hide load more
  const loadMore = document.getElementById('load-more');
  loadMore.style.display = end >= tableData.length ? 'none' : '';
}

function appendTablePage() {
  renderTableFull();
}

// ============================================================================
// THEME TOGGLE
// ============================================================================
function initThemeToggle() {
  const btn = document.getElementById('btn-theme');
  btn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('astroml-theme', next);

    const icon = btn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', next === 'dark' ? 'moon' : 'sun');
      if (window.lucide) window.lucide.createIcons();
    }

    renderPlot();
  });
}

// ============================================================================
// EXPORT
// ============================================================================
function initExportButtons() {
  document.getElementById('btn-screenshot').addEventListener('click', () => {
    Plotly.downloadImage('scatter-plot', {
      format: 'png',
      width: 1920,
      height: 1080,
      filename: `astroml_${currentXCol}_vs_${currentYCol}`,
      scale: 2,
    });
  });

  document.getElementById('btn-csv-export').addEventListener('click', () => {
    const { x, y, indices } = getPlotData();
    let csv = `index,${currentXCol},${currentYCol}\n`;
    for (let i = 0; i < x.length; i++) {
      csv += `${indices[i]},${x[i]},${y[i]}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astroml_${currentXCol}_vs_${currentYCol}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
}

// ============================================================================
// URL HASH STATE
// ============================================================================
function updateUrlHash() {
  const params = new URLSearchParams();
  params.set('x', currentXCol);
  params.set('y', currentYCol);
  if (document.getElementById('toggle-logx').checked) params.set('logx', '1');
  if (document.getElementById('toggle-logy').checked) params.set('logy', '1');
  history.replaceState(null, '', '#' + params.toString());
}

// Read URL hash on load
(function readUrlHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const params = new URLSearchParams(hash);
  if (params.has('x')) currentXCol = params.get('x');
  if (params.has('y')) currentYCol = params.get('y');
  if (params.has('logx')) {
    const el = document.getElementById('toggle-logx');
    if (el) el.checked = params.get('logx') === '1';
  }
  if (params.has('logy')) {
    const el = document.getElementById('toggle-logy');
    if (el) el.checked = params.get('logy') === '1';
  }
})();
