---
permalink: /privacy
title: Privacy Policy — TableHandles
---

# Privacy Policy — TableHandles

_Last updated: 2026-06-01_

TableHandles is a Chrome extension that lets you select rows, columns, or cell ranges from any HTML table on a web page and copy them to your clipboard as plain text (TSV) or Markdown.

This document describes what data the extension does and does not handle.

## Data we collect

**None.**

TableHandles does not collect, transmit, or sell any personal information, browsing history, page content, or usage analytics. The extension has no servers, no telemetry, and no third-party integrations.

## Data we store on your device

The extension uses Chrome's local storage (`chrome.storage.local`) to remember:

- Whether the extension is currently toggled ON or OFF.
- Whether the first-time hint has already been shown.

This data lives only inside your browser profile. It is never transmitted off your device.

## Clipboard access

When you trigger a copy action (toolbar button, context menu, or keyboard shortcut), the formatted table data is written to your operating system clipboard via the standard `navigator.clipboard.writeText` API. The clipboard content is the table data you selected; nothing else is read from the clipboard.

## Permissions and why we request them

| Permission | Why it is needed |
|---|---|
| `activeTab` | Inject the selection UI only on the tab where you click the toolbar icon. |
| `clipboardWrite` | Write the formatted table text to your clipboard when you copy. |
| `storage` | Persist the ON/OFF toggle and first-time hint flag locally in your browser. |
| `contextMenus` | Show "Copy selection as Plain Text / Markdown" entries in the right-click menu. |

The extension does not request `host_permissions` and does not access remote URLs.

## Limited Use compliance

The use of information received from Google APIs (none, in our case) and any user data adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/user_data/), including the Limited Use requirements. Specifically:

1. We do not transfer user data to third parties.
2. We do not use user data for advertising.
3. We do not allow humans to read user data, except as necessary for security or to comply with applicable law.
4. We do not use user data to determine credit-worthiness or for lending purposes.

## Children's privacy

TableHandles is a developer/productivity tool with no features directed at children under 13. We do not knowingly collect any data from anyone.

## Changes to this policy

We may update this policy when extension functionality changes. The "Last updated" date above will reflect the most recent revision. Material changes will be noted in the extension's release notes on the Chrome Web Store and on the project repository.

## Contact

Source code, issues, and contact: <https://github.com/kzcat/tablehandles>
