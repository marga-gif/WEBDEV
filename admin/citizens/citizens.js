let localCitizensCache = [
    {
        id: "doc_001", seniorId: "SC-PENDING", firstName: "Tomas", lastName: "Aquino",
        age: 61, birthdate: "1965-07-09", street: "Blk 1 Lot 5, Purok 3", city: "Antipolo",
        province: "Rizal", zip: "1870", status: "Pending"
    },
    {
        id: "doc_002", seniorId: "SC-2026-0841", firstName: "Juan", lastName: "Dela Cruz",
        age: 68, birthdate: "1958-03-15", street: "Blk 4 Lot 12, Sitio Boso-Boso", city: "Antipolo",
        province: "Rizal", zip: "1870", status: "Verified"
    },
    {
        id: "doc_003", seniorId: "SC-2026-1102", firstName: "Elena", lastName: "Santos",
        age: 72, birthdate: "1954-11-22", street: "Lot 2B, Zone 1", city: "Antipolo",
        province: "Rizal", zip: "1870", status: "Registered"
    },
    {
        id: "doc_004", seniorId: "SC-REJECTED", firstName: "Ricardo", lastName: "Mendoza",
        age: 60, birthdate: "1966-02-14", street: "Blk 2 Lot 9, Purok 5", city: "Antipolo",
        province: "Rizal", zip: "1870", status: "Rejected"
    }
];

const API_BASE = window.API_BASE || '';

// UI Configuration State
let currentPage = 1;
const itemsPerPage = 5; 
let currentSort = { column: null, direction: 'none' }; 
let activeStatusFilter = 'All'; // Track active dropdown status

function getAdminToken() {
    const storedAuth = JSON.parse(localStorage.getItem('barangay_admin_auth') || 'null');
    return storedAuth?.idToken || null;
}

function getAdminUser() {
    try {
        return JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || null;
    } catch (e) {
        return null;
    }
}

function checkAdminAuth() {
    const adminAuth = localStorage.getItem('barangay_admin_auth');
    const rememberActive = localStorage.getItem('barangay_admin_remembered') === 'true';
    const isLoggedIn = sessionStorage.getItem('barangay_admin_logged_in') === 'true';
    
    if (!adminAuth || (!isLoggedIn && !rememberActive)) {
        window.location.href = '../auth/index.html';
        return false;
    }
    
    if (!isLoggedIn && rememberActive) {
        sessionStorage.setItem('barangay_admin_logged_in', 'true');
    }
    return true;
}

function populateAdminName() {
    const adminNameEl = document.getElementById('auth-admin-name');
    const adminUser = getAdminUser();
    if (adminNameEl) {
        adminNameEl.textContent = adminUser?.fullName || adminUser?.email || 'Admin User';
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('barangay_admin_logged_in');
        localStorage.removeItem('barangay_admin_remembered');
        localStorage.removeItem('barangay_admin_auth');
        localStorage.removeItem('barangay_admin_user');
        window.location.href = '../auth/index.html';
    });
}

