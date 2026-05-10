/**
 * theme.js — System theme detection with manual override.
 * Exposes: window.AliasTheme
 */

(function () {
  'use strict';

  var THEME_KEY = 'wa_theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    var resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  async function initTheme() {
    var data = await chrome.storage.local.get(THEME_KEY);
    var theme = data[THEME_KEY] || 'system';
    applyTheme(theme);

    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async function () {
      var current = await chrome.storage.local.get(THEME_KEY);
      if (!current[THEME_KEY] || current[THEME_KEY] === 'system') {
        applyTheme('system');
      }
    });

    return theme;
  }

  async function setTheme(theme) {
    await chrome.storage.local.set({ [THEME_KEY]: theme });
    applyTheme(theme);
  }

  async function toggleTheme() {
    var data = await chrome.storage.local.get(THEME_KEY);
    var current = data[THEME_KEY] || 'system';
    var next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
    await setTheme(next);
    return next;
  }

  window.AliasTheme = { initTheme, setTheme, toggleTheme };
})();
