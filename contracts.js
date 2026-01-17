/* --- contracts.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, money, fmtDate, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let editingId = null;
  let filterPropertyId = null;
  let filterTenantId = null;

  function updateStatusPreview() {
    const start = qs('#cf_startDate').value;
    const end = qs('#cf_endDate').value;
    if (!start || !end) {
      qs('#cf_status').value = '—';
      return;
    }
    const c = { startDate: start, endDate: end };
    qs('#cf_status').value = S.isContractActive(c) ? 'Active' : 'Inactive';
  }

  function populateSelectors(selectedPropertyId, selectedTenantId) {
    const props = S.getAll('properties');
    const tenants = S.getAll('tenants');
    qs('#cf_property').innerHTML = props.map((p) => `<option value="${p.id}">${p.unitNo} (${p.type})</option>`).join('');
    qs('#cf_tenant').innerHTML = tenants.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');

    if (selectedPropertyId) qs('#cf_property').value = String(selectedPropertyId);
    if (selectedTenantId) qs('#cf_tenant').value = String(selectedTenantId);

    const p = S.getById('properties', qs('#cf_property').value);
    if (p && !editingId) qs('#cf_rent').value = Number(p.monthlyRent) || '';
  }

  function render() {
    const tbody = qs('#contractsBody');
    let contracts = S.getAll('contracts');

    if (filterPropertyId) contracts = contracts.filter((c) => String(c.propertyId) === String(filterPropertyId));
    if (filterTenantId) contracts = contracts.filter((c) => String(c.tenantId) === String(filterTenantId));

    tbody.innerHTML = contracts
      .map((c) => {
        const p = S.getById('properties', c.propertyId);
        const t = S.getById('tenants', c.tenantId);
        const active = S.isContractActive(c);
        return `
          <tr>
            <td><strong>${c.contractNo || '--'}</strong></td>
            <td>${p ? p.unitNo : '--'}</td>
            <td>${t ? t.name : '--'}</td>
            <td class="nowrap">${fmtDate(c.startDate)}</td>
            <td class="nowrap">${fmtDate(c.endDate)}</td>
            <td class="nowrap">${money(c.rent)}</td>
            <td><span class="badge ${active ? 'occupied' : 'vacant'}">${active ? 'Active' : 'Inactive'}</span></td>
            <td>
              <button class="action-btn btn-view" data-act="payments" data-id="${c.id}" title="Payments">
                <i class="fas fa-wallet"></i>
              </button>
              <button class="action-btn btn-edit" data-act="edit" data-id="${c.id}" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.getAttribute('data-act');
        const id = b.getAttribute('data-id');
        if (act === 'payments') {
          location.href = `payments.html#contract=${encodeURIComponent(id)}`;
          return;
        }
        openEdit(id);
      });
    });
  }

  function clearForm() {
    editingId = null;
    const db = S.loadDB();
    const nextNo = `CTR-${String((db.meta.lastCode.contracts || 0) + 1).padStart(5, '0')}`;
    qs('#cf_contractNo').value = nextNo;
    qs('#cf_startDate').value = '';
    qs('#cf_endDate').value = '';
    qs('#cf_rent').value = '';
    qs('#cf_deposit').value = '';
    qs('#cf_notes').value = '';
    qs('#deleteContractFull').style.display = 'none';
    updateStatusPreview();
  }

  function openNew(prefPropertyId = null, prefTenantId = null) {
    clearForm();
    populateSelectors(prefPropertyId, prefTenantId);
    // default dates
    const now = new Date();
    const start = now.toISOString().slice(0, 10);
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    qs('#cf_startDate').value = start;
    qs('#cf_endDate').value = end.toISOString().slice(0, 10);
    updateStatusPreview();
    openModal('#contractModalFull');
  }

  function openEdit(id) {
    const c = S.getById('contracts', id);
    if (!c) return;
    editingId = c.id;
    qs('#cf_contractNo').value = c.contractNo || '';
    qs('#cf_startDate').value = c.startDate || '';
    qs('#cf_endDate').value = c.endDate || '';
    qs('#cf_rent').value = Number(c.rent) || '';
    qs('#cf_deposit').value = Number(c.deposit) || '';
    qs('#cf_notes').value = c.notes || '';
    populateSelectors(c.propertyId, c.tenantId);
    qs('#deleteContractFull').style.display = 'inline-flex';
    updateStatusPreview();
    openModal('#contractModalFull');
  }

  function save() {
    const propertyId = qs('#cf_property').value;
    const tenantId = qs('#cf_tenant').value;
    const startDate = qs('#cf_startDate').value;
    const endDate = qs('#cf_endDate').value;
    const rent = Number(qs('#cf_rent').value) || 0;
    const deposit = Number(qs('#cf_deposit').value) || 0;
    const notes = qs('#cf_notes').value.trim();

    if (!propertyId || !tenantId || !startDate || !endDate) {
      toast('Please fill all required fields', 'error');
      return;
    }

    const activeExisting = S.getActiveContractByProperty(propertyId);
    if (activeExisting && String(activeExisting.id) !== String(editingId)) {
      toast('This property already has an active contract.', 'error');
      return;
    }

    const payload = {
      id: editingId,
      contractNo: qs('#cf_contractNo').value,
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
    closeModal('#contractModalFull');
    render();
  }

  function del() {
    if (!editingId) return;
    const hasPayments = S.getAll('payments').some((p) => String(p.contractId) === String(editingId));
    if (hasPayments) {
      toast('Cannot delete: payments exist for this contract (delete payments first).', 'error');
      return;
    }
    if (!confirmDialog('Delete this contract?')) return;
    S.removeById('contracts', editingId);
    toast('Contract deleted', 'success');
    closeModal('#contractModalFull');
    render();
  }

  function parseHashIntent() {
    const raw = (location.hash || '').replace('#', '');
    if (!raw) return;
    // support "#new&property=1" and "#id=3" and "#tenant=2"
    const parts = raw.split('&');
    const isNew = parts.includes('new');
    const params = new URLSearchParams(parts.filter((p) => p !== 'new').join('&'));
    const id = params.get('id');
    const prop = params.get('property');
    const tenant = params.get('tenant');

    if (prop) filterPropertyId = prop;
    if (tenant) filterTenantId = tenant;

    if (id) {
      openEdit(id);
      history.replaceState(null, '', 'contracts.html');
      return;
    }
    if (isNew) {
      openNew(prop, tenant);
      history.replaceState(null, '', 'contracts.html');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireModalOverlayClose('#contractModalFull');
    qs('#btnAddContract').addEventListener('click', () => openNew(filterPropertyId, filterTenantId));
    qs('#closeContractModalFull').addEventListener('click', () => closeModal('#contractModalFull'));
    qs('#cancelContractFull').addEventListener('click', () => closeModal('#contractModalFull'));
    qs('#saveContractFull').addEventListener('click', save);
    qs('#deleteContractFull').addEventListener('click', del);

    qs('#cf_startDate').addEventListener('change', updateStatusPreview);
    qs('#cf_endDate').addEventListener('change', updateStatusPreview);
    qs('#cf_property').addEventListener('change', () => {
      const p = S.getById('properties', qs('#cf_property').value);
      if (p && !editingId) qs('#cf_rent').value = Number(p.monthlyRent) || '';
    });

    parseHashIntent();
    render();
  });
})();
