/* --- dashboard.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, money, fmtDate, toast, openModal, closeModal, wireModalOverlayClose } = U;

  function computeStats() {
    const properties = S.getAll('properties');
    const contracts = S.getAll('contracts');
    const tenants = S.getAll('tenants');
    const maintenance = S.getAll('maintenanceJobs');
    const payments = S.getAll('payments');

    const vacant = properties.filter((p) => !S.getActiveContractByProperty(p.id)).length;
    const activeContracts = contracts.filter(S.isContractActive).length;
    const activeTenants = tenants.filter((t) =>
      contracts.some((c) => S.isContractActive(c) && String(c.tenantId) === String(t.id))
    ).length;
    const pendingMaint = maintenance.filter((m) => m.status !== 'Completed').length;
    const paid30 = S.getAll('payments')
      .filter((p) => p.status === 'Received')
      .filter((p) => {
        const d = new Date(p.date + 'T00:00:00');
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { vacant, activeContracts, activeTenants, pendingMaint, paid30 };
  }

  function renderStats() {
    const el = qs('#statsRow');
    const st = computeStats();
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-info">
          <h3>${st.vacant}</h3>
          <p>Vacant Units</p>
        </div>
        <div class="icon-box icon-red"><i class="fas fa-key"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>${st.activeTenants}</h3>
          <p>Active Tenants</p>
        </div>
        <div class="icon-box icon-green"><i class="fas fa-users"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>${st.pendingMaint}</h3>
          <p>Pending Maintenance</p>
        </div>
        <div class="icon-box icon-purple"><i class="fas fa-tools"></i></div>
      </div>
    `;

    // Extra KPI row (optional) - small chips
    const chip = document.createElement('div');
    chip.style.marginTop = '10px';
    chip.innerHTML = `
      <span class="chip"><i class="fas fa-file-contract"></i> Active Contracts: <strong>${st.activeContracts}</strong></span>
      <span class="chip" style="margin-left:10px;"><i class="fas fa-coins"></i> Payments (30d): <strong>${money(st.paid30)}</strong></span>
    `;
    el.appendChild(chip);
  }

  function renderPropertyTable() {
    const tbody = qs('#dashboardPropertyBody');
    const properties = S.getAll('properties');
    const contracts = S.getAll('contracts');

    tbody.innerHTML = properties
      .map((p) => {
        const active = S.getActiveContractByProperty(p.id);
        const tenant = active ? S.getById('tenants', active.tenantId) : null;
        const occupied = Boolean(active);
        const rentStatus = active
          ? (S.hasRecentPaymentForContract(active.id) ? '<span class="text-paid">Paid</span>' : '<span class="text-pending">Pending</span>')
          : '--';

        return `
          <tr>
            <td><strong>${p.unitNo}</strong></td>
            <td><span class="badge ${occupied ? 'occupied' : 'vacant'}">${occupied ? 'Occupied' : 'Vacant'}</span></td>
            <td>${tenant ? tenant.name : '--'}</td>
            <td>${active ? fmtDate(active.endDate) : '--'}</td>
            <td>${rentStatus}</td>
            <td>
              <button class="action-btn btn-view" data-action="view" data-prop="${p.id}" title="View">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn btn-edit" data-action="contract" data-prop="${p.id}" title="Add/Edit Contract">
                <i class="fas fa-file-contract"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const propId = btn.getAttribute('data-prop');
        if (action === 'view') {
          location.href = `properties.html#id=${encodeURIComponent(propId)}`;
          return;
        }
        if (action === 'contract') {
          openQuickContract(propId);
        }
      });
    });
  }

  function renderMaintenanceTable() {
    const tbody = qs('#dashboardMaintenanceBody');
    const jobs = S.getAll('maintenanceJobs').slice(0, 6);
    tbody.innerHTML = jobs
      .map((j) => {
        const p = S.getById('properties', j.propertyId);
        const statusClass = j.status === 'Completed' ? 'occupied' : j.status === 'New' ? 'vacant' : 'badge';
        return `
          <tr>
            <td><strong>${j.jobNo}</strong></td>
            <td>${fmtDate(j.requestDate)}</td>
            <td>${p ? p.unitNo : '--'}</td>
            <td>${j.issue || ''}</td>
            <td><span class="badge ${statusClass}">${j.status}</span></td>
            <td class="nowrap">${money(S.computeMaintenanceTotal(j))}</td>
          </tr>
        `;
      })
      .join('');
  }

  // --- Quick Contract Modal ---
  let editingContractId = null;

  function populateContractSelectors(selectedPropertyId) {
    const props = S.getAll('properties');
    const tenants = S.getAll('tenants');

    const propSel = qs('#c_property');
    const tenantSel = qs('#c_tenant');

    propSel.innerHTML = props
      .map((p) => `<option value="${p.id}">${p.unitNo} (${p.type})</option>`)
      .join('');

    tenantSel.innerHTML = tenants
      .map((t) => `<option value="${t.id}">${t.name}</option>`)
      .join('');

    if (selectedPropertyId) propSel.value = String(selectedPropertyId);

    // auto-fill rent
    const p = S.getById('properties', propSel.value);
    if (p) qs('#c_rent').value = Number(p.monthlyRent) || '';
  }

  function openQuickContract(propertyId = null) {
    editingContractId = null;
    const db = S.loadDB();
    const nextNo = `CTR-${String((db.meta.lastCode.contracts || 0) + 1).padStart(5, '0')}`;
    qs('#c_contractNo').value = nextNo;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const start = `${yyyy}-${mm}-${dd}`;
    qs('#c_startDate').value = start;

    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    const ey = end.getFullYear();
    const em = String(end.getMonth() + 1).padStart(2, '0');
    const ed = String(end.getDate()).padStart(2, '0');
    qs('#c_endDate').value = `${ey}-${em}-${ed}`;

    qs('#c_deposit').value = '';
    qs('#c_notes').value = '';

    populateContractSelectors(propertyId);

    openModal('#contractModal');
  }

  function saveContract() {
    const propertyId = qs('#c_property').value;
    const tenantId = qs('#c_tenant').value;
    const startDate = qs('#c_startDate').value;
    const endDate = qs('#c_endDate').value;
    const rent = Number(qs('#c_rent').value) || 0;
    const deposit = Number(qs('#c_deposit').value) || 0;
    const notes = qs('#c_notes').value || '';

    if (!propertyId || !tenantId || !startDate || !endDate) {
      toast('Please fill all required fields', 'error');
      return;
    }

    // Prevent multiple active contracts for same property
    const existingActive = S.getActiveContractByProperty(propertyId);
    if (existingActive && !editingContractId) {
      toast('This property already has an active contract. Edit it from Contracts page.', 'error');
      return;
    }

    const payload = {
      id: editingContractId,
      contractNo: qs('#c_contractNo').value,
      propertyId,
      tenantId,
      startDate,
      endDate,
      rent,
      deposit,
      notes,
    };

    const saved = S.createContract(payload);
    toast(`Saved ${saved.contractNo}`, 'success');
    closeModal('#contractModal');
    renderAll();
  }

  function wireContractModal() {
    wireModalOverlayClose('#contractModal');
    qs('#btnQuickContract').addEventListener('click', () => openQuickContract());
    qs('#closeContractModal').addEventListener('click', () => closeModal('#contractModal'));
    qs('#cancelContract').addEventListener('click', () => closeModal('#contractModal'));
    qs('#saveContract').addEventListener('click', saveContract);

    qs('#c_property').addEventListener('change', () => {
      const p = S.getById('properties', qs('#c_property').value);
      if (p) qs('#c_rent').value = Number(p.monthlyRent) || '';
    });
  }

  function renderAll() {
    renderStats();
    renderPropertyTable();
    renderMaintenanceTable();
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireContractModal();
    renderAll();
  });
})();
