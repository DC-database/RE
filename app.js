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
const searchResultList = document.getElementById('searchResultList');

// Dashboard Elements
const totalPropertiesCard = document.getElementById('totalProperties');
const totalTenantsCard = document.getElementById('totalTenants');
const totalMonthlyRentCard = document.getElementById('totalMonthlyRent');
const chartCanvas = document.getElementById('rentChart').getContext('2d');


// --- CORE APP LOGIC ---

/**
 * Shows a specific view and hides others. Updates the active state of navigation links.
 * @param {string} viewName - The name of the view to show ('dashboard', 'dataEntry', 'search').
 */
function showView(viewName) {
    // Hide all views
    [dashboardView, dataEntryView, searchView].forEach(view => view.classList.add('hidden'));

    // Deactivate all navigation links
    Object.values(navLinks).flat().forEach(link => link.classList.remove('active'));

    // Show the selected view and activate its corresponding links
    switch (viewName) {
        case 'dashboard':
            dashboardView.classList.remove('hidden');
            navLinks.dashboard.forEach(link => link.classList.add('active'));
            break;
        case 'dataEntry':
            dataEntryView.classList.remove('hidden');
            navLinks.dataEntry.forEach(link => link.classList.add('active'));
            tenantList.innerHTML = ''; // Clear recent entries when switching
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
    if (user) {
        authStatus.textContent = `Logged in as: ${user.email}`;
        loginForm.classList.add('hidden');
        userInfo.classList.remove('hidden');
        toggleWriteAccess(true);
    } else {
        authStatus.textContent = 'You are not logged in.';
        loginForm.classList.remove('hidden');
        userInfo.classList.add('hidden');
        toggleWriteAccess(false);
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

function toggleWriteAccess(isLoggedIn) {
    formFieldset.disabled = !isLoggedIn;
    document.querySelectorAll('.actions-col, .actions-cell').forEach(el => {
        el.style.visibility = isLoggedIn ? 'visible' : 'hidden';
    });
    if (!isLoggedIn) resetForm();
}


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
    totalMonthlyRentCard.textContent = formatFinancial(totalRent, 'QAR');

    const propertyLabels = Object.keys(rentByProperty);
    const rentData = Object.values(rentByProperty);

    if (rentChart) {
        rentChart.destroy();
    }

    rentChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: propertyLabels,
            datasets: [{
                label: 'Total Monthly Rent',
                data: rentData,
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e'],
                borderColor: '#fff',
                borderWidth: 2,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => 'QAR ' + value.toLocaleString() }, grid: { color: '#e9ecef' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2c3e50',
                    callbacks: { label: context => `Total Rent: ${formatFinancial(context.raw, 'QAR')}` }
                }
            }
        }
    });
}

// --- TABLE RENDERING ---
function renderTable(data, tableBodyElement) {
    tableBodyElement.innerHTML = '';
    if (!data || Object.keys(data).length === 0) {
        if (tableBodyElement.id !== 'tenantList') {
             const row = document.createElement('tr');
             row.innerHTML = `<td colspan="9" style="text-align:center;">No records found.</td>`;
             tableBodyElement.appendChild(row);
        }
        return;
    }

    for (const propertyName in data) {
        const propertyClass = 'group-' + propertyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

        const groupRow = document.createElement('tr');
        groupRow.className = 'property-group-header';
        groupRow.innerHTML = `<td colspan="9"><span class="toggle-btn" data-group-class="${propertyClass}">[+]</span>${propertyName}</td>`;
        tableBodyElement.appendChild(groupRow);

        const subHeaderRow = document.createElement('tr');
        subHeaderRow.className = `tenant-row sub-header ${propertyClass}`;
        subHeaderRow.innerHTML = `<th>Villa</th><th>Tenant</th><th>Email</th><th>Contact No.</th><th>Monthly Rent</th><th>Start Date</th><th>End Date</th><th>Notes</th><th class="actions-col">Actions</th>`;
        tableBodyElement.appendChild(subHeaderRow);

        const tenants = data[propertyName];
        let totalRent = 0;
        for (const tenantId in tenants) {
            addTenantToTable(propertyName, tenantId, tenants[tenantId], propertyClass, tableBodyElement);
            totalRent += parseFloat(tenants[tenantId].monthlyRent) || 0;
        }

        const totalRow = document.createElement('tr');
        totalRow.className = `tenant-row total-row ${propertyClass}`;
        totalRow.innerHTML = `<td colspan="4" style="text-align: right;"><strong>TOTAL</strong></td><td><strong>${formatFinancial(totalRent, 'QAR')}</strong></td><td colspan="4"></td>`;
        tableBodyElement.appendChild(totalRow);
    }
    toggleWriteAccess(auth.currentUser != null);
}

