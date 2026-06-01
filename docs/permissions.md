# Privacy practices answers — TableHandles

Drop-in answers for the Chrome Web Store "Privacy practices" tab.

## Single purpose

```
TableHandles lets the user select rows, columns, or cell ranges from any HTML table on a web page and copy that selection to the clipboard as plain text (TSV) or Markdown.
```

## Permission justifications

### `activeTab`

```
TableHandles activates its selection UI on the page the user is currently viewing. activeTab gives temporary, per-click access to that page so the extension can read table cell text and inject the floating handles and toolbar — only on the tab the user explicitly enables it from.
```

### `clipboardWrite`

```
The core action of TableHandles is to put the selected table data on the user's clipboard, formatted as TSV or Markdown. clipboardWrite is required to call navigator.clipboard.writeText (and document.execCommand('copy') as a fallback) when the user clicks Copy.
```

### `storage`

```
TableHandles persists two small flags via chrome.storage.local:
1. Whether the extension is currently toggled ON or OFF (so the choice survives across tabs and reloads).
2. Whether the first-time onboarding hint has already been shown.
No personal data, browsing history, or page content is ever stored.
```

### `contextMenus`

```
The extension adds two right-click entries — "Copy selection as Plain Text (TSV)" and "Copy selection as Markdown" — so the user can copy without using the floating toolbar. contextMenus is needed to register and remove those entries.
```

## Host permission justification

The extension does not request `host_permissions`. It relies entirely on `activeTab`, which only grants access after the user clicks the toolbar icon on a given page. State this explicitly in the listing review notes if the reviewer asks.

## Remote code

```
No. TableHandles bundles all of its JavaScript inside the extension package. It does not download, eval, or execute any code from a remote source.
```

## Data usage declaration

In the "What user data will your extension collect or use?" checklist, mark **none of the categories** (no PII, no health, no financial, no authentication info, no personal communications, no location, no web history, no user activity, no website content).

In the certifications section, agree to all three:

- I do not sell or transfer user data to third parties, apart from approved use cases.
- I do not use or transfer user data for purposes unrelated to my extension's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Tester notes (optional but helps reviewers)

```
Quick test path:
1. Load the extension and click its toolbar icon. The badge shows "ON".
2. Visit any page with an HTML table (e.g. https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)).
3. Hover the table — selector handles appear along the top and left edges.
4. Click a row or column handle, then click "Plain" or "Markdown" in the floating toolbar. A "Copied!" toast appears and the badge flashes ✓.
5. Paste anywhere to confirm the table arrived as TSV or GFM Markdown.

For the "Capture all" handle (↡), use a virtual-scroll table such as the AWS Console "Service Events" table or a DataTables demo. The handle scrolls the inner container, snapshots every batch, and offers Plain/Markdown copy when finished.
```
