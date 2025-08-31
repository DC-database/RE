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
// Views & Splash
const splashScreen = document.getElementById('splashScreen');
const dashboardView = document.getElementById('dashboardView');
const dataEntryView = document.getElementById('dataEntryView');
const searchView = document.getElementById('searchView');

// Sidenav & Auth
const openBtn1 = document.getElementById('openBtn1');
const openBtn2 = document.getElementById('openBtn2');
const openBtn3 = document.getElementById('openBtn3');
const closeBtn = document.getElementById('closeBtn');
const sideNav = document.getElementById('sideNav');
const dashboardLink = document.getElementById('dashboardLink');
const dataEntryLink = document.getElementById('dataEntryLink');
const searchLink = document.getElementById('searchLink');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const authStatus = document.getElementById('authStatus');

// Data Entry View Elements
const formFieldset = document.getElementById('form-fieldset');
const tenantForm = document.getElementById('tenantForm');
const tenantList = document.getElementById('tenantList');
const tenantIdField = document.getElementById('tenantId');
const propertySelect = document.getElementById('propertySelect');
const newPropertyInput = document.getElementById('newProperty');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const clearFormBtn = document.getElementById('clearFormBtn');

// Search View Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const printReportBtn = document.getElementById('printReportBtn'); // New button
const searchResultList = document.getElementById('searchResultList');

// Dashboard Elements
const totalPropertiesCard = document.getElementById('totalProperties');
const totalTenantsCard = document.getElementById('totalTenants');
const totalMonthlyRentCard = document.getElementById('totalMonthlyRent');
const chartCanvas = document.getElementById('rentChart').getContext('2d');


// --- SIDENAV & VIEW SWITCHING LOGIC ---
function openSideNav() { sideNav.classList.add('open'); }
function closeSideNav() { sideNav.classList.remove('open'); }

[openBtn1, openBtn2, openBtn3].forEach(btn => btn.addEventListener('click', openSideNav));
closeBtn.addEventListener('click', closeSideNav);

dashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardView.classList.remove('hidden');
    dataEntryView.classList.add('hidden');
    searchView.classList.add('hidden');
    closeSideNav();
});

dataEntryLink.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardView.classList.add('hidden');
    dataEntryView.classList.remove('hidden');
    searchView.classList.add('hidden');
    tenantList.innerHTML = '';
    closeSideNav();
});

searchLink.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardView.classList.add('hidden');
    dataEntryView.classList.add('hidden');
    searchView.classList.remove('hidden');
    renderTable(allTenantsData, searchResultList);
    closeSideNav();
});


// --- AUTHENTICATION LOGIC ---
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
        el.classList.toggle('visible', isLoggedIn);
    });
    if (!isLoggedIn) resetForm();
}

// --- DATA FETCHING & DASHBOARD LOGIC ---
function readTenants() {
    database.ref().on('value', snapshot => {
        allTenantsData = snapshot.val() || {};
        updateDashboard(allTenantsData);
        existingProperties.clear();
        if(allTenantsData){
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
    
    if(rentChart) {
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
                y: { beginAtZero: true, ticks: { callback: function(value) { return 'QAR ' + value.toLocaleString(); } }, grid: { color: '#e9ecef' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2c3e50',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 5,
                    callbacks: { label: function(context) { return `Total Rent: ${formatFinancial(context.raw, 'QAR')}`; } }
                }
            }
        }
    });
}

// --- TABLE RENDERING LOGIC ---
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

// --- SEARCH LOGIC ---
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

// [NEW] Print button logic
printReportBtn.addEventListener('click', () => {
    window.print();
});


// --- CRUD OPERATIONS & HELPERS ---
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
function addTenantToTable(propertyName, tenantId, tenant, propertyClass, tableBodyElement) {
    const row = document.createElement('tr');
    row.className = `tenant-row ${propertyClass}`;
    row.innerHTML = `
        <td>${tenant.Villa}</td><td>${tenant.Tenant}</td><td>${tenant.Email || ''}</td>
        <td>${formatContactNumber(tenant.contactNo)}</td><td>${formatFinancial(tenant.monthlyRent, 'QAR')}</td>
        <td>${formatDate(tenant.Start)}</td><td>${formatDate(tenant.End)}</td>
        <td>${tenant.Notes || ''}</td>
        <td class="actions-cell">
            <button class="action-btn edit-btn" onclick="editTenant('${propertyName}', '${tenantId}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteTenant('${propertyName}', '${tenantId}')">Delete</button>
        </td>`;
    tableBodyElement.appendChild(row);
}
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/ /g, '-').replace(',', '');
}
function formatFinancial(num, currency) {
    const number = parseFloat(num) || 0;
    const options = { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
    let formatted = new Intl.NumberFormat('en-US', options).format(number);
    return `${currency} ${formatted.replace(new RegExp(currency, 'g'), '').trim()}`;
}
function formatContactNumber(numStr) {
    if (!numStr) return '—';
    const digits = numStr.replace(/\D/g, '');
    if (digits.length >= 8) {
        return `+974 ${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
    }
    return numStr;
}
function editTenant(property, tenantId) {
    dashboardView.classList.add('hidden');
    dataEntryView.classList.remove('hidden');
    searchView.classList.add('hidden');
    
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

// --- EVENT LISTENERS ---
cancelBtn.addEventListener('click', resetForm);
clearFormBtn.addEventListener('click', () => {
    resetForm();
    tenantList.innerHTML = '';
});
document.getElementById('tenantTable').addEventListener('click', handleTableClick);
document.getElementById('searchResultTable').addEventListener('click', handleTableClick);
function handleTableClick(e) {
    if (e.target.classList.contains('toggle-btn')) {
        const button = e.target;
        const groupClass = button.dataset.groupClass;
        const rowsToToggle = e.currentTarget.querySelectorAll(`.${groupClass}`);
        rowsToToggle.forEach(row => row.classList.toggle('visible'));
        button.innerHTML = button.innerHTML.trim() === '[+]' ? '[-]' : '[+]';
    }
}

// --- INITIAL LOAD ---
window.onload = () => {
    readTenants();
    // [CHANGED] Add splash screen logic
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        // Default to showing the dashboard view after splash screen fades
        dashboardView.classList.remove('hidden');
        dataEntryView.classList.add('hidden');
        searchView.classList.add('hidden');
    }, 2500); // Show splash for 2.5 seconds
};