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
  var $btnView     = document.getElementById('btn-view');
  var $btnExpand   = document.getElementById('btn-expand');
  var $sortSelect  = document.getElementById('sort-select');
  var $categoryFilter = document.getElementById('category-filter');
  var $fileImport  = document.getElementById('file-import');
  var $resizeHandle = document.getElementById('resize-handle');
  var $resizeHandleLeft = document.getElementById('resize-handle-left');
  var $modalOverlay = document.getElementById('modal-overlay');
  var $modalTitle  = document.getElementById('modal-title');
  var $form        = document.getElementById('alias-form');
  var $fieldName   = document.getElementById('field-name');
  var $fieldAlias  = document.getElementById('field-alias');
  var $fieldCategory = document.getElementById('field-category');
  var $categorySuggestions = document.getElementById('category-suggestions');
  var $fieldUrl    = document.getElementById('field-url');
  var $btnCancel   = document.getElementById('btn-cancel');
  var $btnClose    = document.getElementById('btn-modal-close');

  var editingAlias = null;
  var currentAliases = {};
  var currentViewMode = 'list';
  var currentSortMode = 'most_used';
  var currentCategoryFilter = '';

  /* ── Init ──────────────────────────────────────────────── */
  initPopupSize();
  initTabMode();
  Theme.initTheme();
  initViewMode();
  initSortMode();
  renderList();
  $search.focus();

  /* ── Tab Mode ───────────────────────────────────────────── */
  function initTabMode() {
    // Detect if we're running as a full tab (not a popup)
    var isTab = window.location.search.indexOf('tab=1') !== -1;
    if (isTab) {
      document.documentElement.setAttribute('data-mode', 'tab');
      document.body.setAttribute('data-mode', 'tab');
      document.documentElement.style.removeProperty('width');
      document.documentElement.style.removeProperty('height');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('height');
      // Change expand button to indicate current mode
      $btnExpand.setAttribute('title', 'Opened in full window');
      $btnExpand.style.color = 'var(--accent)';
      $btnExpand.style.pointerEvents = 'none';
    }
  }

  $btnExpand.addEventListener('click', function() {
    var url = chrome.runtime.getURL('popup/popup.html') + '?tab=1';
    chrome.tabs.create({ url: url });
  });

  /* ── Render ─────────────────────────────────────────────── */
  async function renderList(filter) {
    filter = filter || '';
    var aliases = await Storage.getAliases();
    currentAliases = aliases;
    var entries = Object.values(aliases);
    var query = filter.toLowerCase();

    var categories = new Set();
    entries.forEach(function(e) { categories.add(e.category || 'Uncategorized'); });
    
    $categoryFilter.textContent = '';
    var allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Categories';
    $categoryFilter.appendChild(allOption);

    Array.from(categories).sort().forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (currentCategoryFilter === c) opt.selected = true;
      $categoryFilter.appendChild(opt);
    });

    $categorySuggestions.textContent = '';
    Array.from(categories).sort().forEach(function(c) {
      var chip = document.createElement('span');
      chip.className = 'category-chip';
      chip.textContent = c;
      chip.addEventListener('click', function() {
        $fieldCategory.value = c;
        updateActiveChips();
      });
      $categorySuggestions.appendChild(chip);
    });
    updateActiveChips();

    var filtered = query
      ? entries.filter(function (a) {
          return a.alias.toLowerCase().indexOf(query) !== -1 ||
                 a.displayName.toLowerCase().indexOf(query) !== -1 ||
                 a.url.toLowerCase().indexOf(query) !== -1;
        })
      : entries;

    if (currentCategoryFilter) {
      filtered = filtered.filter(function(a) { return (a.category || 'Uncategorized') === currentCategoryFilter; });
    }

    filtered.sort(function (a, b) {
      if (currentSortMode === 'recent') {
        var aTime = a.createdAt || 0;
        var bTime = b.createdAt || 0;
        if (bTime !== aTime) return bTime - aTime;
      } else if (currentSortMode === 'most_used') {
        var countA = a.useCount || 0;
        var countB = b.useCount || 0;
        if (countB !== countA) return countB - countA;
      }
      return a.alias.localeCompare(b.alias);
    });

    $list.textContent = '';
    $count.textContent = entries.length + ' alias' + (entries.length !== 1 ? 'es' : '');

    if (entries.length === 0) {
      $empty.classList.remove('hidden');
      $list.classList.add('hidden');
      return;
    }

    $empty.classList.add('hidden');
    $list.classList.remove('hidden');

    if (filtered.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.style.padding = '24px';
      var p = document.createElement('p');
      p.textContent = 'No matches found.';
      emptyDiv.appendChild(p);
      $list.appendChild(emptyDiv);
      return;
    }

    var fragment = document.createDocumentFragment();

    var template = document.getElementById('alias-item-template');
    filtered.forEach(function (entry, i) {
      var clone = template.content.cloneNode(true);
      var el = clone.querySelector('.alias-item');
      
      el.style.animationDelay = (i * 30) + 'ms';
      el.setAttribute('data-url', entry.url);
      el.setAttribute('data-alias', entry.alias);

      var faviconUrl = Favicon.getFaviconUrl(entry.url);
      var hue = Favicon.hashToHue(entry.displayName);
      var initials = Favicon.getInitials(entry.displayName);

      var img = el.querySelector('.alias-item__icon');
      var avatar = el.querySelector('.alias-item__avatar');
      var nameText = el.querySelector('.name-text');
      var catSpan = el.querySelector('.alias-item__category');
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
      catSpan.textContent = entry.category || 'Uncategorized';
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
          $fieldCategory.value = entry.category || 'Uncategorized';
          $fieldUrl.value = entry.url;
        }
      });
    } else {
      var isTab = window.location.search.indexOf('tab=1') !== -1;
      if (!isTab) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs && tabs[0]) {
            $fieldName.value = tabs[0].title || '';
            $fieldUrl.value  = tabs[0].url   || '';
          }
        });
      }
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

  $fieldCategory.addEventListener('input', updateActiveChips);

  function updateActiveChips() {
    var val = $fieldCategory.value.trim();
    var chips = $categorySuggestions.querySelectorAll('.category-chip');
    chips.forEach(function(chip) {
      if (chip.textContent === val) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  /* ── Save ────────────────────────────────────────────────── */
  $form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var alias = $fieldAlias.value.trim().toLowerCase();
    var url = $fieldUrl.value.trim();
    var displayName = $fieldName.value.trim();
    var category = $fieldCategory.value.trim() || 'Uncategorized';

    if (!alias || !url || !displayName) return;
    
    // Handle rename: if editing and alias changed, delete old entry
    if (editingAlias && editingAlias !== alias) {
      await Storage.deleteAlias(editingAlias);
    }

    await Storage.setAlias(alias, {
      displayName: displayName,
      url: url,
      category: category,
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
      var clickedAlias = item.dataset.alias;
      if (url) {
        if (clickedAlias) await Storage.incrementUsage(clickedAlias);
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
      window.close();
    }, 1000);
  });

  /* ── Import ─────────────────────────────────────────────── */
  $btnImport.addEventListener('click', function () {
    var importUrl = chrome.runtime.getURL('import.html');
    chrome.tabs.create({ url: importUrl });
  });

  /* ── View Mode ─────────────────────────────────────────── */
  async function initViewMode() {
    var data = await chrome.storage.local.get('wa_view_mode');
    currentViewMode = data.wa_view_mode || 'list';
    applyViewMode();
  }

  function applyViewMode() {
    document.documentElement.setAttribute('data-view', currentViewMode);
    if (currentViewMode === 'grid') {
      $list.classList.add('alias-list--grid');
    } else {
      $list.classList.remove('alias-list--grid');
    }
  }

  $btnView.addEventListener('click', async function () {
    currentViewMode = currentViewMode === 'list' ? 'grid' : 'list';
    await chrome.storage.local.set({ 'wa_view_mode': currentViewMode });
    applyViewMode();
  });

  /* ── Sort Mode ─────────────────────────────────────────── */
  async function initSortMode() {
    var data = await chrome.storage.local.get('wa_sort_mode');
    currentSortMode = data.wa_sort_mode || 'most_used';
    $sortSelect.value = currentSortMode;
  }

  $sortSelect.addEventListener('change', async function () {
    currentSortMode = $sortSelect.value;
    await chrome.storage.local.set({ 'wa_sort_mode': currentSortMode });
    renderList($search.value.trim());
  });

  $categoryFilter.addEventListener('change', function () {
    currentCategoryFilter = $categoryFilter.value;
    renderList($search.value.trim());
  });

  /* ── Resize ───────────────────────────────────────────── */
  function initPopupSize() {
    chrome.storage.local.get(['wa_popup_w', 'wa_popup_h'], function(data) {
      if (data.wa_popup_w) {
        document.documentElement.style.width = data.wa_popup_w + 'px';
        document.body.style.width = data.wa_popup_w + 'px';
      }
      if (data.wa_popup_h) {
        document.documentElement.style.height = data.wa_popup_h + 'px';
        document.body.style.height = data.wa_popup_h + 'px';
      }
    });
  }

  $resizeHandle.addEventListener('mousedown', function(e) {
    setupResize(e, false);
  });

  $resizeHandleLeft.addEventListener('mousedown', function(e) {
    setupResize(e, true);
  });

  function setupResize(e, isLeft) {
    e.preventDefault();
    document.documentElement.classList.add('resizing');
    var startX = e.screenX;
    var startY = e.screenY;
    var startW = document.documentElement.offsetWidth;
    var startH = document.documentElement.offsetHeight;

    function onMouseMove(ee) {
      var diffX = ee.screenX - startX;
      var diffY = ee.screenY - startY;
      
      var newW = isLeft ? (startW - diffX) : (startW + diffX);
      var newH = startH + diffY;

      newW = Math.min(800, Math.max(500, newW));
      newH = Math.min(600, Math.max(420, newH));

      document.documentElement.style.width = newW + 'px';
      document.body.style.width = newW + 'px';
      document.documentElement.style.height = newH + 'px';
      document.body.style.height = newH + 'px';
    }

    function onMouseUp() {
      document.documentElement.classList.remove('resizing');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      chrome.storage.local.set({
        wa_popup_w: document.documentElement.offsetWidth,
        wa_popup_h: document.documentElement.offsetHeight
      });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

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
