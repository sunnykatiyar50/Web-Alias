/**
 * background.js — Service worker (Chrome) / background script (Firefox).
 * Handles omnibox alias resolution and keyboard shortcut commands.
 */

/* ── Storage helpers (duplicated lightly to avoid ES module issues in SW) ── */

async function getAliases() {
  const data = await chrome.storage.local.get('aliases');
  return data.aliases || {};
}

async function incrementUsage(aliasKey) {
  const aliases = await getAliases();
  if (aliases[aliasKey]) {
    aliases[aliasKey].useCount = (aliases[aliasKey].useCount || 0) + 1;
    aliases[aliasKey].lastUsed = Date.now();
    await chrome.storage.local.set({ aliases });
  }
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
  const input = text.trim();
  const firstSpaceIndex = input.indexOf(' ');
  const aliases = await getAliases();

  if (!input) {
    suggest([]);
    return;
  }

  // Check if we are typing a query for an existing alias
  if (firstSpaceIndex !== -1) {
    const key = input.substring(0, firstSpaceIndex).toLowerCase();
    const query = input.substring(firstSpaceIndex + 1).trim();
    const entry = aliases[key];

    if (entry && entry.url.includes('%s')) {
      chrome.omnibox.setDefaultSuggestion({
        description: `Search ${entry.displayName} for <match>${query}</match>`
      });
      suggest([]); // No other suggestions needed if we are in search mode
      return;
    }
  }

  const query = input.toLowerCase();
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
  const input = text.trim();
  const firstSpaceIndex = input.indexOf(' ');
  
  let key = input.toLowerCase();
  let query = '';

  if (firstSpaceIndex !== -1) {
    key = input.substring(0, firstSpaceIndex).toLowerCase();
    query = input.substring(firstSpaceIndex + 1).trim();
  }

  const entry = aliases[key];

  if (!entry) {
    // If no exact alias match, check if the input itself is a URL
    if (/^https?:\/\//i.test(input) || input.includes('.')) {
      const url = /^https?:\/\//i.test(input) ? input : 'https://' + input;
      chrome.tabs.update({ url });
    }
    return;
  }

  let url = entry.url;

  // Handle %s replacement if query exists
  if (query && url.includes('%s')) {
    url = url.replace(/%s/g, encodeURIComponent(query));
  } else if (query) {
    // If query exists but no %s, fallback to just the alias or maybe append?
    // Most users expect %s, so if not present, we just navigate to the base URL
  }
  // Ensure protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  await incrementUsage(key);

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
        url: dataUrl,
        filename: currentExportFilename
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

if (chrome.downloads && 'onDeterminingFilename' in chrome.downloads) {
  chrome.downloads['onDeterminingFilename'].addListener((item, suggest) => {
    if (item.byExtensionId === chrome.runtime.id && currentExportFilename) {
      suggest({ filename: currentExportFilename, conflictAction: 'overwrite' });
      currentExportFilename = null;
    } else {
      suggest();
    }
  });
}

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

