/* content.js - table detection, selection UI, copy */
'use strict';

(() => {
  let enabled = false;
  let currentTable = null;
  let selectedCells = [];
  let isDragging = false;
  let dragStart = null;
  let dragStartCell = null;
  let toolbar = null;
  let toast = null;
  let hoveredTable = null;

  // Selector bars state
  let barContainer = null;

  // --- CellMap cache (項目1) ---
  const cellMapCache = new WeakMap();
  function getCellMap(table) {
    let m = cellMapCache.get(table);
    if (!m) { m = buildCellMap(table); cellMapCache.set(table, m); }
    return m;
  }

  // --- Enabled state ---
  chrome.storage.local.get('enabled', data => { enabled = !!data.enabled; });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      const wasEnabled = enabled;
      enabled = changes.enabled.newValue;
      if (!enabled) disableUI();
      if (!wasEnabled && enabled) showHint();
    }
  });

  function disableUI() {
    clearSelection();
    currentTable = null;
    if (hoveredTable) { hoveredTable.classList.remove('copytables-table-hover'); hoveredTable = null; }
    removeBars();
    document.querySelectorAll('.copytables-cell-hover').forEach(c => c.classList.remove('copytables-cell-hover'));
  }

  // --- Hint (first-time only) ---
  function showHint() {
    chrome.storage.local.get('hintShown', data => {
      if (data.hintShown) return;
      chrome.storage.local.set({ hintShown: true });
      const hint = document.createElement('div');
      hint.className = 'copytables-hint';
      hint.textContent = 'TableHandles ON \u2014 hover a table, then click the row/column handles (or drag cells) to select. Esc clears.';
      document.body.appendChild(hint);
      setTimeout(() => { hint.remove(); }, 4000);
    });
  }

  // --- Utilities ---
  function buildCellMap(table) {
    const rows = table.rows;
    const map = new Map();
    const filled = [];
    for (let r = 0; r < rows.length; r++) {
      if (!filled[r]) filled[r] = [];
      let cIdx = 0;
      for (let c = 0; c < rows[r].cells.length; c++) {
        while (filled[r][cIdx]) cIdx++;
        const cell = rows[r].cells[c];
        const rs = cell.rowSpan || 1;
        const cs = cell.colSpan || 1;
        if (!map.has(cell)) {
          map.set(cell, { row: r, col: cIdx, rowSpan: rs, colSpan: cs });
        }
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            const rr = r + dr, cc = cIdx + dc;
            if (!filled[rr]) filled[rr] = [];
            filled[rr][cc] = true;
          }
        }
        cIdx += cs;
      }
    }
    return map;
  }

  function getGridDimensions(table) {
    const map = getCellMap(table);
    let maxRow = 0, maxCol = 0;
    for (const pos of map.values()) {
      const r = pos.row + pos.rowSpan - 1;
      const c = pos.col + pos.colSpan - 1;
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
    return { rows: maxRow + 1, cols: maxCol + 1 };
  }

  function getCellCoords(cell, table) {
    const map = getCellMap(table);
    const entry = map.get(cell);
    return entry ? { row: entry.row, col: entry.col } : null;
  }

  function getInnermostTable(el) {
    return el.closest('td, th')?.closest('table') || el.closest('table');
  }

  // Find a td/th under a screen coordinate, even when an overlay sits on top.
  function cellFromEvent(e) {
    let cell = e.target.closest && e.target.closest('td, th');
    if (cell) return cell;
    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    for (const el of stack) {
      const c = el.closest && el.closest('td, th');
      if (c) return c;
    }
    return null;
  }

  // Nearest ancestor that actually scrolls. Returns null when the page
  // window is the right scroll target.
  function getScrollAncestor(el) {
    let node = el && el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const oy = cs.overflowY, ox = cs.overflowX;
      const scrollableY = (oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight;
      const scrollableX = (ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth;
      if (scrollableY || scrollableX) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Walk ancestors to find the first non-transparent background color
  // and decide whether the surrounding UI is dark.
  function isDarkContext(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg && bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
      if (m) {
        const a = m[4] === undefined ? 1 : parseFloat(m[4]);
        if (a > 0.05) {
          const r = +m[1], g = +m[2], b = +m[3];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          return lum < 0.5;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function buildGrid(table) {
    const rows = table.rows;
    const grid = [];
    const filled = [];
    for (let r = 0; r < rows.length; r++) {
      if (!grid[r]) grid[r] = [];
      if (!filled[r]) filled[r] = [];
      let cIdx = 0;
      for (let c = 0; c < rows[r].cells.length; c++) {
        while (filled[r][cIdx]) cIdx++;
        const cell = rows[r].cells[c];
        const rs = cell.rowSpan || 1;
        const cs = cell.colSpan || 1;
        const text = TableFormatter.normalize(cell.textContent);
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            const rr = r + dr, cc = cIdx + dc;
            if (!grid[rr]) grid[rr] = [];
            if (!filled[rr]) filled[rr] = [];
            grid[rr][cc] = text;
            filled[rr][cc] = true;
          }
        }
        cIdx += cs;
      }
    }
    return grid;
  }

  function getGridForSelection(table, cells) {
    const fullGrid = buildGrid(table);
    if (cells.length === 0) return fullGrid;
    const map = getCellMap(table);
    const rowSet = new Set();
    const colSet = new Set();
    for (const cell of cells) {
      const pos = map.get(cell);
      if (!pos) continue;
      for (let dr = 0; dr < pos.rowSpan; dr++) rowSet.add(pos.row + dr);
      for (let dc = 0; dc < pos.colSpan; dc++) colSet.add(pos.col + dc);
    }
    if (rowSet.size === 0) return fullGrid;
    const rowArr = [...rowSet].sort((a, b) => a - b);
    const colArr = [...colSet].sort((a, b) => a - b);
    const sub = [];
    for (const r of rowArr) {
      const row = [];
      for (const c of colArr) {
        row.push((fullGrid[r] && fullGrid[r][c]) || '');
      }
      sub.push(row);
    }
    return sub;
  }

  // --- Selection management ---
  function clearSelection() {
    selectedCells.forEach(c => c.classList.remove('copytables-selected'));
    selectedCells = [];
    removeToolbar();
    updateBarHighlights();
  }

  function selectCells(cells, additive) {
    if (!additive) {
      clearSelection();
      cells.forEach(c => {
        c.classList.add('copytables-selected');
        selectedCells.push(c);
      });
    } else {
      const allSelected = cells.every(c => selectedCells.includes(c));
      if (allSelected) {
        cells.forEach(c => {
          c.classList.remove('copytables-selected');
          selectedCells = selectedCells.filter(s => s !== c);
        });
      } else {
        cells.forEach(c => {
          if (!selectedCells.includes(c)) {
            c.classList.add('copytables-selected');
            selectedCells.push(c);
          }
        });
      }
    }
    if (selectedCells.length > 0) showToolbar();
    else removeToolbar();
    updateBarHighlights();
  }

  function selectRange(table, r1, c1, r2, c2) {
    const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    const map = getCellMap(table);
    const cells = [];
    for (const [cell, pos] of map) {
      const cr2 = pos.row + pos.rowSpan - 1, cc2 = pos.col + pos.colSpan - 1;
      if (cr2 >= minR && pos.row <= maxR && cc2 >= minC && pos.col <= maxC) {
        cells.push(cell);
      }
    }
    selectCells(cells, false);
  }

  function selectRow(table, rowIdx, additive) {
    const map = getCellMap(table);
    const cells = [];
    for (const [cell, pos] of map) {
      if (rowIdx >= pos.row && rowIdx < pos.row + pos.rowSpan) cells.push(cell);
    }
    selectCells(cells, additive);
  }

  function selectCol(table, colIdx, additive) {
    const map = getCellMap(table);
    const cells = [];
    for (const [cell, pos] of map) {
      if (colIdx >= pos.col && colIdx < pos.col + pos.colSpan) cells.push(cell);
    }
    selectCells(cells, additive);
  }

  function selectAll(table) {
    const cells = [];
    for (const row of table.rows) {
      for (const cell of row.cells) cells.push(cell);
    }
    selectCells(cells, false);
  }

  // --- Selector Bars ---
  function createBars(table) {
    removeBars();
    const dim = getGridDimensions(table);
    const map = getCellMap(table);
    const tableRect = table.getBoundingClientRect();
    const sx = window.scrollX, sy = window.scrollY;

    barContainer = document.createElement('div');
    barContainer.className = 'copytables-bars';
    if (isDarkContext(table)) barContainer.classList.add('copytables-dark');

    // Build arrays of representative cells per column and per row
    const colCells = new Array(dim.cols).fill(null);
    const rowCells = new Array(dim.rows).fill(null);
    for (const [cell, pos] of map) {
      for (let dc = 0; dc < pos.colSpan; dc++) {
        const ci = pos.col + dc;
        if (!colCells[ci]) colCells[ci] = cell;
      }
      for (let dr = 0; dr < pos.rowSpan; dr++) {
        const ri = pos.row + dr;
        if (!rowCells[ri]) rowCells[ri] = cell;
      }
    }

    const BAR_SIZE = 18;

    // Compute extents from actual cell geometry so backing bars exactly
    // span the area where bars are drawn (handles thead+tbody, sticky rows, etc.)
    let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity, maxBottom = -Infinity;
    for (const cell of colCells) {
      if (!cell) continue;
      const r = cell.getBoundingClientRect();
      if (r.left < minLeft) minLeft = r.left;
      if (r.right > maxRight) maxRight = r.right;
    }
    for (const cell of rowCells) {
      if (!cell) continue;
      const r = cell.getBoundingClientRect();
      if (r.top < minTop) minTop = r.top;
      if (r.bottom > maxBottom) maxBottom = r.bottom;
    }
    if (!Number.isFinite(minLeft)) { minLeft = tableRect.left; maxRight = tableRect.right; }
    if (!Number.isFinite(minTop)) { minTop = tableRect.top; maxBottom = tableRect.bottom; }

    // Some tables (e.g. Wikipedia wikitables) put a wide gutter on the left
    // of the <table> bounding box (caption padding, sortable controls, etc.).
    // For the row gutter / corner button we want to sit outside that whole
    // chrome — anchor those to whichever is further out. Top/bottom stays
    // at the first/last cell so column handles do not cover the caption.
    const outerLeft = Math.min(tableRect.left, minLeft);
    const outerRight = Math.max(tableRect.right, maxRight);
    const outerTop = minTop;
    const outerBottom = maxBottom;

    // Backing bars (continuous, no gaps) — purely visual, no click handlers
    const colBack = document.createElement('div');
    colBack.className = 'copytables-bar-back copytables-col-back';
    colBack.style.left = (sx + outerLeft) + 'px';
    colBack.style.top = (sy + outerTop - BAR_SIZE) + 'px';
    colBack.style.width = (outerRight - outerLeft) + 'px';
    colBack.style.height = BAR_SIZE + 'px';
    barContainer.appendChild(colBack);

    const rowBack = document.createElement('div');
    rowBack.className = 'copytables-bar-back copytables-row-back';
    rowBack.style.left = (sx + outerLeft - BAR_SIZE) + 'px';
    rowBack.style.top = (sy + outerTop) + 'px';
    rowBack.style.width = BAR_SIZE + 'px';
    rowBack.style.height = (outerBottom - outerTop) + 'px';
    barContainer.appendChild(rowBack);

    // Column bars (along top edge) — transparent click targets, color when active
    const colBars = [];
    for (let ci = 0; ci < dim.cols; ci++) {
      const cell = colCells[ci];
      if (!cell) continue;
      const cr = cell.getBoundingClientRect();
      const pos = map.get(cell);
      const colWidth = cr.width / (pos.colSpan || 1);
      const offsetInCell = ci - pos.col;
      const bar = document.createElement('div');
      bar.className = 'copytables-col-bar';
      bar.dataset.col = ci;
      bar.title = `Select column ${ci + 1}`;
      bar.setAttribute('aria-label', `Select column ${ci + 1}`);
      const left = sx + cr.left + offsetInCell * colWidth;
      bar.style.left = left + 'px';
      bar.style.top = (sy + outerTop - BAR_SIZE) + 'px';
      bar.style.width = colWidth + 'px';
      bar.style.height = BAR_SIZE + 'px';
      bar.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
      bar.addEventListener('click', e => {
        e.stopPropagation();
        currentTable = table;
        selectCol(table, ci, true);
      });
      barContainer.appendChild(bar);
      colBars.push({ bar, left, width: colWidth });
    }
    // Stretch each bar so its right edge meets the next bar's left edge
    // (and the last one reaches the table's right edge). border-spacing or
    // sub-pixel rounding otherwise leaves hairline gaps between active bars.
    for (let i = 0; i < colBars.length; i++) {
      const next = colBars[i + 1] ? colBars[i + 1].left : (sx + outerRight);
      const w = next - colBars[i].left;
      if (w > 0) colBars[i].bar.style.width = w + 'px';
    }

    // Row bars (along left edge) — transparent click targets, color when active
    const rowBars = [];
    for (let ri = 0; ri < dim.rows; ri++) {
      const cell = rowCells[ri];
      if (!cell) continue;
      const cr = cell.getBoundingClientRect();
      const pos = map.get(cell);
      const rowHeight = cr.height / (pos.rowSpan || 1);
      const offsetInCell = ri - pos.row;
      const bar = document.createElement('div');
      bar.className = 'copytables-row-bar';
      bar.dataset.row = ri;
      bar.title = `Select row ${ri + 1}`;
      bar.setAttribute('aria-label', `Select row ${ri + 1}`);
      const top = sy + cr.top + offsetInCell * rowHeight;
      bar.style.left = (sx + outerLeft - BAR_SIZE) + 'px';
      bar.style.top = top + 'px';
      bar.style.width = BAR_SIZE + 'px';
      bar.style.height = rowHeight + 'px';
      bar.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
      bar.addEventListener('click', e => {
        e.stopPropagation();
        currentTable = table;
        selectRow(table, ri, true);
      });
      barContainer.appendChild(bar);
      rowBars.push({ bar, top, height: rowHeight });
    }
    for (let i = 0; i < rowBars.length; i++) {
      const next = rowBars[i + 1] ? rowBars[i + 1].top : (sy + outerBottom);
      const h = next - rowBars[i].top;
      if (h > 0) rowBars[i].bar.style.height = h + 'px';
    }

    // Corner button (select all)
    const corner = document.createElement('div');
    corner.className = 'copytables-corner-btn';
    corner.title = 'Select / deselect entire table';
    corner.setAttribute('aria-label', 'Select / deselect entire table');
    corner.textContent = '\u229E';
    corner.style.left = (sx + outerLeft - BAR_SIZE) + 'px';
    corner.style.top = (sy + outerTop - BAR_SIZE) + 'px';
    corner.style.width = BAR_SIZE + 'px';
    corner.style.height = BAR_SIZE + 'px';
    corner.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
    corner.addEventListener('click', e => {
      e.stopPropagation();
      const all = [];
      for (const row of table.rows) for (const cell of row.cells) all.push(cell);
      const isAll = currentTable === table && selectedCells.length === all.length && all.every(c => selectedCells.includes(c));
      if (isAll) { clearSelection(); currentTable = null; }
      else { currentTable = table; selectAll(table); }
    });
    barContainer.appendChild(corner);

    // Capture-all button (just left of the corner, above the row gutter)
    if (getScrollAncestor(table)) {
      const capture = document.createElement('div');
      capture.className = 'copytables-capture-btn';
      capture.title = 'Capture all rows (scroll the table to collect virtual rows)';
      capture.setAttribute('aria-label', 'Capture all rows');
      capture.textContent = '\u21A1'; // \u21A1
      capture.style.left = (sx + outerLeft - BAR_SIZE) + 'px';
      capture.style.top = (sy + outerTop - BAR_SIZE * 2 - 2) + 'px';
      capture.style.width = BAR_SIZE + 'px';
      capture.style.height = BAR_SIZE + 'px';
      capture.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
      capture.addEventListener('click', e => {
        e.stopPropagation();
        captureAllRows(table);
      });
      barContainer.appendChild(capture);
    }

    document.body.appendChild(barContainer);
    // 項目6: 別テーブルのバー作成時に誤ハイライトしない
    if (currentTable === table) updateBarHighlights();
  }

  function removeBars() {
    if (barContainer) { barContainer.remove(); barContainer = null; }
  }

  function repositionBars() {
    if (!hoveredTable || !barContainer) return;
    createBars(hoveredTable);
  }

  let scrollRafId = null;
  function scheduleReposition() {
    if (scrollRafId) return;
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null;
      if (enabled && hoveredTable) repositionBars();
    });
  }

  // --- Auto-scroll while dragging selection ---
  const autoScroll = { rafId: null, container: null, x: 0, y: 0 };
  const AUTO_EDGE = 32;     // pixels from the edge that triggers auto-scroll
  const AUTO_MAX_SPEED = 28; // max px/frame

  function startAutoScroll() {
    if (autoScroll.rafId) return;
    const tick = () => {
      autoScroll.rafId = null;
      if (!isDragging) return;
      const c = autoScroll.container;
      let rect, scrollFn;
      if (c) {
        rect = c.getBoundingClientRect();
        scrollFn = (dx, dy) => c.scrollBy(dx, dy);
      } else {
        rect = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
        scrollFn = (dx, dy) => window.scrollBy(dx, dy);
      }
      const x = autoScroll.x, y = autoScroll.y;
      let dx = 0, dy = 0;
      if (y < rect.top + AUTO_EDGE) dy = -Math.min(AUTO_MAX_SPEED, (rect.top + AUTO_EDGE) - y);
      else if (y > rect.bottom - AUTO_EDGE) dy = Math.min(AUTO_MAX_SPEED, y - (rect.bottom - AUTO_EDGE));
      if (x < rect.left + AUTO_EDGE) dx = -Math.min(AUTO_MAX_SPEED, (rect.left + AUTO_EDGE) - x);
      else if (x > rect.right - AUTO_EDGE) dx = Math.min(AUTO_MAX_SPEED, x - (rect.right - AUTO_EDGE));
      if (dx === 0 && dy === 0) return;
      scrollFn(dx, dy);
      // Update selection to follow the pointer over its new on-screen target
      extendSelectionToPoint(x, y);
      autoScroll.rafId = requestAnimationFrame(tick);
    };
    autoScroll.rafId = requestAnimationFrame(tick);
  }

  function stopAutoScroll() {
    if (autoScroll.rafId) cancelAnimationFrame(autoScroll.rafId);
    autoScroll.rafId = null;
    autoScroll.container = null;
  }

  function extendSelectionToPoint(x, y) {
    if (!currentTable || !dragStart) return;
    const stack = document.elementsFromPoint(x, y);
    let cell = null;
    for (const el of stack) {
      const c = el.closest && el.closest('td, th');
      if (c && currentTable.contains(c)) { cell = c; break; }
    }
    if (!cell) return;
    const coords = getCellCoords(cell, currentTable);
    if (!coords) return;
    selectRange(currentTable, dragStart.row, dragStart.col, coords.row, coords.col);
  }

  function updateBarHighlights() {
    // 項目6: hoveredTable !== currentTable のときはハイライトしない
    if (!barContainer || !currentTable || hoveredTable !== currentTable) return;
    const map = getCellMap(currentTable);
    const selRows = new Set();
    const selCols = new Set();
    for (const cell of selectedCells) {
      const pos = map.get(cell);
      if (!pos) continue;
      for (let dr = 0; dr < pos.rowSpan; dr++) selRows.add(pos.row + dr);
      for (let dc = 0; dc < pos.colSpan; dc++) selCols.add(pos.col + dc);
    }
    barContainer.querySelectorAll('.copytables-col-bar').forEach(b => {
      b.classList.toggle('copytables-bar-active', selCols.has(Number(b.dataset.col)));
    });
    barContainer.querySelectorAll('.copytables-row-bar').forEach(b => {
      b.classList.toggle('copytables-bar-active', selRows.has(Number(b.dataset.row)));
    });
  }

  // --- Copy helpers ---
  function fallbackCopyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }

  // --- Copy (項目2) ---
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return fallbackCopyText(text); }
  }

  async function copyAs(format) {
    if (!currentTable) return;
    const grid = getGridForSelection(currentTable, selectedCells);
    if (grid.length === 0) return;

    const text = format === 'markdown'
      ? TableFormatter.toMarkdown(grid)
      : TableFormatter.toPlain(grid);

    if (await copyText(text)) {
      showToast();
      try { chrome.runtime.sendMessage({ action: 'copied' }); } catch {}
    } else {
      showCopyFailedToast(text);
    }
  }

  // --- Toolbar (項目3, 項目4) ---
  function showToolbar() {
    removeToolbar();
    if (selectedCells.length === 0) return;
    toolbar = document.createElement('div');
    toolbar.className = 'copytables-toolbar';
    if (currentTable && isDarkContext(currentTable)) toolbar.classList.add('copytables-dark');

    const mk = (label, fmt) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', e => { e.stopPropagation(); copyAs(fmt); });
      return b;
    };
    toolbar.appendChild(mk('Plain', 'plain'));
    toolbar.appendChild(mk('Markdown', 'markdown'));


    // Position toolbar
    let box = null;
    for (const cell of selectedCells) {
      const r = cell.getBoundingClientRect();
      if (!box) {
        box = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      } else {
        if (r.top < box.top) box.top = r.top;
        if (r.left < box.left) box.left = r.left;
        if (r.right > box.right) box.right = r.right;
        if (r.bottom > box.bottom) box.bottom = r.bottom;
      }
    }
    document.body.appendChild(toolbar);
    if (box) {
      const BAR_SIZE = 18;
      const sx = window.scrollX, sy = window.scrollY;
      const tbW = toolbar.offsetWidth, tbH = toolbar.offsetHeight;
      let top = sy + box.bottom + 6;
      let left = sx + box.left;
      if (box.bottom + 6 + tbH > window.innerHeight) {
        top = sy + box.top - tbH - 6 - BAR_SIZE;
      }
      if (box.left + tbW > window.innerWidth) {
        left = sx + Math.max(0, window.innerWidth - tbW - 6);
      }
      if (top < 0) top = 0;
      toolbar.style.top = top + 'px';
      toolbar.style.left = left + 'px';
    }
  }

  function removeToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
  }

  // --- Capture-all (virtual scroll tables) ---
  let captureState = null;
  function rafTwice() {
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  function rowKey(tr) {
    const idx = tr.getAttribute('aria-rowindex');
    if (idx) return 'i:' + idx;
    const first = tr.cells && tr.cells[0];
    return 't:' + (first ? TableFormatter.normalize(first.textContent) : '') + '|' + tr.cells?.length;
  }
  function snapshotRow(tr) {
    const out = [];
    for (const c of tr.cells) {
      const text = TableFormatter.normalize(c.textContent);
      const span = c.colSpan || 1;
      for (let i = 0; i < span; i++) out.push(text);
    }
    return out;
  }
  function isHeaderRow(tr) {
    if (!tr.cells || tr.cells.length === 0) return false;
    if (tr.parentElement && tr.parentElement.tagName === 'THEAD') return true;
    let thCount = 0;
    for (const c of tr.cells) if (c.tagName === 'TH') thCount++;
    return thCount === tr.cells.length;
  }
  function showCaptureOverlay() {
    const ov = document.createElement('div');
    ov.className = 'copytables-capture-overlay';
    if (currentTable && isDarkContext(currentTable)) ov.classList.add('copytables-dark');
    ov.innerHTML = '<span class="copytables-capture-label">Capturing rows…</span>' +
                   '<span class="copytables-capture-count">0</span>' +
                   '<button class="copytables-capture-cancel" type="button">Cancel</button>';
    ov.querySelector('.copytables-capture-cancel').addEventListener('click', cancelCapture);
    document.body.appendChild(ov);
    return ov;
  }
  function cancelCapture() {
    if (!captureState) return;
    captureState.cancelled = true;
  }
  async function captureAllRows(table) {
    if (captureState) return;
    const container = getScrollAncestor(table);
    if (!container) { showToast(true); return; }

    const overlay = showCaptureOverlay();
    const countEl = overlay.querySelector('.copytables-capture-count');
    const originalScrollTop = container.scrollTop;
    captureState = { cancelled: false };

    let header = null;
    const seen = new Set();
    const rowsOut = [];
    let lastTop = -1;
    let stalled = 0;
    const MAX_STEPS = 400;

    const collect = () => {
      for (const tr of table.querySelectorAll('tr')) {
        if (!tr.cells || tr.cells.length === 0) continue;
        if (isHeaderRow(tr)) {
          if (!header) header = snapshotRow(tr);
          continue;
        }
        const k = rowKey(tr);
        if (seen.has(k)) continue;
        seen.add(k);
        rowsOut.push(snapshotRow(tr));
      }
      countEl.textContent = String(rowsOut.length);
    };

    try {
      container.scrollTop = 0;
      await rafTwice();
      collect();

      for (let step = 0; step < MAX_STEPS; step++) {
        if (captureState.cancelled) break;
        const before = container.scrollTop;
        const stepPx = Math.max(40, Math.floor(container.clientHeight * 0.8));
        container.scrollTop = before + stepPx;
        await rafTwice();
        collect();
        const now = container.scrollTop;
        if (now === before || now === lastTop) {
          stalled++;
          if (stalled >= 2) break;
        } else {
          stalled = 0;
        }
        lastTop = now;
        if (now + container.clientHeight >= container.scrollHeight - 1) {
          // Reached bottom — one more pass to catch any trailing rows.
          await rafTwice();
          collect();
          break;
        }
      }
    } finally {
      container.scrollTop = originalScrollTop;
      overlay.remove();
      const wasCancelled = captureState.cancelled;
      captureState = null;
      if (wasCancelled) return;
    }

    if (rowsOut.length === 0) { showToast(true); return; }

    // Pad to widest row, prepend header if found.
    const cols = Math.max(
      header ? header.length : 0,
      ...rowsOut.map(r => r.length)
    );
    const pad = r => { while (r.length < cols) r.push(''); return r; };
    const grid = [];
    if (header) grid.push(pad(header.slice()));
    for (const r of rowsOut) grid.push(pad(r.slice()));

    showCaptureChooser(grid);
  }

  function showCaptureChooser(grid) {
    if (toolbar) toolbar.remove();
    toolbar = document.createElement('div');
    toolbar.className = 'copytables-toolbar copytables-capture-chooser';
    if (currentTable && isDarkContext(currentTable)) toolbar.classList.add('copytables-dark');
    const label = document.createElement('span');
    label.textContent = `${grid.length} rows captured — copy as:`;
    label.style.marginRight = '6px';
    toolbar.appendChild(label);
    const mk = (text, format) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const txt = format === 'markdown'
          ? TableFormatter.toMarkdown(grid)
          : TableFormatter.toPlain(grid);
        if (await copyText(txt)) {
          showToast();
          try { chrome.runtime.sendMessage({ action: 'copied' }); } catch {}
        } else {
          showCopyFailedToast(txt);
        }
        toolbar?.remove();
        toolbar = null;
      });
      return b;
    };
    toolbar.appendChild(mk('Plain', 'plain'));
    toolbar.appendChild(mk('Markdown', 'markdown'));
    toolbar.style.position = 'fixed';
    toolbar.style.top = '20px';
    toolbar.style.left = '50%';
    toolbar.style.transform = 'translateX(-50%)';
    document.body.appendChild(toolbar);
    setTimeout(() => { if (toolbar && toolbar.classList.contains('copytables-capture-chooser')) { toolbar.remove(); toolbar = null; } }, 12000);
  }

  // --- Toast (項目5) ---
  function showToast(isError) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'copytables-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    if (isError) {
      toast.textContent = 'Copy failed';
      toast.classList.add('copytables-toast-error');
    } else {
      toast.textContent = 'Copied!';
    }
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) { toast.remove(); toast = null; } }, 1500);
  }

  // Interactive fallback: show a "Click to copy" toast that uses the
  // user's click as a trusted gesture for execCommand('copy').
  function showCopyFailedToast(text) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'copytables-toast copytables-toast-error copytables-toast-action';
    toast.setAttribute('role', 'alert');
    toast.textContent = 'Copy failed — Click to copy';
    toast.addEventListener('click', () => {
      const ok = fallbackCopyText(text);
      if (toast) toast.remove();
      toast = null;
      if (ok) {
        showToast();
        try { chrome.runtime.sendMessage({ action: 'copied' }); } catch {}
      } else {
        showToast(true);
      }
    });
    document.body.appendChild(toast);
    // Keep this one visible longer so the user can click it.
    setTimeout(() => { if (toast) { toast.remove(); toast = null; } }, 6000);
  }

  // --- Event handlers ---
  const INTERACTIVE_SELECTOR = 'a[href], button, input, textarea, select, label, summary, [contenteditable]';

  document.addEventListener('mouseover', e => {
    if (!enabled) return;
    const cell = e.target.closest('td, th');
    const table = cell ? getInnermostTable(cell) : e.target.closest('table');
    if (table && table !== hoveredTable) {
      if (hoveredTable) hoveredTable.classList.remove('copytables-table-hover');
      // 項目1: キャッシュ無効化
      cellMapCache.delete(table);
      hoveredTable = table;
      hoveredTable.classList.add('copytables-table-hover');
      createBars(table);
    }
    if (cell && !isDragging) {
      document.querySelectorAll('.copytables-cell-hover').forEach(c => c.classList.remove('copytables-cell-hover'));
      cell.classList.add('copytables-cell-hover');
    }
  });

  document.addEventListener('mouseout', e => {
    if (!enabled) return;
    const rt = e.relatedTarget;
    if (hoveredTable && !hoveredTable.contains(rt) && !(barContainer && barContainer.contains(rt))) {
      hoveredTable.classList.remove('copytables-table-hover');
      hoveredTable = null;
      removeBars();
      document.querySelectorAll('.copytables-cell-hover').forEach(c => c.classList.remove('copytables-cell-hover'));
    }
  });

  document.addEventListener('mousedown', e => {
    if (!enabled) return;
    if (barContainer && barContainer.contains(e.target)) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const table = getInnermostTable(cell);
    if (!table) return;
    if (e.target.closest(INTERACTIVE_SELECTOR)) return;
    const additive = e.metaKey || e.ctrlKey;
    if (additive) return;
    currentTable = table;
    const coords = getCellCoords(cell, table);
    if (!coords) return;
    isDragging = true;
    dragStart = coords;
    dragStartCell = cell;
    autoScroll.container = getScrollAncestor(table);
    selectCells([cell], false);
  });

  document.addEventListener('mousemove', e => {
    if (!enabled) return;
    if (!isDragging || !currentTable || !dragStart) return;
    autoScroll.x = e.clientX;
    autoScroll.y = e.clientY;
    startAutoScroll();
    const cell = e.target.closest('td, th');
    if (cell && currentTable.contains(cell)) {
      const coords = getCellCoords(cell, currentTable);
      if (coords) {
        if (cell !== dragStartCell && !currentTable.classList.contains('copytables-noselect')) {
          currentTable.classList.add('copytables-noselect');
          window.getSelection()?.removeAllRanges();
        }
        selectRange(currentTable, dragStart.row, dragStart.col, coords.row, coords.col);
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (currentTable) currentTable.classList.remove('copytables-noselect');
    isDragging = false;
    dragStartCell = null;
    stopAutoScroll();
  });

  document.addEventListener('keydown', e => {
    if (!enabled) return;
    if (e.key === 'Escape') {
      clearSelection();
      currentTable = null;
      isDragging = false;
      stopAutoScroll();
      cancelCapture();
    }
  });

  document.addEventListener('click', e => {
    if (!enabled) return;
    if (barContainer && barContainer.contains(e.target)) return;
    if (!e.target.closest('table') && !e.target.closest('.copytables-toolbar')) {
      clearSelection();
      currentTable = null;
    }
  });

  // --- Cell toggle (Cmd/Ctrl+click) ---
  document.addEventListener('click', e => {
    if (!enabled) return;
    if (barContainer && barContainer.contains(e.target)) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const table = getInnermostTable(cell);
    if (!table) return;
    if (e.target.closest(INTERACTIVE_SELECTOR)) return;
    const additive = e.metaKey || e.ctrlKey;
    if (additive) {
      currentTable = table;
      selectCells([cell], true);
      e.stopPropagation();
    }
  }, true);

  // --- Scroll/resize reposition ---
  // Window scrolls are handled implicitly: bars use document coordinates, so they move with the page.
  // Inner scroll containers (e.g. AWS console panels) move the table without changing scrollY,
  // so listen on the capture phase to catch any scrollable ancestor.
  window.addEventListener('scroll', e => {
    if (!enabled || !hoveredTable) return;
    if (e.target === document || e.target === window || e.target === document.documentElement) return;
    if (e.target.nodeType === 1 && e.target.contains(hoveredTable)) scheduleReposition();
  }, { capture: true, passive: true });
  window.addEventListener('resize', () => { if (enabled && hoveredTable) repositionBars(); });

  // --- Message from background.js ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!enabled) return;
    if (msg.action === 'copy') {
      if (selectedCells.length === 0 && hoveredTable) {
        currentTable = hoveredTable;
        selectAll(hoveredTable);
      }
      if (currentTable) {
        copyAs(msg.format).then(() => sendResponse({ ok: true }));
        return true;
      }
    }
  });
})();
