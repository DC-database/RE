/* --- maintenance.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, qsa, money, fmtDate, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let activeTab = 'New';
  let editingId = null;

  function statusForTab(job) {
    if (activeTab === 'New') return job.status === 'New';
    if (activeTab === 'In Progress') return job.status === 'In Progress';
    return job.status === 'Completed';
  }

  function renderTable() {
    const tbody = qs('#maintenanceTableBody');
    const jobs = S.getAll('maintenanceJobs').filter(statusForTab);
    tbody.innerHTML = jobs
      .map((j) => {
        const p = S.getById('properties', j.propertyId);
        const total = S.computeMaintenanceTotal(j);
        const statusClass = j.status === 'Completed' ? 'occupied' : j.status === 'New' ? 'vacant' : '';
        return `
          <tr>
            <td><strong>${j.jobNo}</strong></td>
            <td class="nowrap">${fmtDate(j.requestDate)}</td>
            <td>${p ? p.unitNo : '--'}</td>
            <td>${j.issue || ''}</td>
            <td>${j.technician || '--'}</td>
            <td><span class="badge ${statusClass}">${j.status}</span></td>
            <td class="nowrap">${money(total)}</td>
            <td>
              <button class="action-btn btn-edit" data-id="${j.id}" title="Edit"><i class="fas fa-pen"></i></button>
            </td>
          </tr>
        `;
      })
      .join('') || `<tr><td colspan="8" class="muted">No items in this tab.</td></tr>`;

    tbody.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => openEdit(b.getAttribute('data-id'))));
  }

  function setTab(tab) {
    activeTab = tab;
    qsa('.tab-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    renderTable();
  }

  function populateProperties(selectedId = null) {
    const props = S.getAll('properties');
    qs('#m_property').innerHTML = props.map((p) => `<option value="${p.id}">${p.unitNo} (${p.type})</option>`).join('');
    if (selectedId) qs('#m_property').value = String(selectedId);
    updateTenantPreview();
  }

  function updateTenantPreview() {
    const propId = qs('#m_property').value;
    const active = propId ? S.getActiveContractByProperty(propId) : null;
    const tenant = active ? S.getById('tenants', active.tenantId) : null;
    qs('#m_tenant').value = tenant ? tenant.name : '—';
  }

  function newJobNo() {
    const jobs = S.getAll('maintenanceJobs');
    let max = 0;
    jobs.forEach((j) => {
      const m = String(j.jobNo || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return `JB-${String(max + 1).padStart(5, '0')}`;
  }

  function clearForm() {
    editingId = null;
    qs('#m_jobNo').value = newJobNo();
    qs('#m_date').value = new Date().toISOString().slice(0, 10);
    qs('#m_priority').value = 'Normal';
    qs('#m_status').value = 'New';
    qs('#m_tech').value = '';
    qs('#m_completion').value = '';
    qs('#m_issue').value = '';
    qs('#m_notes').value = '';
    qs('#m_labor').value = '0';
    qs('#materialTableBody').innerHTML = '';
    qs('#deleteMaintenance').style.display = 'none';
    updateTenantPreview();
    computeTotals();
  }

  function openNew() {
    clearForm();
    populateProperties();
    openModal('#maintenanceModal');
  }

  function openEdit(id) {
    const j = S.getById('maintenanceJobs', id);
    if (!j) return;
    editingId = j.id;
    qs('#m_jobNo').value = j.jobNo;
    qs('#m_date').value = j.requestDate || '';
    qs('#m_priority').value = j.priority || 'Normal';
    qs('#m_status').value = j.status || 'New';
    qs('#m_tech').value = j.technician || '';
    qs('#m_completion').value = j.completionDate || '';
    qs('#m_issue').value = j.issue || '';
    qs('#m_notes').value = j.notes || '';
    qs('#m_labor').value = String(Number(j.laborCost) || 0);

    populateProperties(j.propertyId);

    qs('#materialTableBody').innerHTML = '';
    (j.materials || []).forEach((m) => addMaterialRow(m));

    qs('#deleteMaintenance').style.display = 'inline-flex';
    computeTotals();
    openModal('#maintenanceModal');
  }

  function addMaterialRow(data = {}) {
    const tbody = qs('#materialTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="mat-code" value="${data.code ? String(data.code).replace(/"/g, '&quot;') : ''}" placeholder="MAT-001"></td>
      <td><input type="text" class="mat-name" value="${data.name ? String(data.name).replace(/"/g, '&quot;') : ''}" placeholder="Item"></td>
      <td><input type="number" class="mat-qty" min="0" step="1" value="${Number(data.qty) || 0}"></td>
      <td><input type="number" class="mat-unit" min="0" step="0.01" value="${Number(data.unitCost) || 0}"></td>
      <td class="nowrap mat-amount">${money((Number(data.qty) || 0) * (Number(data.unitCost) || 0))}</td>
      <td style="text-align:center;"><button class="material-del-btn" title="Delete"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);

    const inputs = tr.querySelectorAll('input');
    inputs.forEach((i) => i.addEventListener('input', computeTotals));
    tr.querySelector('button').addEventListener('click', () => {
      tr.remove();
      computeTotals();
    });
    computeTotals();
  }

  function readMaterials() {
    const rows = Array.from(qs('#materialTableBody').querySelectorAll('tr'));
    return rows
      .map((tr) => {
        const code = tr.querySelector('.mat-code').value.trim();
        const name = tr.querySelector('.mat-name').value.trim();
        const qty = Number(tr.querySelector('.mat-qty').value) || 0;
        const unitCost = Number(tr.querySelector('.mat-unit').value) || 0;
        if (!code && !name && qty === 0 && unitCost === 0) return null;
        return { code, name, qty, unitCost };
      })
      .filter(Boolean);
  }

  function computeTotals() {
    const rows = Array.from(qs('#materialTableBody').querySelectorAll('tr'));
    let materialsTotal = 0;
    rows.forEach((tr) => {
      const qty = Number(tr.querySelector('.mat-qty').value) || 0;
      const unit = Number(tr.querySelector('.mat-unit').value) || 0;
      const amount = qty * unit;
      materialsTotal += amount;
      const cell = tr.querySelector('.mat-amount');
      if (cell) cell.textContent = money(amount);
    });
    const labor = Number(qs('#m_labor').value) || 0;
    qs('#m_matTotal').value = money(materialsTotal);
    qs('#m_total').value = money(materialsTotal + labor);
  }

  async function save() {
    const jobNo = qs('#m_jobNo').value;
    const requestDate = qs('#m_date').value;
    const priority = qs('#m_priority').value;
    const propertyId = qs('#m_property').value;
    const status = qs('#m_status').value;
    const technician = qs('#m_tech').value.trim();
    const completionDate = qs('#m_completion').value;
    const issue = qs('#m_issue').value.trim();
    const notes = qs('#m_notes').value.trim();
    const laborCost = Number(qs('#m_labor').value) || 0;
    const materials = readMaterials();

    if (!requestDate || !propertyId || !issue) {
      toast('Please fill Date, Property and Issue', 'error');
      return;
    }
    if (status === 'Completed' && !completionDate) {
      toast('Please add completion date for Completed jobs', 'error');
      return;
    }

    const payload = {
      id: editingId,
      jobNo,
      requestDate,
      priority,
      propertyId,
      status,
      technician,
      completionDate: completionDate || '',
      issue,
      notes,
      laborCost,
      materials,
    };

    await S.createMaintenanceJob(payload);
    toast('Maintenance job saved', 'success');
    closeModal('#maintenanceModal');
    renderTable();
  }

  async function del() {
    if (!editingId) return;
    if (!confirmDialog('Delete this maintenance job?')) return;
    await S.removeById('maintenanceJobs', editingId);
    toast('Deleted', 'success');
    closeModal('#maintenanceModal');
    renderTable();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await window.IBAReady;
    wireModalOverlayClose('#maintenanceModal');

    qsa('.tab-btn').forEach((b) => b.addEventListener('click', () => setTab(b.getAttribute('data-tab'))));

    qs('#btnNewMaintenance').addEventListener('click', openNew);
    qs('#closeMaintenanceModal').addEventListener('click', () => closeModal('#maintenanceModal'));
    qs('#cancelMaintenance').addEventListener('click', () => closeModal('#maintenanceModal'));
    qs('#saveMaintenance').addEventListener('click', save);
    qs('#deleteMaintenance').addEventListener('click', del);

    qs('#btnAddMaterial').addEventListener('click', () => addMaterialRow());
    qs('#m_labor').addEventListener('input', computeTotals);
    qs('#m_property').addEventListener('change', updateTenantPreview);
    qs('#m_status').addEventListener('change', () => {
      const status = qs('#m_status').value;
      if (status !== 'Completed') {
        qs('#m_completion').value = '';
      } else if (!qs('#m_completion').value) {
        qs('#m_completion').value = new Date().toISOString().slice(0, 10);
      }
    });

    // initial
    populateProperties();
    setTab('New');
  });
})();
