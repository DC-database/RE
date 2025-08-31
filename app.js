// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBkeywuk5EirEyZENNaRW-mXbbCfvK-ZKg",
    authDomain: "property-76577.firebaseapp.com",
    databaseURL: "https://property-76577-default-rtdb.firebaseio.com",
    projectId: "property-76577",
    storageBucket: "property-76577.firebasestorage.app",
    messagingSenderId: "1028649880088",
    appId: "1:1028649880088:web:76c9900cb9bbdf2bbc916d",
    measurementId: "G-RWEVEHRFVJ"
};

// --- INITIALIZE FIREBASE ---
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// --- GLOBAL VARIABLES ---
let allTenantsData = {};
let rentChart = null;
const existingProperties = new Set();
const searchSuggestions = new Set(); // To hold autocomplete suggestions

// --- DOM ELEMENTS ---
const splashScreen = document.getElementById('splashScreen');
const sideNav = document.getElementById('sideNav');
const closeBtn = document.getElementById('closeBtn');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const authStatus = document.getElementById('authStatus');

// Views
const dashboardView = document.getElementById('dashboardView');
const dataEntryView = document.getElementById('dataEntryView');
const searchView = document.getElementById('searchView');

// Navigation Links
const navLinks = {
    dashboard: [document.getElementById('dashboardLink'), document.getElementById('bottomDashboardLink')],
    dataEntry: [document.getElementById('dataEntryLink'), document.getElementById('bottomDataEntryLink')],
    search: [document.getElementById('searchLink'), document.getElementById('bottomSearchLink')]
};

// Form & Table Elements
const formFieldset = document.getElementById('form-fieldset');
const tenantForm = document.getElementById('tenantForm');
const tenantTable = document.getElementById('tenantTable');
const tenantList = document.getElementById('tenantList');
const tenantIdField = document.getElementById('tenantId');
const propertySelect = document.getElementById('propertySelect');
const newPropertyInput = document.getElementById('newProperty');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const printReportBtn = document.getElementById('printReportBtn');
const searchResultTable = document.getElementById('searchResultTable');
const searchResultList = document.getElementById('searchResultList');

// Dashboard Elements
const totalPropertiesCard = document.getElementById('totalProperties');
const totalTenantsCard = document.getElementById('totalTenants');
const totalMonthlyRentCard = document.getElementById('totalMonthlyRent');
const chartCanvas = document.getElementById('rentChart').getContext('2d');


// --- CORE APP LOGIC ---
function showView(viewName) {
    [dashboardView, dataEntryView, searchView].forEach(view => view.classList.add('hidden'));
    Object.values(navLinks).flat().forEach(link => link.classList.remove('active'));

    switch (viewName) {
        case 'dashboard':
            dashboardView.classList.remove('hidden');
            navLinks.dashboard.forEach(link => link.classList.add('active'));
            break;
        case 'dataEntry':
            dataEntryView.classList.remove('hidden');
            navLinks.dataEntry.forEach(link => link.classList.add('active'));
            tenantList.innerHTML = '';
            break;
        case 'search':
            searchView.classList.remove('hidden');
            navLinks.search.forEach(link => link.classList.add('active'));
            renderTable(allTenantsData, searchResultList);
            break;
    }
    closeSideNav();
}

// --- SIDENAV ---
function openSideNav() { sideNav.classList.add('open'); }
function closeSideNav() { sideNav.classList.remove('open'); }

document.querySelectorAll('.open-btn').forEach(btn => btn.addEventListener('click', openSideNav));
closeBtn.addEventListener('click', closeSideNav);

// --- AUTHENTICATION ---
auth.onAuthStateChanged(user => {
    const tables = [tenantTable, searchResultTable];
    if (user) {
        authStatus.textContent = `Logged in as: ${user.email}`;
        loginForm.classList.add('hidden');
        userInfo.classList.remove('hidden');
        formFieldset.disabled = false;
        tables.forEach(table => table.classList.add('actions-visible'));
    } else {
        authStatus.textContent = 'You are not logged in.';
        loginForm.classList.remove('hidden');
        userInfo.classList.add('hidden');
        formFieldset.disabled = true;
        tables.forEach(table => table.classList.remove('actions-visible'));
    }
    if (!searchView.classList.contains('hidden')) {
        renderTable(allTenantsData, searchResultList);
    } else if (!dataEntryView.classList.contains('hidden')) {
        renderTable(allTenantsData, tenantList);
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => { loginForm.reset(); closeSideNav(); })
        .catch(error => alert(`Login Failed: ${error.message}`));
});