function addTenantToTable(propertyName, tenantId, tenant, propertyClass, tableBodyElement) {
    const row = document.createElement('tr');
    row.className = `tenant-row ${propertyClass}`;
    row.innerHTML = `
        <td>${tenant.Villa || ''}</td><td>${tenant.Tenant || ''}</td><td>${tenant.Email || ''}</td>
        <td>${formatContactNumber(tenant.contactNo)}</td><td>${formatFinancial(tenant.monthlyRent, 'QAR')}</td>
        <td>${formatDate(tenant.Start)}</td><td>${formatDate(tenant.End)}</td>
        <td>${tenant.Notes || ''}</td>
        <td class="actions-cell">
            <button class="action-btn edit-btn" onclick="editTenant('${propertyName}', '${tenantId}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteTenant('${propertyName}', '${tenantId}')">Delete</button>
        </td>`;
    tableBodyElement.appendChild(row);
}

// --- SEARCH ---
searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        renderTable(allTenantsData, searchResultList);
        return;
    }

    const filteredData = {};
    for (const propertyName in allTenantsData) {
        const tenants = allTenantsData[propertyName];
        const matchingTenants = {};
        let matchFound = false;

        for (const tenantId in tenants) {
            const tenant = tenants[tenantId];
            const tenantString = JSON.stringify(tenant).toLowerCase();
            const propertyString = propertyName.toLowerCase();

            if (tenantString.includes(searchTerm) || propertyString.includes(searchTerm)) {
                matchingTenants[tenantId] = tenant;
                matchFound = true;
            }
        }

        if (matchFound) {
            filteredData[propertyName] = matchingTenants;
        }
    }
    renderTable(filteredData, searchResultList);
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderTable(allTenantsData, searchResultList);
});

printReportBtn.addEventListener('click', () => window.print());

