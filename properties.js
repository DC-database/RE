/* --- properties.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, money, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let editingId = null;

  function render() {
    const tbody = qs('#propertiesBody');
    const props = S.getAll('properties');
    tbody.innerHTML = props
      .map((p) => {
        const active = S.getActiveContractByProperty(p.id);
        const tenant = active ? S.getById('tenants', active.tenantId) : null;
        const occupied = Boolean(active);
        return `
          <tr>
            <td><strong>${p.unitNo}</strong></td>
            <td>${p.type || '--'}</td>
            <td>${p.location || '--'}</td>
            <td><span class="badge ${occupied ? 'occupied' : 'vacant'}">${occupied ? 'Occupied' : 'Vacant'}</span></td>
            <td class="nowrap">${money(p.monthlyRent)}</td>
            <td>${tenant ? tenant.name : '--'}</td>
            <td>
              <button class="action-btn btn-view" data-act="open" data-id="${p.id}" title="Open">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn btn-edit" data-act="edit" data-id="${p.id}" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
              <button class="action-btn" style="background:#e2e8f0; color:#0f172a;" data-act="contract" data-id="${p.id}" title="New Contract">
                <i class="fas fa-file-contract"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const act = b.getAttribute('data-act');
        if (act === 'open') {
          location.href = `contracts.html#property=${encodeURIComponent(id)}`;
          return;
        }
        if (act === 'contract') {
          location.href = `contracts.html#new&property=${encodeURIComponent(id)}`;
          return;
        }
        openEdit(id);
      });
    });

    // Open edit from hash
    const hash = new URLSearchParams((location.hash || '').replace('#', ''));
    const hashId = hash.get('id');
    if (hashId) {
      openEdit(hashId);
      history.replaceState(null, '', 'properties.html');
    }
  }

  function clearForm() {
    qs('#p_unitNo').value = '';
    qs('#p_type').value = 'Villa';
    qs('#p_location').value = '';
    qs('#p_rent').value = '';
    qs('#p_notes').value = '';
  }

  function openNew() {
    editingId = null;
    clearForm();
    qs('#deleteProperty').style.display = 'none';
    openModal('#propertyModal');
  }

  function openEdit(id) {
    const p = S.getById('properties', id);
    if (!p) return;
    editingId = p.id;
    qs('#p_unitNo').value = p.unitNo || '';
    qs('#p_type').value = p.type || 'Villa';
    qs('#p_location').value = p.location || '';
    qs('#p_rent').value = Number(p.monthlyRent) || '';
    qs('#p_notes').value = p.notes || '';
    qs('#deleteProperty').style.display = 'inline-flex';
    openModal('#propertyModal');
  }

  async function save() {
    const unitNo = qs('#p_unitNo').value.trim();
    const type = qs('#p_type').value;
    const locationText = qs('#p_location').value.trim();
    const rent = Number(qs('#p_rent').value) || 0;
    const notes = qs('#p_notes').value.trim();

    if (!unitNo) {
      toast('Unit No. is required', 'error');
      return;
    }

    await S.upsert('properties', { id: editingId, unitNo, type, location: locationText, monthlyRent: rent, notes });
    toast('Property saved', 'success');
    closeModal('#propertyModal');
    render();
  }

  async function del() {
    if (!editingId) return;
    const active = S.getActiveContractByProperty(editingId);
    if (active) {
      toast('Cannot delete: property has an active contract', 'error');
      return;
    }
    if (!confirmDialog('Delete this property?')) return;
    await S.removeById('properties', editingId);
    toast('Property deleted', 'success');
    closeModal('#propertyModal');
    render();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await window.IBAReady;
    wireModalOverlayClose('#propertyModal');
    qs('#btnAddProperty').addEventListener('click', openNew);
    qs('#closePropertyModal').addEventListener('click', () => closeModal('#propertyModal'));
    qs('#cancelProperty').addEventListener('click', () => closeModal('#propertyModal'));
    qs('#saveProperty').addEventListener('click', save);
    qs('#deleteProperty').addEventListener('click', del);
    render();
  });
})();