logoutBtn.addEventListener('click', () => auth.signOut());

// --- DATA FETCHING & DASHBOARD ---
function readTenants() {
    database.ref().on('value', snapshot => {
        allTenantsData = snapshot.val() || {};
        updateDashboard(allTenantsData);
        existingProperties.clear();
        if (allTenantsData) {
             for (const propertyName in allTenantsData) {
                existingProperties.add(propertyName);
            }
        }
        populatePropertyDropdown();
        populateSearchSuggestions(); // Populate autocomplete suggestions
        if (!searchView.classList.contains('hidden')) {
            renderTable(allTenantsData, searchResultList);
        }
    });
}

function updateDashboard(data) {
    let propCount = 0;
    let tenantCount = 0;
    let totalRent = 0;
    const rentByProperty = {};

    for (const propertyName in data) {
        propCount++;
        const tenants = data[propertyName];
        rentByProperty[propertyName] = 0;
        for (const tenantId in tenants) {
            tenantCount++;
            const rent = parseFloat(tenants[tenantId].monthlyRent) || 0;
            totalRent += rent;
            rentByProperty[propertyName] += rent;
        }
    }

    totalPropertiesCard.textContent = propCount;
    totalTenantsCard.textContent = tenantCount;
    totalMonthlyRentCard.textContent = formatFinancial(totalRent, 'QAR', false);

    const propertyLabels = Object.keys(rentByProperty);
    const rentData = Object.values(rentByProperty);

    if (rentChart) rentChart.destroy();

    rentChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: propertyLabels,
            datasets: [{ label: 'Total Monthly Rent', data: rentData, backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e'], borderColor: '#fff', borderWidth: 2, borderRadius: 5 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => 'QAR ' + value.toLocaleString() }, grid: { color: '#e9ecef' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#2c3e50', callbacks: { label: context => `Total Rent: ${formatFinancial(context.raw, 'QAR', false)}` } }
            }
        }
    });
}

