/* --- settings.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  const A = window.IBAAuth;
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

    // --- Admin-only: create user accounts ---
    try {
      const user = A && A.getUser ? A.getUser() : null;
      if (user && A && typeof A.isAdmin === 'function' && A.isAdmin()) {
        const adminSection = qs('#adminSection');
        if (adminSection) adminSection.style.display = 'block';

        const { openModal, closeModal, wireModalOverlayClose } = U;
        wireModalOverlayClose('#userModal');

        const open = () => {
          qs('#newUserEmail').value = '';
          qs('#newUserPassword').value = '';
          qs('#newUserConfirm').value = '';
          openModal('#userModal');
        };

        const close = () => closeModal('#userModal');

        qs('#btnOpenUserModal').addEventListener('click', open);
        qs('#btnCloseUserModal').addEventListener('click', close);
        qs('#btnCancelUserModal').addEventListener('click', close);

        qs('#btnCreateUser').addEventListener('click', async () => {
          const email = (qs('#newUserEmail').value || '').trim();
          const pass = qs('#newUserPassword').value || '';
          const conf = qs('#newUserConfirm').value || '';

          if (!email) return toast('Email is required', 'error');
          if (!pass || pass.length < 6) return toast('Password must be at least 6 characters', 'error');
          if (pass !== conf) return toast('Passwords do not match', 'error');

          try {
            await A.adminCreateUser(email, pass);
            toast('User created. They can login now.', 'success');
            close();
          } catch (e) {
            toast(e?.message || 'Failed to create user', 'error');
            console.error(e);
          }
        });
      }
    } catch (e) {
      console.warn('Admin section init failed:', e);
    }
  });
})();
