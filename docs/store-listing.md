# Chrome Web Store listing — TableHandles

Drop-in copy for the listing form. Adjust as needed.

## Title (max 50 chars)

```
TableHandles
```

## Summary / Short description (max 132 chars)

Drop one in:

- 109 chars
  ```
  Hover any HTML table, grab a row or column handle, and copy as TSV or Markdown — even from virtual-scroll tables.
  ```

- 89 chars (alt, more punchy)
  ```
  Copy any HTML table as TSV or Markdown. No popup, no setup, no key combos to memorize.
  ```

## Category

- Primary: **Productivity**
- (Alternative: Tools)

## Language

English (with optional Japanese localization later via `_locales/`).

## Detailed description

```
TableHandles turns any HTML table on the web into something you can grab and paste somewhere else — a spreadsheet, a Markdown doc, a chat message, anywhere.

Hover a table and selector handles appear along the top and left edges. Click a handle to take the whole row or column, drag across cells for a rectangle, or Cmd/Ctrl-click for a non-contiguous pick. Hit "Plain" or "Markdown" in the floating toolbar and the table is on your clipboard, properly aligned, with merged cells (rowspan/colspan) preserved.

Why it stands out

• No modifier keys to memorize. Hover a table, click a handle. That's the whole interface.
• Plain Text (TSV) and Markdown (GFM) are both free, both unlimited. No row caps, no subscription, no nag screen.
• Capture all rows of a virtual-scroll table. Tables that recycle DOM rows on scroll (DataTables, AWS Console, TanStack Virtual, etc.) are handled by the down-arrow handle: TableHandles scrolls the container from top to bottom, snapshots every batch, and copies the full table.
• Drag selection auto-scrolls when you reach the edge of the page or the inner scroll container.
• Adapts to dark and light pages automatically — no separate theme toggle.
• Tiny and local. Under 100 KB, no telemetry, no remote code, no analytics. The extension does not request host permissions; it only acts on the active tab when you ask it to.

How to use

1. Click the toolbar icon to turn TableHandles ON. The badge shows "ON" in green.
2. Hover any table. Selector handles appear along the top and left edges.
3. Click a row or column handle to select it. Click the corner button to select / deselect the whole table. Click the down-arrow (↡) to capture every row of a virtual-scroll table.
4. Drag across cells to select a rectangle. Cmd / Ctrl-click a cell to add it to a non-contiguous selection. Esc clears.
5. Choose Plain or Markdown in the floating toolbar — or use Alt+Shift+C (TSV) / Alt+Shift+M (Markdown). The badge flashes ✓ on success.

Output formats

• Plain Text — Tab-separated values, one row per line. Drops cleanly into Excel, Sheets, Numbers, or a raw text field.
• Markdown — GitHub-flavored table with the | --- | separator. Pipes inside cells are escaped.

Privacy

TableHandles does not collect, transmit, or sell any data. There is no telemetry and no remote code. The only thing it stores locally (via chrome.storage.local) is whether the extension is toggled ON. Full privacy policy: https://kzcat.github.io/tablehandles/privacy

Source code

Open source on GitHub: https://github.com/kzcat/tablehandles

Issues, requests, and contributions are welcome.

Known limitations

• Tables inside cross-origin iframes are not reachable from the parent page (Chrome's standard restriction).
• Shadow-DOM tables and ARIA-only "div tables" (role="table") are partially supported; native <table> elements work best.
• Capture-all needs the table to live in a real scroll container; if the entire page is the scroller, ordinary selection already covers all rows.
```

## Support / Homepage URLs

- Homepage URL: `https://github.com/kzcat/tablehandles`
- Support URL: `https://github.com/kzcat/tablehandles/issues`
- Privacy policy URL: `https://kzcat.github.io/tablehandles/privacy` (enable GitHub Pages on `main` → `/docs`)

## Notes on screenshots (1280×800 PNG, 5 slots)

1. Hero shot — a real table on a public page with row/column handles visible and a selection highlighted.
2. The floating "Plain / Markdown" toolbar with a row selected.
3. Capture-all in progress: the "Capturing rows… 56" overlay over a virtual-scroll table.
4. The result pasted into a Markdown editor, side-by-side with the source table.
5. The auto-detected dark variant on a dark-themed page (e.g. AWS console).

Avoid stock photography or text-heavy slides — Google's review penalizes "marketing collage" screenshots.
