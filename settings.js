/* --- settings.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, toast, confirmDialog } = U;

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function resetDemo() {
    if (!confirmDialog('Reset demo data? This will overwrite your current Firebase demo data (for this user).')) return;
    await S.resetDemo();
    toast('Demo data reset', 'success');
  }

  function exportJSON() {
    const text = S.exportJSON();
    downloadText(`iba-demo-data-${new Date().toISOString().slice(0,10)}.json`, text);
    toast('Exported JSON', 'success');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      (async () => {
        try {
          await S.importJSON(String(reader.result || ''));
          toast('Imported JSON', 'success');
        } catch (e) {
          toast(`Import failed: ${e.message || e}`, 'error');
        }
      })();
    };
    reader.readAsText(file);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await window.IBAReady;
    qs('#btnResetDemo').addEventListener('click', resetDemo);
    qs('#btnExport').addEventListener('click', exportJSON);
    qs('#importFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSON(f);
      e.target.value = '';
    });
  });
})();
