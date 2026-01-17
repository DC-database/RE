/* --- analytics.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, money, fmtDate } = U;

  function monthKey(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  function sumPaymentsForMonth(key) {
    const payments = S.getAll('payments').filter((p) => p.status === 'Received');
    return payments
      .filter((p) => (p.date || '').slice(0, 7) === key)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  function sumMaintenanceForMonth(key) {
    const jobs = S.getAll('maintenanceJobs');
    return jobs
      .filter((j) => (j.requestDate || '').slice(0, 7) === key)
      .reduce((sum, j) => sum + S.computeMaintenanceTotal(j), 0);
  }

  function renderStats() {
    const props = S.getAll('properties');
    const tenants = S.getAll('tenants');
    const contracts = S.getAll('contracts');
    const activeContracts = contracts.filter(S.isContractActive);
    const occupied = props.filter((p) => S.getActiveContractByProperty(p.id)).length;
    const vacant = props.length - occupied;

    const activeTenants = tenants.filter((t) => activeContracts.some((c) => String(c.tenantId) === String(t.id))).length;

    const now = new Date();
    const thisMonth = monthKey(now);
    const last = new Date(now);
    last.setMonth(last.getMonth() - 1);
    const lastMonth = monthKey(last);

    const payThis = sumPaymentsForMonth(thisMonth);
    const payLast = sumPaymentsForMonth(lastMonth);
    const maintThis = sumMaintenanceForMonth(thisMonth);

    qs('#analyticsStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-info"><h3>${props.length}</h3><p>Total Units</p></div>
        <div class="icon-box icon-purple"><i class="fas fa-building"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><h3>${occupied}</h3><p>Occupied</p></div>
        <div class="icon-box icon-green"><i class="fas fa-door-open"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><h3>${vacant}</h3><p>Vacant</p></div>
        <div class="icon-box icon-red"><i class="fas fa-key"></i></div>
      </div>
    `;

    const chips = document.createElement('div');
    chips.style.marginTop = '10px';
    chips.innerHTML = `
      <span class="chip"><i class="fas fa-users"></i> Active Tenants: <strong>${activeTenants}</strong></span>
      <span class="chip" style="margin-left:10px;"><i class="fas fa-file-contract"></i> Active Contracts: <strong>${activeContracts.length}</strong></span>
      <span class="chip" style="margin-left:10px;"><i class="fas fa-wallet"></i> Payments (${thisMonth}): <strong>${money(payThis)}</strong></span>
      <span class="chip" style="margin-left:10px;"><i class="fas fa-chart-line"></i> Payments (${lastMonth}): <strong>${money(payLast)}</strong></span>
      <span class="chip" style="margin-left:10px;"><i class="fas fa-tools"></i> Maintenance (${thisMonth}): <strong>${money(maintThis)}</strong></span>
    `;
    qs('#analyticsStats').appendChild(chips);
  }

  function renderExpiry() {
    const tbody = qs('#expiryBody');
    const contracts = S.getAll('contracts');
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 60);

    const soon = contracts
      .filter((c) => {
        const end = new Date(c.endDate + 'T00:00:00');
        return end >= now && end <= cutoff;
      })
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    tbody.innerHTML = (soon.length ? soon : []).slice(0, 20).map((c) => {
      const p = S.getById('properties', c.propertyId);
      const t = S.getById('tenants', c.tenantId);
      const active = S.isContractActive(c);
      return `
        <tr>
          <td><strong>${c.contractNo}</strong></td>
          <td>${p ? p.unitNo : '--'}</td>
          <td>${t ? t.name : '--'}</td>
          <td class="nowrap">${fmtDate(c.endDate)}</td>
          <td><span class="badge ${active ? 'occupied' : 'vacant'}">${active ? 'Active' : 'Inactive'}</span></td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="5" class="muted">No contracts expiring in the next 60 days.</td></tr>`;
  }

  function renderTopRent() {
    const tbody = qs('#topRentBody');
    const props = S.getAll('properties')
      .slice()
      .sort((a, b) => (Number(b.monthlyRent) || 0) - (Number(a.monthlyRent) || 0))
      .slice(0, 10);

    tbody.innerHTML = props.map((p) => `
      <tr>
        <td><strong>${p.unitNo}</strong></td>
        <td>${p.type || '--'}</td>
        <td>${p.location || '--'}</td>
        <td class="nowrap">${money(p.monthlyRent)}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="muted">No properties yet.</td></tr>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStats();
    renderExpiry();
    renderTopRent();
  });
})();
