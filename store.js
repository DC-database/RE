/* --- store.js ---
   Firebase Realtime Database-backed data store for demo.

   Storage layout:
     /users/<uid>/db  -> the whole demo DB object (properties, tenants, ...)

   This is intentionally simple for demo.
*/

(function () {
  // Local fallback (in case Firebase isn't available)
  const FALLBACK_DB_KEY = 'iba_demo_db_v1';

  let _db = null;
  let _uid = null;
  let _readyPromise = null;

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function addMonthsISO(startISO, months) {
    const d = new Date(startISO + 'T00:00:00');
    const m = d.getMonth() + months;
    d.setMonth(m);
    if (d.getMonth() !== ((m % 12) + 12) % 12) d.setDate(0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function seedDemo() {
    const start = todayISO();
    const end = addMonthsISO(start, 12);

    return {
      properties: [
        { id: '1', unitNo: 'Villa 101', type: 'Villa', location: 'Al Waab', monthlyRent: 12000, notes: '' },
        { id: '2', unitNo: 'Villa 105', type: 'Villa', location: 'Al Thumama', monthlyRent: 10500, notes: '' },
        { id: '3', unitNo: 'Flat 4B', type: 'Flat', location: 'Najma', monthlyRent: 4500, notes: '' },
        { id: '4', unitNo: 'Flat 101', type: 'Flat', location: 'Gharrafa', monthlyRent: 5200, notes: '' },
      ],
      tenants: [
        { id: '1', name: 'John Doe', phone: '+974 5555 1111', email: 'john@example.com', idNumber: 'QID-123456', notes: '' },
        { id: '2', name: 'Sarah Smith', phone: '+974 5555 2222', email: 'sarah@example.com', idNumber: 'QID-654321', notes: '' },
      ],
      contracts: [
        {
          id: '1',
          contractNo: 'CTR-00001',
          propertyId: '1',
          tenantId: '1',
          startDate: start,
          endDate: end,
          rent: 12000,
          deposit: 12000,
          notes: 'Demo contract',
        },
        {
          id: '2',
          contractNo: 'CTR-00002',
          propertyId: '2',
          tenantId: '2',
          startDate: addMonthsISO(start, -6),
          endDate: addMonthsISO(start, -1),
          rent: 10500,
          deposit: 10500,
          notes: 'Expired demo contract',
        },
      ],
      maintenanceJobs: [
        {
          id: '1',
          jobNo: 'JB-00001',
          requestDate: addMonthsISO(start, -1),
          priority: 'Normal',
          propertyId: '1',
          issue: 'AC maintenance',
          technician: 'Mohamed Khan',
          status: 'New',
          completionDate: '',
          laborCost: 0,
          materials: [{ code: 'AC-FLT', name: 'Filter', qty: 1, unitCost: 50 }],
          notes: '',
        },
        {
          id: '2',
          jobNo: 'JB-00002',
          requestDate: addMonthsISO(start, -2),
          priority: 'Urgent',
          propertyId: '4',
          issue: 'Electrical issue - power socket',
          technician: 'Rasan',
          status: 'In Progress',
          completionDate: '',
          laborCost: 120,
          materials: [{ code: 'EL-SKT', name: 'Socket', qty: 2, unitCost: 35 }],
          notes: '',
        },
      ],
      dailyJobs: [
        { id: '1', date: start, title: 'Collect rent receipts', assignedTo: 'Admin', priority: 'Normal', status: 'Open', notes: '' },
        { id: '2', date: start, title: 'Inspect Flat 4B', assignedTo: 'Supervisor', priority: 'Urgent', status: 'Open', notes: '' },
      ],
      payments: [
        {
          id: '1',
          date: start,
          contractId: '1',
          amount: 12000,
          method: 'Bank Transfer',
          reference: 'TRX-1001',
          status: 'Received',
          notes: '',
        },
      ],
      meta: {
        lastId: { properties: 4, tenants: 2, contracts: 2, maintenanceJobs: 2, dailyJobs: 2, payments: 1 },
        lastCode: { contracts: 2, maintenanceJobs: 2 },
        createdAt: new Date().toISOString(),
      },
    };
  }

  function _assertReady() {
    if (!_db) throw new Error('Store not initialized');
  }

  // ---- Local fallback (same as the original LocalStorage demo) ----
  function _loadFallback() {
    const raw = localStorage.getItem(FALLBACK_DB_KEY);
    if (!raw) {
      const seeded = seedDemo();
      localStorage.setItem(FALLBACK_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const db = safeParse(raw, null);
    if (!db || !db.meta) {
      const seeded = seedDemo();
      localStorage.setItem(FALLBACK_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return db;
  }

  function _saveFallback(db) {
    localStorage.setItem(FALLBACK_DB_KEY, JSON.stringify(db));
  }

  function _hasFirebase() {
    return Boolean(window.IBAFirebase && window.IBAAuth);
  }

  async function ensureReady() {
    if (_readyPromise) return _readyPromise;

    _readyPromise = (async () => {
      if (!_hasFirebase()) {
        _db = _loadFallback();
        return _db;
      }

      const user = await window.IBAAuth.requireAuth();
      if (!user) return null;

      _uid = user.uid;
      const path = window.IBAFirebase.userDbPath(_uid);
      const snap = await window.IBAFirebase.dbGet(path);

      if (!snap.exists()) {
        _db = seedDemo();
        await window.IBAFirebase.dbSet(path, _db);
        return _db;
      }

      _db = snap.val();
      if (!_db || !_db.meta) {
        _db = seedDemo();
        await window.IBAFirebase.dbSet(path, _db);
      }

      return _db;
    })();

    return _readyPromise;
  }

  async function loadDB() {
    await ensureReady();
    _assertReady();
    return _db;
  }

  async function saveDB(db) {
    await ensureReady();
    _assertReady();
    _db = db;

    if (!_hasFirebase()) {
      _saveFallback(_db);
      return;
    }

    const path = window.IBAFirebase.userDbPath(_uid);
    await window.IBAFirebase.dbSet(path, _db);
  }

  function newId(key) {
    _db.meta.lastId[key] = (_db.meta.lastId[key] || 0) + 1;
    return String(_db.meta.lastId[key]);
  }

  function nextCode(key, prefix) {
    _db.meta.lastCode[key] = (_db.meta.lastCode[key] || 0) + 1;
    const num = String(_db.meta.lastCode[key]).padStart(5, '0');
    return `${prefix}-${num}`;
  }

  function getAll(collection) {
    _assertReady();
    return (_db[collection] || []).slice();
  }

  function getById(collection, id) {
    _assertReady();
    return (_db[collection] || []).find((x) => String(x.id) === String(id)) || null;
  }

  async function upsert(collection, item) {
    await ensureReady();
    _assertReady();

    const arr = _db[collection] || [];
    const isNew = !item.id;
    const id = isNew ? newId(collection) : String(item.id);
    const idx = arr.findIndex((x) => String(x.id) === id);

    const normalized = { ...item, id };
    if (idx >= 0) arr[idx] = normalized;
    else arr.unshift(normalized);

    _db[collection] = arr;
    await saveDB(_db);
    return normalized;
  }

  async function removeById(collection, id) {
    await ensureReady();
    _assertReady();
    _db[collection] = (_db[collection] || []).filter((x) => String(x.id) !== String(id));
    await saveDB(_db);
  }

  async function resetDemo() {
    await ensureReady();
    _db = seedDemo();
    await saveDB(_db);
    return _db;
  }

  function exportJSON() {
    _assertReady();
    return JSON.stringify(_db, null, 2);
  }

  async function importJSON(jsonText) {
    await ensureReady();
    const parsed = safeParse(jsonText, null);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
    if (!parsed.meta || !parsed.properties || !parsed.tenants) throw new Error('Missing required fields');
    _db = parsed;
    await saveDB(_db);
    return _db;
  }

  function isContractActive(contract) {
    const now = new Date();
    const start = new Date(contract.startDate + 'T00:00:00');
    const end = new Date(contract.endDate + 'T23:59:59');
    return start <= now && end >= now;
  }

  function getActiveContractByProperty(propertyId) {
    const contracts = getAll('contracts');
    return contracts.find((c) => String(c.propertyId) === String(propertyId) && isContractActive(c)) || null;
  }

  function getTenantByContract(contract) {
    if (!contract) return null;
    return getById('tenants', contract.tenantId);
  }

  function getPropertyByContract(contract) {
    if (!contract) return null;
    return getById('properties', contract.propertyId);
  }

  async function createContract(item) {
    await ensureReady();
    _assertReady();

    const contractNo = item.contractNo || `CTR-${String((_db.meta.lastCode.contracts || 0) + 1).padStart(5, '0')}`;
    const saved = await upsert('contracts', { ...item, contractNo });

    if (!item.id) {
      _db.meta.lastCode.contracts = (_db.meta.lastCode.contracts || 0) + 1;
      await saveDB(_db);
    }
    return saved;
  }

  async function createMaintenanceJob(item) {
    await ensureReady();
    _assertReady();

    const isNew = !item.id;
    let jobNo = item.jobNo;

    if (!jobNo) {
      // Generate new job number and bump meta counter.
      jobNo = nextCode('maintenanceJobs', 'JB');
    } else if (isNew) {
      // If UI provided a job number for a *new* job, keep it,
      // but ensure the meta counter doesn't go backwards.
      const m = String(jobNo).match(/(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (!_db.meta.lastCode) _db.meta.lastCode = {};
        _db.meta.lastCode.maintenanceJobs = Math.max(Number(_db.meta.lastCode.maintenanceJobs) || 0, n);
      }
    }

    const saved = await upsert('maintenanceJobs', { ...item, jobNo });
    // Persist meta updates (and keep parity with other create* methods)
    await saveDB(_db);
    return saved;
  }

  function computeMaintenanceTotal(job) {
    const materials = job.materials || [];
    const matTotal = materials.reduce((sum, m) => sum + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0);
    const labor = Number(job.laborCost) || 0;
    return matTotal + labor;
  }

  function getRecentPayments(days = 30) {
    const payments = getAll('payments');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return payments.filter((p) => new Date(p.date + 'T00:00:00') >= cutoff);
  }

  function hasRecentPaymentForContract(contractId, days = 30) {
    return getRecentPayments(days).some((p) => String(p.contractId) === String(contractId) && p.status === 'Received');
  }

  // Expose store
  window.IBAStore = {
    ensureReady,
    loadDB,
    saveDB,
    getAll,
    getById,
    upsert,
    removeById,
    resetDemo,
    exportJSON,
    importJSON,
    isContractActive,
    getActiveContractByProperty,
    getTenantByContract,
    getPropertyByContract,
    createContract,
    createMaintenanceJob,
    computeMaintenanceTotal,
    hasRecentPaymentForContract,
  };
})();
