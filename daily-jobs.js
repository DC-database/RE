/* --- daily-jobs.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, fmtDate, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let editingId = null;

  function render() {
    const tbody = qs('#dailyBody');
    const jobs = S.getAll('dailyJobs');
    tbody.innerHTML = jobs
      .map((j) => {
        const statusClass = j.status === 'Done' ? 'occupied' : (j.priority === 'Urgent' || j.priority === 'Emergency') ? 'vacant' : 'badge';
        return `
          <tr>
            <td class="nowrap">${fmtDate(j.date)}</td>
            <td><strong>${j.title || ''}</strong></td>
            <td>${j.assignedTo || '--'}</td>
            <td>${j.priority || '--'}</td>
            <td><span class="badge ${statusClass}">${j.status || 'Open'}</span></td>
            <td>
              <button class="action-btn btn-edit" data-id="${j.id}"><i class="fas fa-pen"></i></button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => openEdit(b.getAttribute('data-id'))));
  }

  function clearForm() {
    editingId = null;
    qs('#d_date').value = new Date().toISOString().slice(0, 10);
    qs('#d_assigned').value = 'Admin';
    qs('#d_priority').value = 'Normal';
    qs('#d_title').value = '';
    qs('#d_status').value = 'Open';
    qs('#d_notes').value = '';
    qs('#deleteDaily').style.display = 'none';
  }

  function openNew() {
    clearForm();
    openModal('#dailyModal');
  }

  function openEdit(id) {
    const j = S.getById('dailyJobs', id);
    if (!j) return;
    editingId = j.id;
    qs('#d_date').value = j.date || '';
    qs('#d_assigned').value = j.assignedTo || '';
    qs('#d_priority').value = j.priority || 'Normal';
    qs('#d_title').value = j.title || '';
    qs('#d_status').value = j.status || 'Open';
    qs('#d_notes').value = j.notes || '';
    qs('#deleteDaily').style.display = 'inline-flex';
    openModal('#dailyModal');
  }

  async function save() {
    const date = qs('#d_date').value;
    const title = qs('#d_title').value.trim();
    if (!date || !title) {
      toast('Date and Job Title are required', 'error');
      return;
    }

    const assignedTo = qs('#d_assigned').value.trim();
    const priority = qs('#d_priority').value;
    const status = qs('#d_status').value;
    const notes = qs('#d_notes').value.trim();

    await S.upsert('dailyJobs', { id: editingId, date, title, assignedTo, priority, status, notes });
    toast('Daily job saved', 'success');
    closeModal('#dailyModal');
    render();
  }

  async function del() {
    if (!editingId) return;
    if (!confirmDialog('Delete this daily job?')) return;
    await S.removeById('dailyJobs', editingId);
    toast('Deleted', 'success');
    closeModal('#dailyModal');
    render();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await window.IBAReady;
    wireModalOverlayClose('#dailyModal');
    qs('#btnAddDaily').addEventListener('click', openNew);
    qs('#closeDailyModal').addEventListener('click', () => closeModal('#dailyModal'));
    qs('#cancelDaily').addEventListener('click', () => closeModal('#dailyModal'));
    qs('#saveDaily').addEventListener('click', save);
    qs('#deleteDaily').addEventListener('click', del);
    render();
  });
})();
