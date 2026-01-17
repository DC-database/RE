/* --- common.js ---
   Shared UI helpers (modals, toasts, formatting).
*/

(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function money(amount) {
    const n = Number(amount) || 0;
    return `QAR ${n.toFixed(2)}`;
  }

  function fmtDate(iso) {
    if (!iso) return '--';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function toast(message, type = 'info') {
    let host = qs('#toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    host.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-hide');
      setTimeout(() => el.remove(), 250);
    }, 2400);
  }

  function openModal(modalId) {
    const modal = qs(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalId) {
    const modal = qs(modalId);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function wireModalOverlayClose(modalId) {
    const modal = qs(modalId);
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modalId);
    });
  }

  function confirmDialog(message) {
    // Keep it simple for demo.
    return window.confirm(message);
  }

  function setActiveNav() {
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    qsa('.menu-item').forEach((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      a.classList.toggle('active', href === page);
    });
  }

  window.IBACommon = {
    qs,
    qsa,
    money,
    fmtDate,
    toast,
    openModal,
    closeModal,
    wireModalOverlayClose,
    confirmDialog,
    setActiveNav,
  };
})();
