# TableHandles — Chrome Extension

Hover any HTML table, grab a row or column handle, and copy as Plain Text (TSV) or Markdown. Works with virtual-scroll tables (DataTables, AWS Console, etc.).

**Disabled by default.** Click the extension icon to toggle ON/OFF.

## Installation

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this directory (`copytables/`)

## Usage

### Enabling / Disabling
- Click the extension icon in the toolbar to toggle ON/OFF
- Badge shows "ON" (green) when active, "OFF" (grey) when inactive
- A 1-second "✓" flashes after a successful copy
- No popup — single click toggles the state

### Table Selection
- Hover a table to highlight it and reveal selector handles along the top and left edges
- **Column handles** click to toggle-select a column
- **Row handles** click to toggle-select a row
- **Corner button** (⊞) at the top-left selects / deselects the entire table
- Click a cell to select it; drag to select a rectangular range
- Drag past the viewport edge to auto-scroll the page (or the inner scroll container)
- Cmd (Mac) / Ctrl (Win/Linux) + click a cell to toggle-add it
- Multiple handle clicks accumulate (no modifier key needed)
- Esc to clear selection

### Capture all rows (virtual scroll tables)
Tables that recycle DOM rows on scroll (DataTables, AWS Console, TanStack Virtual, etc.) only expose the visible rows at any moment. Press the **down-arrow button** in the corner area to capture every row: TableHandles scrolls the container from top to bottom, snapshots each batch, dedupes, then copies the full table.

### Copying
1. **Floating toolbar**: "Plain" / "Markdown" buttons appear after selection
2. **Context menu**: Right-click → copy as Plain Text or Markdown
3. **Keyboard shortcuts**:
   - `Alt+Shift+C` — Plain Text (TSV)
   - `Alt+Shift+M` — Markdown
4. **Failure handling**: if the page blocks `clipboard.writeText`, the toast turns into a "Click to copy" button and uses `execCommand('copy')` instead.

## Output Formats

- **Plain Text**: Tab-separated values (TSV), rows separated by newlines
- **Markdown**: GFM table format with `|---|` separator row

## Tests

```sh
npm test
```

## Release

1. Bump `version` in `manifest.json` and `package.json`.
2. Build the upload archive:
   ```sh
   npm run zip
   ```
   The ZIP appears at `dist/tablehandles-<version>.zip`.
3. Upload to the Chrome Web Store Developer Dashboard.

Listing copy, permission justifications, and the privacy policy live in `docs/`:

- `docs/privacy.md` — published at `https://kzcat.github.io/tablehandles/privacy` once GitHub Pages is enabled (`main` branch, `/docs` folder).
- `docs/store-listing.md` — drop-in title/summary/detailed description.
- `docs/permissions.md` — Single purpose + per-permission justifications for the Privacy practices tab.

<!-- screenshot placeholder -->
<!-- ![Screenshot placeholder](docs/screenshot.png) -->