async function loadCitizensFromApi() {
    const token = getAdminToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/social/citizens`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Failed to load citizens');
        const data = await res.json();
        
        if (Array.isArray(data)) {
            localCitizensCache = data.map(citizen => ({
                ...citizen,
                street: citizen.blockLot || citizen.street || 'N/A',
                city: citizen.city || 'Antipolo',
                province: citizen.province || 'Rizal',
                zip: citizen.zip || '1870'
            }));
        }
    } catch (err) {
        console.warn('Could not load citizens from API. Using local cache.', err);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAdminAuth()) return;
    
    populateAdminName();
    setupMobileMenuToggle();
    setupTableInteractions();
    setupExportFeatures();
    setupLogoutButton();

    // Close status dropdowns globally
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".status-select-wrapper")) {
            document.querySelectorAll(".status-dropdown-menu").forEach((menu) => menu.classList.remove("visible-show"));
        }
    });

    await loadCitizensFromApi();
    renderCharts();
    applyFilterAndRenderTable();
});

function setupMobileMenuToggle() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');
    
    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-visible');
        });
    }
}

// ---------------------------------------------------------
// NEW NATIVE HEADER DROPDOWN LOGIC
// ---------------------------------------------------------

window.toggleHeaderMenu = function(menuId, event) {
    event.stopPropagation();
    // Close other menus
    document.querySelectorAll('.header-menu').forEach(menu => {
        if (menu.id !== menuId) menu.classList.remove('show');
    });
    
    const targetMenu = document.getElementById(menuId);
    if (targetMenu) {
        targetMenu.classList.toggle('show');
    }
};

window.applyHeaderAction = function(type, key, value) {
    if (type === 'sort') {
        currentSort.column = value === 'none' ? null : key;
        currentSort.direction = value;
    } else if (type === 'filter') {
        activeStatusFilter = value;
    }
    
    // Auto-close menu
    document.querySelectorAll('.header-menu').forEach(menu => menu.classList.remove('show'));
    
    currentPage = 1;
    applyFilterAndRenderTable();
};

function setupTableInteractions() {
    const searchInput = document.getElementById('search-citizen');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFilterAndRenderTable();
        });
    }

    // Global click listener to close all header dropdowns if clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.header-menu').forEach(menu => menu.classList.remove('show'));
    });
}

function applyFilterAndRenderTable() {
    const tableBody = document.getElementById('citizens-table-body');
    const searchInput = document.getElementById('search-citizen');
    const entriesLabel = document.getElementById('showing-entries');

    if (!tableBody) return;
    
    const searchString = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // 1. Data Filtering
    let computationalResults = localCitizensCache.filter(citizen => {
        const fullName = `${citizen.firstName} ${citizen.lastName}`.toLowerCase();
        const matchesSearch = !searchString || fullName.includes(searchString) || (citizen.seniorId || '').toLowerCase().includes(searchString);
        
        // Use activeStatusFilter bound to the native dropdown
        const matchesStatus = activeStatusFilter === "All" || citizen.status.toLowerCase() === activeStatusFilter.toLowerCase();
        
        return matchesSearch && matchesStatus;
    });

    // 2. Data Sorting Array Engine
    if (currentSort.column === 'name' && currentSort.direction !== 'none') {
        computationalResults.sort((a, b) => {
            const nameA = `${a.lastName}, ${a.firstName}`;
            const nameB = `${b.lastName}, ${b.firstName}`;
            return currentSort.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
    } else if (currentSort.column === 'age' && currentSort.direction !== 'none') {
        computationalResults.sort((a, b) => {
            const ageA = parseInt(a.age) || 0;
            const ageB = parseInt(b.age) || 0;
            return currentSort.direction === 'asc' ? ageA - ageB : ageB - ageA;
        });
    }

    // 3. Pagination Engine
    const absoluteTotalItems = computationalResults.length;
    const computedTotalPages = Math.ceil(absoluteTotalItems / itemsPerPage) || 1;
    if (currentPage > computedTotalPages) currentPage = computedTotalPages;

    const lowerBoundIndex = (currentPage - 1) * itemsPerPage;
    const upperBoundIndex = Math.min(lowerBoundIndex + itemsPerPage, absoluteTotalItems);
    const visibleSubarraySlice = computationalResults.slice(lowerBoundIndex, upperBoundIndex);

    tableBody.innerHTML = '';

    if (absoluteTotalItems === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty-state">
                    <i class="fas fa-search-minus fa-2x" style="opacity: 0.4; margin-bottom:10px; display:block;"></i>
                    No resident records match your selected criteria.
                </td>
            </tr>`;
        if (entriesLabel) entriesLabel.textContent = "Showing 0 entries";
        renderPaginationButtons(computedTotalPages);
        return;
    }

    visibleSubarraySlice.forEach(citizen => {
        tableBody.insertAdjacentHTML('beforeend', generateTableRow(citizen.id, citizen));
    });

    if (entriesLabel) {
        entriesLabel.textContent = `Showing ${lowerBoundIndex + 1}-${upperBoundIndex} of ${absoluteTotalItems} entries`;
    }

    renderPaginationButtons(computedTotalPages);
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById('pagination-controls-wrapper');
    if (!container) return;

    container.innerHTML = '';

    const leftArrow = document.createElement('button');
    leftArrow.className = 'page-num';
    leftArrow.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    leftArrow.disabled = (currentPage === 1);
    leftArrow.style.opacity = (currentPage === 1) ? "0.38" : "1";
    leftArrow.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFilterAndRenderTable();
        }
    });
    container.appendChild(leftArrow);

    for (let currentNumIndex = 1; currentNumIndex <= totalPages; currentNumIndex++) {
        const structuralNumButton = document.createElement('button');
        structuralNumButton.className = `page-num ${currentNumIndex === currentPage ? 'active' : ''}`;
        structuralNumButton.textContent = currentNumIndex;
        structuralNumButton.addEventListener('click', () => {
            currentPage = currentNumIndex;
            applyFilterAndRenderTable();
        });
        container.appendChild(structuralNumButton);
    }

    const rightArrow = document.createElement('button');
    rightArrow.className = 'page-num';
    rightArrow.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    rightArrow.disabled = (currentPage === totalPages);
    rightArrow.style.opacity = (currentPage === totalPages) ? "0.38" : "1";
    rightArrow.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            applyFilterAndRenderTable();
        }
    });
    container.appendChild(rightArrow);
}

