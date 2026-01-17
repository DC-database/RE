/* --- tenants.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let editingId = null;

  function getActiveContractForTenant(tenantId) {
    const contracts = S.getAll('contracts');
    return contracts.find((c) => S.isContractActive(c) && String(c.tenantId) === String(tenantId)) || null;
  }

  function render() {
    const tbody = qs('#tenantsBody');
    const tenants = S.getAll('tenants');
    tbody.innerHTML = tenants
      .map((t) => {
        const active = getActiveContractForTenant(t.id);
        const prop = active ? S.getById('properties', active.propertyId) : null;
        const status = active ? 'Active' : 'Inactive';
        return `
          <tr>
            <td><strong>${t.name || '--'}</strong></td>
            <td>${t.phone || '--'}</td>
            <td>${t.email || '--'}</td>
            <td>${t.idNumber || '--'}</td>
            <td>${prop ? prop.unitNo : '--'}</td>
            <td><span class="badge ${active ? 'occupied' : 'vacant'}">${status}</span></td>
            <td>
              <button class="action-btn btn-view" data-act="contracts" data-id="${t.id}" title="View Contracts">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn btn-edit" data-act="edit" data-id="${t.id}" title="Edit">
                <i class="fas fa-pen"></i>
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
        if (act === 'contracts') {
          location.href = `contracts.html#tenant=${encodeURIComponent(id)}`;
          return;
        }
        openEdit(id);
      });
    });

    const hash = new URLSearchParams((location.hash || '').replace('#', ''));
    const hashId = hash.get('id');
    if (hashId) {
      openEdit(hashId);
      history.replaceState(null, '', 'tenants.html');
    }
  }

  function clearForm() {
    qs('#t_name').value = '';
    qs('#t_phone').value = '';
    qs('#t_email').value = '';
    qs('#t_id').value = '';
    qs('#t_notes').value = '';
  }

  function openNew() {
    editingId = null;
    clearForm();
    qs('#deleteTenant').style.display = 'none';
    openModal('#tenantModal');
  }

  function openEdit(id) {
    const t = S.getById('tenants', id);
    if (!t) return;
    editingId = t.id;
    qs('#t_name').value = t.name || '';
    qs('#t_phone').value = t.phone || '';
    qs('#t_email').value = t.email || '';
    qs('#t_id').value = t.idNumber || '';
    qs('#t_notes').value = t.notes || '';
    qs('#deleteTenant').style.display = 'inline-flex';
    openModal('#tenantModal');
  }

  function save() {
    const name = qs('#t_name').value.trim();
    if (!name) {
      toast('Name is required', 'error');
      return;
    }
    const phone = qs('#t_phone').value.trim();
    const email = qs('#t_email').value.trim();
    const idNumber = qs('#t_id').value.trim();
    const notes = qs('#t_notes').value.trim();

    S.upsert('tenants', { id: editingId, name, phone, email, idNumber, notes });
    toast('Tenant saved', 'success');
    closeModal('#tenantModal');
    render();
  }

  function del() {
    if (!editingId) return;
    const active = getActiveContractForTenant(editingId);
    if (active) {
      toast('Cannot delete: tenant has an active contract', 'error');
      return;
    }
    if (!confirmDialog('Delete this tenant?')) return;
    S.removeById('tenants', editingId);
    toast('Tenant deleted', 'success');
    closeModal('#tenantModal');
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireModalOverlayClose('#tenantModal');
    qs('#btnAddTenant').addEventListener('click', openNew);
    qs('#closeTenantModal').addEventListener('click', () => closeModal('#tenantModal'));
    qs('#cancelTenant').addEventListener('click', () => closeModal('#tenantModal'));
    qs('#saveTenant').addEventListener('click', save);
    qs('#deleteTenant').addEventListener('click', del);
    render();
  });
})();
