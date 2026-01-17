/* --- payments.js --- */

(function () {
  const S = window.IBAStore;
  const U = window.IBACommon;
  if (!S || !U) return;

  const { qs, money, fmtDate, toast, openModal, closeModal, wireModalOverlayClose, confirmDialog } = U;

  let editingId = null;
  let filterContractId = null;

  function populateContracts(selectedId = null) {
    const contracts = S.getAll('contracts');
    const opts = contracts.map((c) => {
      const p = S.getById('properties', c.propertyId);
      const t = S.getById('tenants', c.tenantId);
      const label = `${c.contractNo} · ${p ? p.unitNo : '--'} · ${t ? t.name : '--'}`;
      return `<option value="${c.id}">${label}</option>`;
    }).join('');
    qs('#pay_contract').innerHTML = opts || '<option value="">No contracts</option>';
    if (selectedId) qs('#pay_contract').value = String(selectedId);
    updateContextChip();
  }

  function updateContextChip() {
    const id = qs('#pay_contract').value;
    const chip = qs('#pay_context');
    if (!id) {
      chip.textContent = 'Select a contract to see tenant/property';
      return;
    }
    const c = S.getById('contracts', id);
    const p = c ? S.getById('properties', c.propertyId) : null;
    const t = c ? S.getById('tenants', c.tenantId) : null;
    chip.innerHTML = `<i class="fas fa-user"></i> ${t ? t.name : '--'} &nbsp; | &nbsp; <i class="fas fa-building"></i> ${p ? p.unitNo : '--'}`;
  }

  function render() {
    const tbody = qs('#paymentsBody');
    let payments = S.getAll('payments');
    if (filterContractId) payments = payments.filter((p) => String(p.contractId) === String(filterContractId));

    tbody.innerHTML = payments
      .map((pmt) => {
        const c = S.getById('contracts', pmt.contractId);
        const prop = c ? S.getById('properties', c.propertyId) : null;
        const tenant = c ? S.getById('tenants', c.tenantId) : null;
        const statusClass = pmt.status === 'Received' ? 'occupied' : 'vacant';
        return `
          <tr>
            <td class="nowrap">${fmtDate(pmt.date)}</td>
            <td>${tenant ? tenant.name : '--'}</td>
            <td>${prop ? prop.unitNo : '--'}</td>
            <td><strong>${c ? c.contractNo : '--'}</strong></td>
            <td class="nowrap">${money(pmt.amount)}</td>
            <td>${pmt.method || '--'}</td>
            <td><span class="badge ${statusClass}">${pmt.status || 'Pending'}</span></td>
            <td>
              <button class="action-btn btn-edit" data-id="${pmt.id}"><i class="fas fa-pen"></i></button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => openEdit(b.getAttribute('data-id'))));
  }

  function clearForm() {
    editingId = null;
    qs('#pay_date').value = new Date().toISOString().slice(0, 10);
    qs('#pay_amount').value = '';
    qs('#pay_status').value = 'Received';
    qs('#pay_method').value = 'Bank Transfer';
    qs('#pay_ref').value = '';
    qs('#pay_notes').value = '';
    qs('#deletePayment').style.display = 'none';
  }

  function openNew() {
    clearForm();
    populateContracts(filterContractId || null);
    openModal('#paymentModal');
  }

  function openEdit(id) {
    const p = S.getById('payments', id);
    if (!p) return;
    editingId = p.id;
    qs('#pay_date').value = p.date || '';
    qs('#pay_amount').value = Number(p.amount) || '';
    qs('#pay_status').value = p.status || 'Received';
    qs('#pay_method').value = p.method || 'Bank Transfer';
    qs('#pay_ref').value = p.reference || '';
    qs('#pay_notes').value = p.notes || '';
    populateContracts(p.contractId);
    qs('#deletePayment').style.display = 'inline-flex';
    openModal('#paymentModal');
  }

  async function save() {
    const date = qs('#pay_date').value;
    const contractId = qs('#pay_contract').value;
    const amount = Number(qs('#pay_amount').value) || 0;
    const status = qs('#pay_status').value;
    const method = qs('#pay_method').value;
    const reference = qs('#pay_ref').value.trim();
    const notes = qs('#pay_notes').value.trim();

    if (!date || !contractId || amount <= 0) {
      toast('Date, Contract and Amount are required', 'error');
      return;
    }

    await S.upsert('payments', { id: editingId, date, contractId, amount, status, method, reference, notes });
    toast('Payment saved', 'success');
    closeModal('#paymentModal');
    render();
  }

  async function del() {
    if (!editingId) return;
    if (!confirmDialog('Delete this payment?')) return;
    await S.removeById('payments', editingId);
    toast('Payment deleted', 'success');
    closeModal('#paymentModal');
    render();
  }

  function parseHash() {
    const raw = (location.hash || '').replace('#', '');
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const contract = params.get('contract');
    if (contract) filterContractId = contract;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await window.IBAReady;
    parseHash();
    wireModalOverlayClose('#paymentModal');
    qs('#btnAddPayment').addEventListener('click', openNew);
    qs('#closePaymentModal').addEventListener('click', () => closeModal('#paymentModal'));
    qs('#cancelPayment').addEventListener('click', () => closeModal('#paymentModal'));
    qs('#savePayment').addEventListener('click', save);
    qs('#deletePayment').addEventListener('click', del);
    qs('#pay_contract').addEventListener('change', updateContextChip);

    render();
  });
})();
