/* background.js - context menus, shortcuts, enabled state */
'use strict';

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4caf50' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#9e9e9e' });
  }
}

let badgeFlashTimer = null;
function flashBadge() {
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#1976d2' });
  if (badgeFlashTimer) clearTimeout(badgeFlashTimer);
  badgeFlashTimer = setTimeout(() => {
    badgeFlashTimer = null;
    chrome.storage.local.get('enabled', d => updateBadge(!!d.enabled));
  }, 900);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('enabled', data => {
    if (data.enabled === undefined) chrome.storage.local.set({ enabled: false });
    updateBadge(!!data.enabled);
  });
  chrome.contextMenus.create({
    id: 'copy-plain',
    title: 'Copy selection as Plain Text (TSV)',
    contexts: ['page', 'selection']
  });
  chrome.contextMenus.create({
    id: 'copy-markdown',
    title: 'Copy selection as Markdown',
    contexts: ['page', 'selection']
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) updateBadge(changes.enabled.newValue);
});

chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get('enabled', data => {
    chrome.storage.local.set({ enabled: !data.enabled });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.local.get('enabled', data => {
    if (!data.enabled) return;
    const idToFormat = { 'copy-plain': 'plain', 'copy-markdown': 'markdown' };
    const format = idToFormat[info.menuItemId] || 'plain';
    chrome.tabs.sendMessage(tab.id, { action: 'copy', format });
  });
});

chrome.commands.onCommand.addListener((command, tab) => {
  chrome.storage.local.get('enabled', data => {
    if (!data.enabled) return;
    const format = command === 'copy-markdown' ? 'markdown' : 'plain';
    chrome.tabs.sendMessage(tab.id, { action: 'copy', format });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.action === 'copied') flashBadge();
});
