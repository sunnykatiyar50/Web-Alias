(function () {
  'use strict';
  
  var $fileImport = document.getElementById('file-import');
  var $status = document.getElementById('status');
  var $error = document.getElementById('error');
  var Storage = window.AliasStorage;

  $fileImport.addEventListener('change', async function (e) {
    var file = e.target.files[0];
    if (!file) return;

    $status.textContent = '';
    $error.textContent = '';

    try {
      var text = await file.text();
      var result = await Storage.importAliases(text, 'merge');
      $status.textContent = 'Successfully imported ' + result.count + ' aliases. You can safely close this tab.';
      setTimeout(function() {
        window.close();
      }, 3000);
    } catch (err) {
      $error.textContent = 'Import failed: invalid JSON file.';
    }

    $fileImport.value = '';
  });
})();