// --- CRUD & HELPERS ---
function createTenant(property, data) {
    database.ref(property).push(data)
        .then(newRef => {
            resetForm();
            const singleEntryData = { [property]: { [newRef.key]: data } };
            const currentTableContent = tenantList.innerHTML;
            renderTable(singleEntryData, tenantList);
            tenantList.innerHTML += currentTableContent;
        })
        .catch(error => console.error("Firebase Error:", error));
}
function updateTenant(property, tenantId, data) {
    database.ref(`${property}/${tenantId}`).update(data)
    .then(() => { alert('Record updated successfully!'); resetForm(); })
    .catch(error => console.error("Firebase Error:", error));
}
function deleteTenant(property, tenantId) {
    if (confirm('Are you sure you want to delete this record?')) {
        database.ref(`${property}/${tenantId}`).remove().catch(error => console.error("Firebase Error:", error));
    }
}
function editTenant(property, tenantId) {
    showView('dataEntry'); // Switch to data entry view
    database.ref(`${property}/${tenantId}`).once('value', snapshot => {
        const data = snapshot.val();
        tenantIdField.value = tenantId;
        document.getElementById('villa').value = data.Villa;
        document.getElementById('monthlyRent').value = data.monthlyRent;
        document.getElementById('tenantName').value = data.Tenant;
        document.getElementById('email').value = data.Email;
        document.getElementById('contactNo').value = data.contactNo;
        document.getElementById('startDate').value = data.Start;
        document.getElementById('endDate').value = data.End;
        document.getElementById('notes').value = data.Notes;
        propertySelect.value = property;
        propertySelect.dataset.originalProperty = property;
        propertySelect.disabled = true;
        newPropertyInput.disabled = true;
        submitBtn.textContent = 'Update Record';
        cancelBtn.classList.remove('hidden');
        clearFormBtn.classList.add('hidden');
        window.scrollTo(0, 0);
    });
}
function resetForm() {
    tenantForm.reset();
    tenantIdField.value = '';
    propertySelect.selectedIndex = 0;
    propertySelect.disabled = false;
    delete propertySelect.dataset.originalProperty;
    newPropertyInput.disabled = false;
    submitBtn.textContent = 'Add Villa Record';
    cancelBtn.classList.add('hidden');
    clearFormBtn.classList.remove('hidden');
    if (auth.currentUser == null) { formFieldset.disabled = true; }
}
function populatePropertyDropdown() {
    const currentSelection = propertySelect.value;
    propertySelect.innerHTML = '<option value="" disabled selected>-- Select Existing Property --</option>';
    existingProperties.forEach(prop => {
        const option = document.createElement('option');
        option.value = prop;
        option.textContent = prop;
        propertySelect.appendChild(option);
    });
    propertySelect.value = currentSelection;
}
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('en-GB'); // Use a simpler date format
}
function formatFinancial(num, currency) {
    const number = parseFloat(num) || 0;
    return `${currency} ${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatContactNumber(numStr) {
    if (!numStr) return '—';
    const digits = numStr.replace(/\D/g, '');
    if (digits.length >= 8) {
        return `+974 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
    }
    return numStr;
}

// --- EVENT LISTENERS ---
// Navigation
navLinks.dashboard.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showView('dashboard'); }));
navLinks.dataEntry.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showView('dataEntry'); }));
navLinks.search.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showView('search'); }));

// Forms
cancelBtn.addEventListener('click', resetForm);
clearFormBtn.addEventListener('click', () => { resetForm(); tenantList.innerHTML = ''; });
tenantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = tenantIdField.value;
    const selectedProperty = propertySelect.value;
    const newProperty = newPropertyInput.value.trim();
    const property = newProperty || selectedProperty;
    if (!property) { alert('Please select or add a property name.'); return; }
    const data = {
        Villa: document.getElementById('villa').value,
        monthlyRent: document.getElementById('monthlyRent').value,
        Tenant: document.getElementById('tenantName').value,
        Email: document.getElementById('email').value,
        contactNo: document.getElementById('contactNo').value,
        Start: document.getElementById('startDate').value,
        End: document.getElementById('endDate').value,
        Notes: document.getElementById('notes').value
    };
    if (id) {
        const originalProperty = propertySelect.dataset.originalProperty;
        if (originalProperty && originalProperty !== property) {
            deleteTenant(originalProperty, id);
            createTenant(property, data);
        } else {
            updateTenant(property, id, data);
        }
    } else {
        createTenant(property, data);
    }
});

// Table Interactivity
document.querySelectorAll('.table-container').forEach(table => {
    table.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            const button = e.target;
            const groupClass = button.dataset.groupClass;
            const rowsToToggle = e.currentTarget.querySelectorAll(`.${groupClass}`);
            const isVisible = button.textContent.trim() === '[-]';
            rowsToToggle.forEach(row => row.style.display = isVisible ? 'none' : 'table-row');
            button.textContent = isVisible ? '[+]' : '[-]';
        }
    });
});


// --- INITIAL LOAD ---
window.onload = () => {
    readTenants();
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        showView('dashboard');
    }, 2500);
};