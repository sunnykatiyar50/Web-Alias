/**
 * popup.js — Main popup controller.
 * Depends on: AliasStorage, AliasFavicon, AliasTheme (loaded via <script> tags before this file)
 */

(function () {
  'use strict';

  var Storage = window.AliasStorage;
  var Favicon = window.AliasFavicon;
  var Theme   = window.AliasTheme;

  /* ── DOM refs ──────────────────────────────────────────── */
  var $list        = document.getElementById('alias-list');
  var $empty       = document.getElementById('empty-state');
  var $search      = document.getElementById('search-input');
  var $count       = document.getElementById('alias-count');
  var $btnAdd      = document.getElementById('btn-add');
  var $btnTheme    = document.getElementById('btn-theme');
  var $btnImport   = document.getElementById('btn-import');
  var $btnExport   = document.getElementById('btn-export');
  var $fileImport  = document.getElementById('file-import');
  var $modalOverlay = document.getElementById('modal-overlay');
  var $modalTitle  = document.getElementById('modal-title');
  var $form        = document.getElementById('alias-form');
  var $fieldName   = document.getElementById('field-name');
  var $fieldAlias  = document.getElementById('field-alias');
  var $fieldUrl    = document.getElementById('field-url');
  var $btnCancel   = document.getElementById('btn-cancel');
  var $btnClose    = document.getElementById('btn-modal-close');

  var editingAlias = null;
  var currentAliases = {};

  /* ── Init ──────────────────────────────────────────────── */
  Theme.initTheme();
  renderList();
  $search.focus();

  /* ── Render ─────────────────────────────────────────────── */
  async function renderList(filter) {
    filter = filter || '';
    var aliases = await Storage.getAliases();
    currentAliases = aliases;
    var entries = Object.values(aliases);
    var query = filter.toLowerCase();

    var filtered = query
      ? entries.filter(function (a) {
          return a.alias.toLowerCase().indexOf(query) !== -1 ||
                 a.displayName.toLowerCase().indexOf(query) !== -1 ||
                 a.url.toLowerCase().indexOf(query) !== -1;
        })
      : entries;

    filtered.sort(function (a, b) { return a.alias.localeCompare(b.alias); });

    $list.innerHTML = '';
    $count.textContent = entries.length + ' alias' + (entries.length !== 1 ? 'es' : '');

    if (entries.length === 0) {
      $empty.classList.remove('hidden');
      $list.classList.add('hidden');
      return;
    }

    $empty.classList.add('hidden');
    $list.classList.remove('hidden');

    if (filtered.length === 0) {
      $list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No matches found.</p></div>';
      return;
    }

    var fragment = document.createDocumentFragment();

    filtered.forEach(function (entry, i) {
      var el = document.createElement('div');
      el.className = 'alias-item';
      el.style.animationDelay = (i * 30) + 'ms';

      var faviconUrl = Favicon.getFaviconUrl(entry.url);
      var hue = Favicon.hashToHue(entry.displayName);
      var initials = Favicon.getInitials(entry.displayName);

      el.setAttribute('data-url', entry.url);
      el.setAttribute('data-open', 'true');
      el.style.cursor = 'pointer';

      el.innerHTML =
        '<img class="alias-item__icon"' +
        ' src="' + (faviconUrl || '') + '"' +
        ' alt=""' +
        ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"' +
        ' loading="lazy">' +
        '<div class="alias-item__avatar" style="display:none;background:hsl(' + hue + ',55%,45%)">' + initials + '</div>' +
        '<div class="alias-item__info">' +
          '<div class="alias-item__name">' +
            escHtml(entry.displayName) +
            ' <span class="alias-item__badge">' + escHtml(entry.alias) + '</span>' +
          '</div>' +
          '<div class="alias-item__url" title="' + escHtml(entry.url) + '">' + escHtml(truncUrl(entry.url)) + '</div>' +
        '</div>' +
        '<div class="alias-item__actions">' +
          '<button class="alias-item__btn" data-action="edit" data-alias="' + escHtml(entry.alias) + '" title="Edit">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
              '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
            '</svg>' +
          '</button>' +
          '<button class="alias-item__btn alias-item__btn--danger" data-action="delete" data-alias="' + escHtml(entry.alias) + '" title="Delete">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
            '</svg>' +
          '</button>' +
        '</div>';

      fragment.appendChild(el);
    });

    $list.appendChild(fragment);
  }

  /* ── Search ─────────────────────────────────────────────── */
  var searchTimer;
  $search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { renderList($search.value.trim()); }, 120);
  });

  /* ── Modal ──────────────────────────────────────────────── */
  function openModal(alias) {
    editingAlias = alias || null;
    $modalTitle.textContent = editingAlias ? 'Edit Alias' : 'Add Alias';
    $form.reset();

    if (editingAlias) {
      Storage.getAlias(editingAlias).then(function (entry) {
        if (entry) {
          $fieldName.value = entry.displayName;
          $fieldAlias.value = entry.alias;
          $fieldUrl.value = entry.url;
          $fieldAlias.readOnly = true;
        }
      });
    } else {
      $fieldAlias.readOnly = false;
    }

    $modalOverlay.classList.remove('hidden');
    setTimeout(function () { $fieldName.focus(); }, 100);
  }

  function closeModal() {
    $modalOverlay.classList.add('hidden');
    editingAlias = null;
    $form.reset();
  }

  $btnAdd.addEventListener('click', function () { openModal(); });
  $btnCancel.addEventListener('click', closeModal);
  $btnClose.addEventListener('click', closeModal);
  $modalOverlay.addEventListener('click', function (e) {
    if (e.target === $modalOverlay) closeModal();
  });

  /* ── Save ────────────────────────────────────────────────── */
  $form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var alias = $fieldAlias.value.trim().toLowerCase();
    var url = $fieldUrl.value.trim();
    var displayName = $fieldName.value.trim();

    if (!alias || !url || !displayName) return;

    await Storage.setAlias(alias, {
      displayName: displayName,
      url: url,
      favicon: Favicon.getFaviconUrl(url)
    });

    closeModal();
    await renderList($search.value.trim());
    showToast('Alias "' + alias + '" saved');
  });

  /* ── List click delegation ──────────────────────────────── */
  $list.addEventListener('click', async function (e) {
    // Don't open if an action button was clicked
    var btn = e.target.closest('[data-action]');
    if (btn) {
      var action = btn.dataset.action;
      var alias = btn.dataset.alias;
      if (action === 'edit') {
        openModal(alias);
      } else if (action === 'delete') {
        await Storage.deleteAlias(alias);
        await renderList($search.value.trim());
        showToast('Alias "' + alias + '" deleted');
      }
      return;
    }

    // Click on the item body → open URL in new tab
    var item = e.target.closest('[data-open]');
    if (item) {
      var url = item.dataset.url;
      if (url) {
        if (chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: url });
        } else {
          window.open(url, '_blank');
        }
      }
    }
  });

  /* ── Theme ──────────────────────────────────────────────── */
  $btnTheme.addEventListener('click', async function () {
    var next = await Theme.toggleTheme();
    showToast('Theme: ' + next);
  });

  /* ── Export ──────────────────────────────────────────────── */
  $btnExport.addEventListener('click', function () {
    var d = new Date();
    var pad = function(n) { return n.toString().padStart(2, '0'); };
    var dateStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds());
    var filename = 'web-alias-export-' + dateStr + '.json';

    var json = JSON.stringify({
      aliases: currentAliases || {},
      exportedAt: d.toISOString(),
      version: 1
    }, null, 2);

    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  });

  /* ── Import ─────────────────────────────────────────────── */
  $btnImport.addEventListener('click', function () {
    var importUrl = chrome.runtime.getURL('import.html');
    chrome.tabs.create({ url: importUrl });
  });

  /* ── Toast ──────────────────────────────────────────────── */
  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () { toast.remove(); }, 2500);
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncUrl(url) {
    try {
      var u = new URL(url);
      var path = u.pathname === '/' ? '' : u.pathname;
      return u.hostname + path.slice(0, 30) + (path.length > 30 ? '…' : '');
    } catch (e) {
      return url.slice(0, 50);
    }
  }

  /* ── Keyboard shortcuts ─────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$modalOverlay.classList.contains('hidden')) {
      closeModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openModal();
    }
  });

})();
