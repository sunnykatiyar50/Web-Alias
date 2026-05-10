/**
 * favicon.js — Favicon fetching + text avatar.
 * Exposes: window.AliasFavicon
 */

(function () {
  'use strict';

  const S2_BASE = 'https://www.google.com/s2/favicons';

  function getFaviconUrl(url, size) {
    size = size || 32;
    try {
      var domain = new URL(url).hostname;
      return S2_BASE + '?domain=' + encodeURIComponent(domain) + '&sz=' + size;
    } catch (e) {
      return null;
    }
  }

  function hashToHue(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .map(function (w) { return w[0]; })
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  window.AliasFavicon = { getFaviconUrl, hashToHue, getInitials };
})();
