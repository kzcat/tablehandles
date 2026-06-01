/* formatter.js - 選択データ(2次元配列)をTSV/Markdown文字列に変換 */
'use strict';

const TableFormatter = (() => {
  function normalize(text) {
    return (text || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function toPlain(grid) {
    if (grid.length === 1 && grid[0].length === 1) return grid[0][0];
    return grid.map(row => row.join('\t')).join('\n');
  }

  function toMarkdown(grid) {
    if (grid.length === 1 && grid[0].length === 1) return grid[0][0];
    const escape = s => s.replace(/\|/g, '\\|');
    const cols = Math.max(...grid.map(r => r.length));
    const pad = row => {
      const r = row.slice();
      while (r.length < cols) r.push('');
      return r;
    };
    if (grid.length === 1) {
      const header = pad(grid[0]).map(escape);
      const sep = header.map(() => '---');
      return '| ' + header.join(' | ') + ' |\n| ' + sep.join(' | ') + ' |';
    }
    const lines = [];
    const header = pad(grid[0]).map(escape);
    lines.push('| ' + header.join(' | ') + ' |');
    lines.push('| ' + header.map(() => '---').join(' | ') + ' |');
    for (let i = 1; i < grid.length; i++) {
      lines.push('| ' + pad(grid[i]).map(escape).join(' | ') + ' |');
    }
    return lines.join('\n');
  }

  function extractGrid(cells) {
    if (!cells || cells.length === 0) return [];
    return cells;
  }

  return { normalize, toPlain, toMarkdown, extractGrid };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = TableFormatter; }
