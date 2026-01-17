/* --- app.js ---
   Global logic for all pages.

   This version:
   - Requires login (Firebase Auth) when Firebase is present.
   - Loads the demo DB from Firebase Realtime Database (per-user) when available.
*/

// A global promise that resolves when auth + DB are ready.
window.IBAReady = (async () => {
  try {
    // If Firebase Auth is present, require a user (except login.html).
    if (window.IBAAuth && typeof window.IBAAuth.requireAuth === 'function') {
      const user = await window.IBAAuth.requireAuth();
      if (!user) return null;
    }

    // Ensure the data store is ready (Firebase or local fallback).
    if (window.IBAStore && typeof window.IBAStore.ensureReady === 'function') {
      await window.IBAStore.ensureReady();
    }

    return (window.IBAAuth && typeof window.IBAAuth.getUser === 'function') ? window.IBAAuth.getUser() : null;
  } catch (e) {
    console.error('IBAReady failed:', e);
    return null;
  }
})();

document.addEventListener('DOMContentLoaded', async () => {
  await window.IBAReady;

  if (window.IBACommon && window.IBACommon.setActiveNav) {
    window.IBACommon.setActiveNav();
  }

  setupMobileShell();
  setupUserMenu();
  setupGlobalSearch();
});

function setupUserMenu() {
  const topBar = document.querySelector('.top-bar');
  if (!topBar) return;

  const user = window.IBAAuth && window.IBAAuth.getUser ? window.IBAAuth.getUser() : null;
  if (!user) return;

  let actions = topBar.querySelector('.topbar-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'topbar-actions';

    const searchBox = topBar.querySelector('.search-box');
    if (searchBox) searchBox.insertAdjacentElement('afterend', actions);
    else topBar.appendChild(actions);
  }

  if (!actions.querySelector('#btnLogout')) {
    const btn = document.createElement('button');
    btn.id = 'btnLogout';
    btn.type = 'button';
    btn.className = 'btn-secondary btn-logout';
    btn.innerHTML = `<i class="fas fa-right-from-bracket"></i><span class="hide-mobile">Logout</span>`;

    btn.addEventListener('click', async () => {
      try {
        await window.IBAAuth.logout();
      } finally {
        location.replace('login.html');
      }
    });

    const badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.title = user.email || 'Signed in';
    badge.innerHTML = `<i class="fas fa-circle-user"></i><span class="user-email">${user.email || 'User'}</span>`;

    actions.appendChild(badge);
    actions.appendChild(btn);

    // Update any page subtitle.
    const sub = topBar.querySelector('.sub-header');
    if (sub) sub.textContent = `Signed in as ${user.email || 'user'} (Firebase)`;
  }
}

function setupMobileShell() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    sidebar.insertAdjacentElement('afterend', backdrop);
  }

  const closeSidebar = () => document.body.classList.remove('sidebar-open');
  const toggleSidebar = () => document.body.classList.toggle('sidebar-open');

  backdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Add burger button into top-bar (mobile only via CSS)
  const topBar = document.querySelector('.top-bar');
  if (topBar && !topBar.querySelector('.burger-btn')) {
    const btn = document.createElement('button');
    btn.className = 'burger-btn';
    btn.type = 'button';
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    btn.addEventListener('click', toggleSidebar);

    const first = topBar.firstElementChild;
    if (first) {
      const left = document.createElement('div');
      left.className = 'topbar-left';
      left.appendChild(btn);
      left.appendChild(first);
      topBar.insertBefore(left, topBar.firstChild);
    } else {
      topBar.prepend(btn);
    }
  }

  // Close sidebar when navigating
  sidebar.querySelectorAll('a.menu-item').forEach((a) => {
    a.addEventListener('click', closeSidebar);
  });

  // Bottom mobile tab bar
  const tabs = [
    { href: 'index.html', icon: 'fa-chart-line', label: 'Home' },
    { href: 'contracts.html', icon: 'fa-file-contract', label: 'Contracts' },
    { href: 'maintenance.html', icon: 'fa-tools', label: 'Maintenance' },
    { href: 'payments.html', icon: 'fa-wallet', label: 'Payments' },
    { href: 'tenants.html', icon: 'fa-users', label: 'Tenants' },
  ];

  const currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  let bar = document.querySelector('.mobile-tabbar');
  if (!bar) {
    bar = document.createElement('nav');
    bar.className = 'mobile-tabbar';
    bar.innerHTML = tabs
      .map((t) => {
        const active = t.href.toLowerCase() === currentPage ? 'active' : '';
        return `<a href="${t.href}" class="${active}" aria-label="${t.label}">
                  <i class="fas ${t.icon}"></i>
                  <span>${t.label}</span>
                </a>`;
      })
      .join('');

    document.body.appendChild(bar);
    bar.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeSidebar));
  } else {
    bar.querySelectorAll('a').forEach((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      a.classList.toggle('active', href === currentPage);
      a.addEventListener('click', closeSidebar);
    });
  }
}

function setupGlobalSearch() {
  const searchInput = document.getElementById('globalSearch');
  if (!searchInput || !window.IBAStore || !window.IBACommon) return;

  const { fmtDate } = window.IBACommon;

  const wrap = searchInput.closest('.search-box');
  if (!wrap) return;

  let dropdown = wrap.querySelector('.search-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.style.display = 'none';
    wrap.appendChild(dropdown);
  }

  function renderResults(q) {
    const query = (q || '').trim().toLowerCase();
    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    const props = window.IBAStore.getAll('properties');
    const tenants = window.IBAStore.getAll('tenants');
    const contracts = window.IBAStore.getAll('contracts');

    const propHits = props.filter((p) => (p.unitNo || '').toLowerCase().includes(query)).slice(0, 5);
    const tenantHits = tenants.filter((t) => (t.name || '').toLowerCase().includes(query)).slice(0, 5);
    const contractHits = contracts
      .filter((c) => (c.contractNo || '').toLowerCase().includes(query))
      .slice(0, 5);

    const rows = [];
    propHits.forEach((p) =>
      rows.push({
        label: `Property: ${p.unitNo}`,
        sub: `${p.type} · ${p.location}`,
        href: `properties.html#id=${p.id}`,
      })
    );
    tenantHits.forEach((t) =>
      rows.push({
        label: `Tenant: ${t.name}`,
        sub: `${t.phone || ''}`,
        href: `tenants.html#id=${t.id}`,
      })
    );
    contractHits.forEach((c) =>
      rows.push({
        label: `Contract: ${c.contractNo}`,
        sub: `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`,
        href: `contracts.html#id=${c.id}`,
      })
    );

    dropdown.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<a class="search-item" href="${r.href}">
                  <div class="search-item-title">${r.label}</div>
                  <div class="search-item-sub">${r.sub}</div>
               </a>`
          )
          .join('')
      : `<div class="search-item search-empty">No results</div>`;

    dropdown.style.display = 'block';
  }

  searchInput.addEventListener('focus', () => {
    wrap.style.borderColor = '#FF9EAA';
    wrap.style.boxShadow = '0 0 0 3px rgba(255, 158, 170, 0.1)';
    renderResults(searchInput.value);
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      wrap.style.borderColor = '#e2e8f0';
      wrap.style.boxShadow = 'none';
      dropdown.style.display = 'none';
    }, 150);
  });

  searchInput.addEventListener('input', (e) => renderResults(e.target.value));
}
