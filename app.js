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
let allTenantsData = {}; // Stores all data for searching
const existingProperties = new Set();

// --- DOM ELEMENTS ---
// Views
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
const searchResultList = document.getElementById('searchResultList');

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

// --- DATA FETCHING & RENDERING ---
function readTenants() {
    database.ref().on('value', snapshot => {
        allTenantsData = snapshot.val() || {};
        
        existingProperties.clear();
        if(allTenantsData){
             for (const propertyName in allTenantsData) {
                existingProperties.add(propertyName);
            }
        }
        populatePropertyDropdown();
    });
}

// [CHANGED] Updated colspans and headers for new columns
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
        subHeaderRow.innerHTML = `
            <th>Villa</th>
            <th>Tenant</th>
            <th>Email</th>
            <th>Contact No.</th>
            <th>Monthly Rent</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Notes</th>
            <th class="actions-col">Actions</th>`;
        tableBodyElement.appendChild(subHeaderRow);

        const tenants = data[propertyName];
        let totalRent = 0;
        for (const tenantId in tenants) {
            addTenantToTable(propertyName, tenantId, tenants[tenantId], propertyClass, tableBodyElement);
            totalRent += parseFloat(tenants[tenantId].monthlyRent) || 0;
        }
        
        const totalRow = document.createElement('tr');
        totalRow.className = `tenant-row total-row ${propertyClass}`;
        const formattedTotal = totalRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        totalRow.innerHTML = `
            <td colspan="4" style="text-align: right;"><strong>TOTAL</strong></td>
            <td><strong>${formattedTotal}</strong></td>
            <td colspan="4"></td>`;
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

// --- CRUD OPERATIONS ---
tenantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPropertyName = newPropertyInput.value.trim();
    const selectedProperty = propertySelect.value;
    let propertyName = newPropertyName || selectedProperty;

    if (!propertyName) { return alert('Please select or add a property.'); }

    const tenantData = {
        Villa: document.getElementById('villa').value,
        monthlyRent: document.getElementById('monthlyRent').value,
        Tenant: document.getElementById('tenantName').value,
        Email: document.getElementById('email').value,
        contactNo: document.getElementById('contactNo').value,
        Start: document.getElementById('startDate').value,
        End: document.getElementById('endDate').value,
        Notes: document.getElementById('notes').value
    };

    const tenantId = tenantIdField.value;
    if (tenantId) {
        updateTenant(propertySelect.dataset.originalProperty, tenantId, tenantData);
    } else {
        createTenant(propertyName, tenantData);
    }
});

function createTenant(property, data) {
    database.ref(property).push(data)
        .then(newRef => {
            console.log("Success: Record added to Firebase!");
            resetForm();
            const singleEntryData = {
                [property]: { [newRef.key]: data }
            };
            const currentTableContent = tenantList.innerHTML;
            renderTable(singleEntryData, tenantList);
            tenantList.innerHTML += currentTableContent;
        })
        .catch(error => console.error("Firebase Error:", error));
}

function updateTenant(property, tenantId, data) {
    database.ref(`${property}/${tenantId}`).update(data)
    .then(() => {
        alert('Record updated successfully!');
        resetForm();
    })
    .catch(error => console.error("Firebase Error:", error));
}
function deleteTenant(property, tenantId) {
    if (confirm('Are you sure you want to delete this record?')) {
        database.ref(`${property}/${tenantId}`).remove().catch(error => console.error("Firebase Error:", error));
    }
}

// --- HELPER FUNCTIONS ---
// [CHANGED] Added new <td> elements for Email and Contact No.
function addTenantToTable(propertyName, tenantId, tenant, propertyClass, tableBodyElement) {
    const row = document.createElement('tr');
    row.className = `tenant-row ${propertyClass}`;
    row.innerHTML = `
        <td>${tenant.Villa}</td>
        <td>${tenant.Tenant}</td>
        <td>${tenant.Email || ''}</td>
        <td>${tenant.contactNo || ''}</td>
        <td>${tenant.monthlyRent}</td>
        <td>${tenant.Start}</td>
        <td>${tenant.End}</td>
        <td>${tenant.Notes || ''}</td>
        <td class="actions-cell">
            <button class="action-btn edit-btn" onclick="editTenant('${propertyName}', '${tenantId}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteTenant('${propertyName}', '${tenantId}')">Delete</button>
        </td>`;
    tableBodyElement.appendChild(row);
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
    dashboardView.classList.remove('hidden');
    dataEntryView.classList.add('hidden');
    searchView.classList.add('hidden');
};