// --- TABLE RENDERING ---
function renderTable(data, tableBodyElement, isExpandedByDefault = false) {
    tableBodyElement.innerHTML = '';
    if (!data || Object.keys(data).length === 0) {
        if (tableBodyElement.id === 'tenantList') return;
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="9" style="text-align:center;">No records found.</td>`;
        tableBodyElement.appendChild(row);
        return;
    }

    for (const propertyName in data) {
        const propertyClass = 'group-' + propertyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

        const groupRow = document.createElement('tr');
        groupRow.className = 'property-group-header';
        groupRow.innerHTML = `<td colspan="9"><span class="toggle-btn" data-target="${propertyClass}">+</span> ${propertyName}</td>`;
        tableBodyElement.appendChild(groupRow);

        const subHeaderRow = document.createElement('tr');
        subHeaderRow.className = `sub-header tenant-row ${propertyClass}`;
        subHeaderRow.innerHTML = `<th>Villa/Unit</th><th>Tenant</th><th>Email</th><th>Contact</th><th>Start Date</th><th>End Date</th><th>Monthly Rent</th><th>Notes</th><th class="actions-col">Actions</th>`;
        tableBodyElement.appendChild(subHeaderRow);

        let propertyTotal = 0;
        const tenants = data[propertyName];
        for (const tenantId in tenants) {
            const tenant = tenants[tenantId];
            const row = document.createElement('tr');
            row.className = `tenant-row ${propertyClass}`;
            row.innerHTML = `
                <td>${escapeHtml(tenant.villa)}</td>
                <td>${escapeHtml(tenant.tenantName)}</td>
                <td>${escapeHtml(tenant.email)}</td>
                <td>${formatContact(tenant.contactNo)}</td>
                <td>${formatDate(tenant.startDate)}</td>
                <td>${formatDate(tenant.endDate)}</td>
                <td>${formatFinancial(tenant.monthlyRent, 'QAR')}</td>
                <td>${escapeHtml(tenant.notes)}</td>
                <td class="actions-cell">
                    <button class="action-btn edit-btn" data-id="${tenantId}" data-property="${propertyName}">Edit</button>
                    <button class="action-btn delete-btn" data-id="${tenantId}" data-property="${propertyName}">Delete</button>
                </td>
            `;
            tableBodyElement.appendChild(row);
            propertyTotal += parseFloat(tenant.monthlyRent) || 0;
        }

        const totalRow = document.createElement('tr');
        totalRow.className = `total-row tenant-row ${propertyClass}`;
        totalRow.innerHTML = `<td colspan="5"></td><td style="font-weight: bold; text-align: right;">Property Total:</td><td style="font-weight: bold;">${formatFinancial(propertyTotal, 'QAR', false)}</td><td colspan="2"></td>`;
        tableBodyElement.appendChild(totalRow);
    }
    attachTableEventListeners(tableBodyElement);

    if (isExpandedByDefault) {
        tableBodyElement.querySelectorAll('.toggle-btn').forEach(btn => btn.textContent = '-');
        tableBodyElement.querySelectorAll('.sub-header, .tenant-row, .total-row').forEach(row => row.style.display = 'table-row');
    }
}

function attachTableEventListeners(tableBodyElement) {
    tableBodyElement.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetClass = this.getAttribute('data-target');
            const isVisible = this.textContent === '-';
            this.textContent = isVisible ? '+' : '-';
            tableBodyElement.querySelectorAll(`.${targetClass}`).forEach(row => {
                if (row.matches('.tenant-row, .total-row, .sub-header')) {
                    row.style.display = isVisible ? 'none' : 'table-row';
                }
            });
        });
    });

    tableBodyElement.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tenantId = this.getAttribute('data-id');
            const propertyName = this.getAttribute('data-property');
            const tenantData = allTenantsData[propertyName][tenantId];
            populateFormForEdit(tenantId, propertyName, tenantData);
        });
    });

    tableBodyElement.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this tenant record?')) {
                const tenantId = this.getAttribute('data-id');
                const propertyName = this.getAttribute('data-property');
                database.ref(`${propertyName}/${tenantId}`).remove()
                    .then(() => {
                        alert('Successfully deleted!');
                        if (tableBodyElement.id === 'tenantList') {
                            tableBodyElement.innerHTML = '';
                        }
                    })
                    .catch(error => alert(`Error deleting record: ${error.message}`));
            }
        });
    });
}

// --- FORM HANDLING ---
function populatePropertyDropdown() {
    propertySelect.innerHTML = '<option value="" disabled selected>-- Select Existing Property --</option>';
    existingProperties.forEach(property => {
        const option = document.createElement('option');
        option.value = property;
        option.textContent = property;
        propertySelect.appendChild(option);
    });
}

function populateFormForEdit(tenantId, propertyName, tenantData) {
    tenantIdField.value = tenantId;
    propertySelect.value = propertyName;
    newPropertyInput.value = '';
    document.getElementById('villa').value = tenantData.villa || '';
    document.getElementById('monthlyRent').value = tenantData.monthlyRent || '';
    document.getElementById('tenantName').value = tenantData.tenantName || '';
    document.getElementById('email').value = tenantData.email || '';
    document.getElementById('contactNo').value = tenantData.contactNo || '';
    document.getElementById('startDate').value = tenantData.startDate || '';
    document.getElementById('endDate').value = tenantData.endDate || '';
    document.getElementById('notes').value = tenantData.notes || '';
    submitBtn.textContent = 'Update Villa Record';
    cancelBtn.classList.remove('hidden');
    showView('dataEntry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

tenantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const finalPropertyName = newPropertyInput.value.trim() || propertySelect.value;
    if (!finalPropertyName) {
        alert('Please select or enter a property name.');
        return;
    }
    const formData = {
        villa: document.getElementById('villa').value,
        monthlyRent: parseFloat(document.getElementById('monthlyRent').value),
        tenantName: document.getElementById('tenantName').value,
        email: document.getElementById('email').value,
        contactNo: document.getElementById('contactNo').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        notes: document.getElementById('notes').value
    };

    const existingTenantId = tenantIdField.value;
    const newTenantId = existingTenantId || generateId();
    const path = `${finalPropertyName}/${newTenantId}`;

    database.ref(path).set(formData)
        .then(() => {
            alert(existingTenantId ? 'Record updated successfully!' : 'New record added successfully!');
            const recentEntry = { [finalPropertyName]: { [newTenantId]: formData } };
            renderTable(recentEntry, tenantList, true);
            resetForm();
        })
        .catch(error => alert(`Error saving data: ${error.message}`));
});

clearFormBtn.addEventListener('click', () => {
    resetForm();
    tenantList.innerHTML = '';
});
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    tenantForm.reset();
    tenantIdField.value = '';
    submitBtn.textContent = 'Add Villa Record';
    cancelBtn.classList.add('hidden');
    propertySelect.selectedIndex = 0;
    newPropertyInput.value = '';
}

// --- SEARCH FUNCTIONALITY & AUTOCOMPLETE ---
function populateSearchSuggestions() {
    searchSuggestions.clear();
    if (!allTenantsData) return;

    for (const propertyName in allTenantsData) {
        if (propertyName) searchSuggestions.add(propertyName);
        const tenants = allTenantsData[propertyName];
        for (const tenantId in tenants) {
            const tenant = tenants[tenantId];
            if (tenant.tenantName) searchSuggestions.add(tenant.tenantName);
            if (tenant.villa) searchSuggestions.add(tenant.villa);
            if (tenant.email) searchSuggestions.add(tenant.email);
        }
    }

    const datalist = document.getElementById('searchSuggestions');
    datalist.innerHTML = '';
    searchSuggestions.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if ([...searchSuggestions].includes(value)) {
        searchForm.dispatchEvent(new Event('submit'));
    }
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        renderTable(allTenantsData, searchResultList);
        return;
    }
    const filteredData = {};
    for (const propertyName in allTenantsData) {
        const tenants = allTenantsData[propertyName];

        if (propertyName.toLowerCase().includes(searchTerm)) {
            filteredData[propertyName] = tenants;
            continue;
        }

        const matchingTenants = {};
        let hasMatch = false;
        for (const tenantId in tenants) {
            const tenant = tenants[tenantId];
            if (Object.values(tenant).some(val => String(val).toLowerCase().includes(searchTerm))) {
                matchingTenants[tenantId] = tenant;
                hasMatch = true;
            }
        }

        if (hasMatch) {
            filteredData[propertyName] = matchingTenants;
        }
    }
    renderTable(filteredData, searchResultList, true);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderTable(allTenantsData, searchResultList);
});

printReportBtn.addEventListener('click', () => window.print());

// --- UTILITY FUNCTIONS ---
function generateId() { return 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9); }

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) { return '-' }
}

function formatContact(contactNo) {
    if (!contactNo) return '-';
    const digits = String(contactNo).replace(/\D/g, '');
    if (digits.length === 8) {
        return `+974 ${digits.substring(0, 4)}-${digits.substring(4)}`;
    }
    return contactNo;
}

function formatFinancial(amount, currency, usePlaceholder = true) {
    const num = parseFloat(amount);
    if (usePlaceholder && isNaN(num)) return '-';
    return `${currency} ${(num || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function escapeHtml(text) {
    const str = text ? String(text) : '-';
    if (str === '-') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- EVENT LISTENERS FOR NAVIGATION ---
document.getElementById('dashboardLink').addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); });
document.getElementById('dataEntryLink').addEventListener('click', (e) => { e.preventDefault(); showView('dataEntry'); });
document.getElementById('searchLink').addEventListener('click', (e) => { e.preventDefault(); showView('search'); });
document.getElementById('bottomDashboardLink').addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); });
document.getElementById('bottomDataEntryLink').addEventListener('click', (e) => { e.preventDefault(); showView('dataEntry'); });
document.getElementById('bottomSearchLink').addEventListener('click', (e) => { e.preventDefault(); showView('search'); });

// --- INITIALIZE APP ---
function initializeApp() {
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        readTenants();
        showView('dashboard');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initializeApp);