/**
 * storage.js — Alias CRUD over chrome.storage.local.
 * Exposes: window.AliasStorage
 */

(function () {
  'use strict';

  const KEYS = { ALIASES: 'aliases', SETTINGS: 'settings' };
  const DEFAULT_SETTINGS = { theme: 'system' };

  /* ── Aliases ─────────────────────────────────────────── */

  async function getAliases() {
    const data = await chrome.storage.local.get(KEYS.ALIASES);
    return data[KEYS.ALIASES] || {};
  }

  async function getAlias(alias) {
    const all = await getAliases();
    return all[alias] || null;
  }

  async function setAlias(alias, entry) {
    const all = await getAliases();
    const existing = all[alias] || {};
    all[alias] = {
      displayName: entry.displayName || alias,
      alias,
      url: entry.url,
      favicon: entry.favicon || null,
      createdAt: entry.createdAt || existing.createdAt || Date.now(),
      updatedAt: Date.now(),
      useCount: existing.useCount || 0,
      lastUsed: existing.lastUsed || null
    };
    await chrome.storage.local.set({ [KEYS.ALIASES]: all });
    return all[alias];
  }

  async function deleteAlias(alias) {
    const all = await getAliases();
    delete all[alias];
    await chrome.storage.local.set({ [KEYS.ALIASES]: all });
  }

  async function incrementUsage(alias) {
    const all = await getAliases();
    if (all[alias]) {
      all[alias].useCount = (all[alias].useCount || 0) + 1;
      all[alias].lastUsed = Date.now();
      await chrome.storage.local.set({ [KEYS.ALIASES]: all });
    }
  }

  /* ── Import / Export ─────────────────────────────────── */

  async function exportAliases() {
    const aliases = await getAliases();
    return JSON.stringify({ aliases, exportedAt: new Date().toISOString(), version: 1 }, null, 2);
  }

  async function importAliases(jsonString, mode) {
    const imported = JSON.parse(jsonString);
    const incoming = imported.aliases || imported;

    if (mode === 'replace') {
      await chrome.storage.local.set({ [KEYS.ALIASES]: incoming });
      return { count: Object.keys(incoming).length, mode };
    }

    const existing = await getAliases();
    const merged = Object.assign({}, existing, incoming);
    await chrome.storage.local.set({ [KEYS.ALIASES]: merged });
    return { count: Object.keys(incoming).length, mode: 'merge' };
  }

  /* ── Settings ────────────────────────────────────────── */

  async function getSettings() {
    const data = await chrome.storage.local.get(KEYS.SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS, data[KEYS.SETTINGS] || {});
  }

  async function setSettings(patch) {
    const current = await getSettings();
    const updated = Object.assign({}, current, patch);
    await chrome.storage.local.set({ [KEYS.SETTINGS]: updated });
    return updated;
  }

  /* ── Public API ──────────────────────────────────────── */

  window.AliasStorage = {
    getAliases, getAlias, setAlias, deleteAlias, incrementUsage,
    exportAliases, importAliases,
    getSettings, setSettings
  };
})();
