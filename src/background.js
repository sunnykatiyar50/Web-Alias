/**
 * background.js — Service worker (Chrome) / background script (Firefox).
 * Handles omnibox alias resolution and keyboard shortcut commands.
 */

/* ── Storage helpers (duplicated lightly to avoid ES module issues in SW) ── */

async function getAliases() {
  const data = await chrome.storage.local.get('aliases');
  return data.aliases || {};
}

/* ── Omnibox ─────────────────────────────────────────────── */

// Set default suggestion when omnibox activates
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Type an alias to navigate (e.g. "gh" → GitHub)'
  });
});

// Provide suggestions as user types
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const aliases = await getAliases();
  const query = text.trim().toLowerCase();

  if (!query) {
    suggest([]);
    return;
  }

  const matches = Object.values(aliases)
    .filter(a =>
      a.alias.toLowerCase().includes(query) ||
      a.displayName.toLowerCase().includes(query)
    )
    .slice(0, 6)
    .map(a => ({
      content: a.alias,
      description: `${a.displayName} — ${a.url}`
    }));

  suggest(matches);

  // Update default suggestion if exact match found
  const exact = aliases[query];
  if (exact) {
    chrome.omnibox.setDefaultSuggestion({
      description: `Go to ${exact.displayName} → ${exact.url}`
    });
  }
});

// Navigate when user presses Enter
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const aliases = await getAliases();
  const key = text.trim().toLowerCase();
  const entry = aliases[key];

  if (!entry) {
    // No match — try as URL or search
    return;
  }

  let url = entry.url;
  // Ensure protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  switch (disposition) {
    case 'currentTab':
      chrome.tabs.update({ url });
      break;
    case 'newForegroundTab':
      chrome.tabs.create({ url });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url, active: false });
      break;
  }
});

/* ── Export Handler ────────────────────────────────────── */

let currentExportFilename = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_JSON') {
    try {
      currentExportFilename = message.filename;
      
      const b64 = btoa(unescape(encodeURIComponent(message.json)));
      const dataUrl = 'data:application/json;base64,' + b64;
      
      chrome.downloads.download({
        url: dataUrl
        // saveAs is intentionally omitted because calling it from a background script 
        // without a trusted user click token causes it to aggressively fail on Firefox and Chrome alike.
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, downloadId });
        }
      });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true; // async
  }
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.byExtensionId === chrome.runtime.id && currentExportFilename) {
    suggest({ filename: currentExportFilename, conflictAction: 'overwrite' });
    currentExportFilename = null;
  } else {
    suggest();
  }
});

/* ── Install / Update ────────────────────────────────────── */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Seed with example alias
    chrome.storage.local.get('aliases', (data) => {
      if (!data.aliases || Object.keys(data.aliases).length === 0) {
        chrome.storage.local.set({
          aliases: {
            gh: {
              displayName: 'GitHub',
              alias: 'gh',
              url: 'https://github.com',
              favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=32',
              createdAt: Date.now()
            }
          }
        });
      }
    });
  }
});

