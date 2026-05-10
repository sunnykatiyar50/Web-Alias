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

    var template = document.getElementById('alias-item-template');
    filtered.forEach(function (entry, i) {
      var clone = template.content.cloneNode(true);
      var el = clone.querySelector('.alias-item');
      
      el.style.animationDelay = (i * 30) + 'ms';
      el.setAttribute('data-url', entry.url);

      var faviconUrl = Favicon.getFaviconUrl(entry.url);
      var hue = Favicon.hashToHue(entry.displayName);
      var initials = Favicon.getInitials(entry.displayName);

      var img = el.querySelector('.alias-item__icon');
      var avatar = el.querySelector('.alias-item__avatar');
      var nameText = el.querySelector('.name-text');
      var badge = el.querySelector('.alias-item__badge');
      var urlEl = el.querySelector('.alias-item__url');
      var editBtn = el.querySelector('.edit-btn');
      var deleteBtn = el.querySelector('.delete-btn');

      if (faviconUrl) {
        img.src = faviconUrl;
      }
      img.addEventListener('error', function() {
        img.style.display = 'none';
        avatar.style.display = 'flex';
      });

      avatar.style.background = 'hsl(' + hue + ',55%,45%)';
      avatar.textContent = initials;

      nameText.textContent = entry.displayName + ' ';
      badge.textContent = entry.alias;
      urlEl.textContent = truncUrl(entry.url);
      urlEl.title = entry.url;

      editBtn.setAttribute('data-alias', entry.alias);
      deleteBtn.setAttribute('data-alias', entry.alias);

      fragment.appendChild(clone);
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

    $fieldAlias.readOnly = false;
    if (editingAlias) {
      Storage.getAlias(editingAlias).then(function (entry) {
        if (entry) {
          $fieldName.value = entry.displayName;
          $fieldAlias.value = entry.alias;
          $fieldUrl.value = entry.url;
        }
      });
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
    
    // Handle rename: if editing and alias changed, delete old entry
    if (editingAlias && editingAlias !== alias) {
      await Storage.deleteAlias(editingAlias);
    }

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
