/* --- store.js ---
   LocalStorage-backed data store for demo purposes.
   Later, you can replace these calls with Firebase.
*/

(function () {
  const DB_KEY = 'iba_demo_db_v1';

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
    // handle month rollover
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

  function newId(db, key) {
    db.meta.lastId[key] = (db.meta.lastId[key] || 0) + 1;
    return String(db.meta.lastId[key]);
  }

  function nextCode(db, key, prefix) {
    db.meta.lastCode[key] = (db.meta.lastCode[key] || 0) + 1;
    const num = String(db.meta.lastCode[key]).padStart(5, '0');
    return `${prefix}-${num}`;
  }

  function seedDemo() {
    const start = todayISO();
    const end = addMonthsISO(start, 12);

    const db = {
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
          materials: [
            { code: 'AC-FLT', name: 'Filter', qty: 1, unitCost: 50 },
          ],
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
          materials: [
            { code: 'EL-SKT', name: 'Socket', qty: 2, unitCost: 35 },
          ],
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
        lastId: {
          properties: 4,
          tenants: 2,
          contracts: 2,
          maintenanceJobs: 2,
          dailyJobs: 2,
          payments: 1,
        },
        lastCode: {
          contracts: 2,
          maintenanceJobs: 2,
        },
        createdAt: new Date().toISOString(),
      },
    };
    return db;
  }

  function loadDB() {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = seedDemo();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const db = safeParse(raw, null);
    if (!db || !db.meta) {
      const seeded = seedDemo();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return db;
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getAll(collection) {
    const db = loadDB();
    return (db[collection] || []).slice();
  }

  function getById(collection, id) {
    const db = loadDB();
    return (db[collection] || []).find((x) => String(x.id) === String(id)) || null;
  }

  function upsert(collection, item) {
    const db = loadDB();
    const arr = db[collection] || [];
    const isNew = !item.id;
    const id = isNew ? newId(db, collection) : String(item.id);
    const idx = arr.findIndex((x) => String(x.id) === id);

    const normalized = { ...item, id };
    if (idx >= 0) arr[idx] = normalized;
    else arr.unshift(normalized);

    db[collection] = arr;
    saveDB(db);
    return normalized;
  }

  function removeById(collection, id) {
    const db = loadDB();
    db[collection] = (db[collection] || []).filter((x) => String(x.id) !== String(id));
    saveDB(db);
  }

  function resetDemo() {
    const seeded = seedDemo();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function exportJSON() {
    return JSON.stringify(loadDB(), null, 2);
  }

  function importJSON(jsonText) {
    const parsed = safeParse(jsonText, null);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
    if (!parsed.meta || !parsed.properties || !parsed.tenants) throw new Error('Missing required fields');
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    return loadDB();
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

  function createContract(item) {
    const db = loadDB();
    const contractNo = item.contractNo || `CTR-${String((db.meta.lastCode.contracts || 0) + 1).padStart(5, '0')}`;
    const saved = upsert('contracts', { ...item, contractNo });
    // advance code if it was new
    if (!item.id) {
      db.meta.lastCode.contracts = (db.meta.lastCode.contracts || 0) + 1;
      saveDB(db);
    }
    return saved;
  }

  function createMaintenanceJob(item) {
    const db = loadDB();
    const jobNo = item.jobNo || nextCode(db, 'maintenanceJobs', 'JB');
    // ensure db saved with updated code counter
    saveDB(db);
    return upsert('maintenanceJobs', { ...item, jobNo });
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

  window.IBAStore = {
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