// REVISION: Removed Actions column. Integrated explicit dropdown list for Verify/Reject modifications.
function generateTableRow(docId, data) {
    const displayId = data.seniorId || 'SC-PENDING';
    const displayFullName = `${data.lastName || ''}, ${data.firstName || ''}`.toUpperCase();
    const displayAge = data.age || '--';
    const displayBirthdate = data.birthdate || 'N/A';
    
    const street = data.street || 'N/A';
    const city = data.city || 'Antipolo';
    const prov = data.province || 'Rizal';
    const zip = data.zip || '1870';
    const completeAddressHtml = `
        <span class="address-street">${street}</span>
        <span class="address-city">Brgy. San Jose, ${city}, ${prov} ${zip}</span>
    `;

    const safeStatus = (data.status || 'Pending').charAt(0).toUpperCase() + (data.status || 'Pending').slice(1).toLowerCase();
    
    let triggerClass = 'trigger-pending';
    if (safeStatus === 'Verified') triggerClass = 'trigger-verified';
    if (safeStatus === 'Rejected') triggerClass = 'trigger-rejected';
    if (safeStatus === 'Registered') triggerClass = 'trigger-registered';

    return `
        <tr>
            <td><strong>${displayId}</strong></td>
            <td style="font-weight: 500;">${displayFullName}</td>
            <td>${displayBirthdate}</td>
            <td>${displayAge} Yrs</td>
            <td class="address-col">${completeAddressHtml}</td>
            <td style="position: relative;">
                <div class="status-select-wrapper" style="display: inline-block;">
                    <div class="status-trigger ${triggerClass}" onclick="window.toggleStatusDropdown(this)" aria-label="Change Status">
                        ${safeStatus}
                    </div>
                    <div class="status-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid var(--border-color); border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; min-width: 150px; padding: 4px 0; max-height: 200px; overflow-y: auto;">
                        <div class="dropdown-item ${safeStatus === 'Verified' ? 'selected' : ''}" onclick="window.updateLocalCitizenStatus('${docId}', 'Verified', this)">Verified</div>
                        <div class="dropdown-item ${safeStatus === 'Registered' ? 'selected' : ''}" onclick="window.updateLocalCitizenStatus('${docId}', 'Registered', this)">Registered</div>
                        <div class="dropdown-item ${safeStatus === 'Pending' ? 'selected' : ''}" onclick="window.updateLocalCitizenStatus('${docId}', 'Pending', this)">Pending</div>
                        <div class="dropdown-item ${safeStatus === 'Rejected' ? 'selected' : ''}" onclick="window.updateLocalCitizenStatus('${docId}', 'Rejected', this)">Rejected</div>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

window.toggleStatusDropdown = function(element) {
    const openMenu = element.nextElementSibling;
    document.querySelectorAll('.status-dropdown-menu').forEach((menu) => {
        if (menu !== openMenu) menu.classList.remove('visible-show');
    });
    if (openMenu) openMenu.classList.toggle('visible-show');
};

// REVISION: Error handling replaces native alert with inline table cell message
window.updateLocalCitizenStatus = async function(docId, newStatus, clickedElement) {
    const citizen = localCitizensCache.find(c => c.id === docId);
    if (!citizen) return;
    
    const previousStatus = citizen.status;
    const previousId = citizen.seniorId;

    citizen.status = newStatus;
    
    if (newStatus === "Verified") citizen.seniorId = "SC-2026-" + Math.floor(1000 + Math.random() * 9000);
    else if (newStatus === "Pending") citizen.seniorId = "SC-PENDING";
    else if (newStatus === "Rejected") citizen.seniorId = "SC-REJECTED";
    else if (newStatus === "Registered") citizen.seniorId = "SC-2026-" + Math.floor(1000 + Math.random() * 9000);

    applyFilterAndRenderTable();
    renderCharts();

    const token = getAdminToken();
    if (!token) return;

    if (!String(docId).startsWith('doc_') && !String(docId).startsWith('SC-')) {
        try {
            const response = await fetch(`${API_BASE}/social/citizens/${docId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) throw new Error("API Failure");

        } catch (err) {
            citizen.status = previousStatus;
            citizen.seniorId = previousId;
            applyFilterAndRenderTable();
            renderCharts();
            
            // Inline DOM error feedback (No Alerts)
            if (clickedElement) {
                const trNode = clickedElement.closest('tr');
                if (trNode) {
                    const tempDiv = document.createElement('div');
                    tempDiv.style = "position: absolute; right: 20px; color: #ef4444; font-size: 11px; font-weight: 600; padding: 4px; z-index: 100;";
                    tempDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Network Failed`;
                    trNode.querySelector('td:last-child').appendChild(tempDiv);
                    setTimeout(() => tempDiv.remove(), 2500);
                }
            }
        }
    }
};

let ageChartInstance = null;
let statusChartInstance = null;

function renderCharts() {
    let ageGroups = { '60-65': 0, '66-70': 0, '71-75': 0, '76+': 0 };
    localCitizensCache.forEach(c => {
        const age = parseInt(c.age);
        if (age >= 60 && age <= 65) ageGroups['60-65']++;
        else if (age >= 66 && age <= 70) ageGroups['66-70']++;
        else if (age >= 71 && age <= 75) ageGroups['71-75']++;
        else if (age > 75) ageGroups['76+']++;
    });

    let statusCounts = { 'Verified': 0, 'Pending': 0, 'Registered': 0, 'Rejected': 0 };
    localCitizensCache.forEach(c => {
        const stat = (c.status || '').charAt(0).toUpperCase() + (c.status || '').slice(1).toLowerCase();
        if (statusCounts[stat] !== undefined) {
            statusCounts[stat]++;
        }
    });

    if (ageChartInstance) ageChartInstance.destroy();
    if (statusChartInstance) statusChartInstance.destroy();

    const ageCtx = document.getElementById('ageDemographicsChart');
    if (ageCtx) {
        ageChartInstance = new Chart(ageCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(ageGroups),
                datasets: [{
                    label: 'Number of Seniors',
                    data: Object.values(ageGroups),
                    backgroundColor: '#1A6B3B',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    const statCtx = document.getElementById('statusDistributionChart');
    if (statCtx) {
        statusChartInstance = new Chart(statCtx, {
            type: 'doughnut',
            data: {
                labels: ['Verified', 'Pending', 'Registered', 'Rejected'],
                datasets: [{
                    data: [statusCounts['Verified'], statusCounts['Pending'], statusCounts['Registered'], statusCounts['Rejected']],
                    backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }
}

// Added to fulfill Mobile Action Pattern
function setupExportFeatures() {
    const primaryDownloadBtn = document.getElementById("btn-export-directory");
    const mobileDownloadBtn = document.getElementById("btn-export-directory-mobile");
  
    const runExportSequence = () => {
      if (localCitizensCache.length === 0) return;
  
      let csvLines = ["System ID,Senior ID,First Name,Last Name,Age,Birthdate,Address,City,Province,Zip,Status"];
      localCitizensCache.forEach((item) => {
        const row = [
          item.id,
          item.seniorId,
          `"${item.firstName}"`,
          `"${item.lastName}"`,
          item.age,
          item.birthdate,
          `"${item.street}"`,
          `"${item.city}"`,
          `"${item.province}"`,
          item.zip,
          `"${item.status}"`,
        ];
        csvLines.push(row.join(","));
      });
  
      const textBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const temporaryUrl = URL.createObjectURL(textBlob);
      const auxiliaryAnchor = document.createElement("a");
  
      auxiliaryAnchor.setAttribute("href", temporaryUrl);
      auxiliaryAnchor.setAttribute("download", `Brgy_SenEtizens_Directory_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(auxiliaryAnchor);
      auxiliaryAnchor.click();
  
      document.body.removeChild(auxiliaryAnchor);
      URL.revokeObjectURL(temporaryUrl);
    };
  
    if (primaryDownloadBtn) primaryDownloadBtn.addEventListener("click", runExportSequence);
    if (mobileDownloadBtn) mobileDownloadBtn.addEventListener("click", runExportSequence);
  }