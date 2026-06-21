let localRequestsCache = [
    {
        id: "req_001",
        requestId: "REQ-2026-001",
        citizenName: "AQUINO, TOMAS",
        documentType: "Barangay Clearance",
        dateSubmitted: "2026-06-11",
        status: "Pending Review"
    },
    {
        id: "req_002",
        requestId: "REQ-2026-002",
        citizenName: "DELA CRUZ, JUAN",
        documentType: "Senior Citizen ID Indigency",
        dateSubmitted: "2026-06-10",
        status: "Processing"
    },
    {
        id: "req_003",
        requestId: "REQ-2026-003",
        citizenName: "SANTOS, ELENA",
        documentType: "Social Pension Certification",
        dateSubmitted: "2026-06-09",
        status: "Ready for Pickup"
    },
    {
        id: "req_004",
        requestId: "REQ-2026-004",
        citizenName: "ALMANZOR, PEDRO",
        documentType: "Barangay Clearance",
        dateSubmitted: "2026-06-08",
        status: "Completed"
    }
];

const API_BASE = window.API_BASE;
let currentActiveFilter = "all";
let currentPage = 1;
let itemsPerPage = 10;

function getAdminToken() {
    const storedAuth = JSON.parse(localStorage.getItem('barangay_admin_auth') || 'null');
    return storedAuth && storedAuth.idToken ? storedAuth.idToken : null;
}

function normalizeStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'pending' || normalized === 'pending review') return 'Pending Review';
    if (normalized === 'processing') return 'Processing';
    if (normalized === 'ready' || normalized === 'ready for pickup') return 'Ready for Pickup';
    if (normalized === 'completed') return 'Completed';
    return 'Pending Review';
}

function normalizeRequestItem(item) {
    const createdDate = item.dateSubmitted || item.createdDate || item.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return {
        id: item.id || item.requestId || `req_${Date.now()}`,
        requestId: item.requestId || `REQ-${String(item.id || Date.now()).slice(-8)}`,
        citizenName: item.citizenName || item.fullName || item.userDisplayName || 'Unknown Citizen',
        citizenEmail: item.citizenEmail || item.email || '',
        documentType: item.documentType || item.category || 'Document Request',
        dateSubmitted: createdDate,
        status: normalizeStatus(item.status),
        category: item.category || '',
        userId: item.userId || '',
        purpose: item.purpose || '',
        adminNotes: item.adminNotes || '',
    };
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

function populateAdminName(selector = 'auth-admin-name') {
    const adminNameEl = document.getElementById(selector);
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

function ensureAdminAuth() {
    const token = getAdminToken();
    if (!token) {
        window.location.href = '../auth/index.html';
        return null;
    }
    return token;
}

async function loadDocumentRequests() {
    const token = ensureAdminAuth();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/government/requests`, {
            headers: { Authorization: 'Bearer ' + token },
        });

        if (!response.ok) {
            throw new Error('Unable to load requests');
        }

        const data = await response.json();
        if (Array.isArray(data)) {
            localRequestsCache = data.map(normalizeRequestItem);
            console.log(`Loaded ${localRequestsCache.length} document requests from Firestore`);
        }
    } catch (error) {
        console.warn('Document requests load failed:', error);
        // Keep using mock data if API fails
    }

    recalculateTabCounts();
    applyFiltersAndRenderTable();
}

document.addEventListener('DOMContentLoaded', async () => {
    const responsiveOverride = document.createElement('style');
    responsiveOverride.innerHTML = `
        @media screen and (max-width: 768px) {
            .menu-toggle { display: block !important; }
            .sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
            .sidebar.mobile-visible {
                transform: translateX(0) !important;
                box-shadow: 10px 0 30px rgba(0,0,0,0.25);
            }
            .main-content { margin-left: 0 !important; }
            .topbar { 
                padding: 15px !important; 
                height: auto !important; 
                flex-direction: column !important; 
                align-items: flex-start !important; 
                gap: 15px !important; 
            }
            .action-group { width: 100% !important; justify-content: space-between !important; display: flex !important; gap: 10px; }
            .action-group button { flex: 1 !important; text-align: center; justify-content: center; }
            .table-controls-bar { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
            .table-controls-bar .search-box { width: 100% !important; }
            .controls-right-group { width: 100% !important; justify-content: space-between !important; display: flex !important; }
            .dashboard-viewport { padding: 15px !important; }
            .pagination-info-wrapper { width: 100%; justify-content: space-between; display: flex; align-items: center; margin-top: 5px; }
        }
        .status-dropdown-menu.visible-show {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(responsiveOverride);
    
    if (!checkAdminAuth()) return;
    
    populateAdminName();
    setupMobileMenuBurger();
    setupTabFiltering();
    setupSearchFilters();
    setupDropdownActionToggles();
    setupExportFeatures();
    setupPaginationConfigs();
    setupLogoutButton();

    // Load data from Firestore before rendering
    await loadDocumentRequests();
});

function setupMobileMenuBurger() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');
    
    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-visible');
        });

        document.addEventListener('click', (e) => {
            if (sidebarMenu.classList.contains('mobile-visible') && !sidebarMenu.contains(e.target) && e.target !== burgerBtn) {
                sidebarMenu.classList.remove('mobile-visible');
            }
        });
    }
}

function recalculateTabCounts() {
    const counts = { all: localRequestsCache.length, pending: 0, processing: 0, ready: 0, completed: 0 };
    
    localRequestsCache.forEach(req => {
        const stat = (req.status || '').trim();
        if (stat === 'Pending Review') counts.pending++;
        else if (stat === 'Processing') counts.processing++;
        else if (stat === 'Ready for Pickup') counts.ready++;
        else if (stat === 'Completed') counts.completed++;
    });
    document.getElementById('count-all').innerText = counts.all;
    document.getElementById('count-pending').innerText = counts.pending;
    document.getElementById('count-processing').innerText = counts.processing;
    document.getElementById('count-ready').innerText = counts.ready;
    document.getElementById('count-completed').innerText = counts.completed;
}

function setupDropdownActionToggles() {
    const toggleFilterBtn = document.getElementById('btn-filter-toggle');
    const filterLabelSpan = document.getElementById('current-filter-label');

    if (toggleFilterBtn) {
        toggleFilterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const tabsOrder = ["all", "pending", "processing", "ready", "completed"];
            let nextIndex = (tabsOrder.indexOf(currentActiveFilter) + 1) % tabsOrder.length;
            currentActiveFilter = tabsOrder[nextIndex];

            if (filterLabelSpan) {
                filterLabelSpan.textContent = currentActiveFilter.charAt(0).toUpperCase() + currentActiveFilter.slice(1);
            }
            const targetTabs = document.querySelectorAll('.doc-tab');
            targetTabs.forEach(tab => {
                if (tab.getAttribute('data-filter') === currentActiveFilter) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            currentPage = 1;
            applyFiltersAndRenderTable();
        });
    }
}

function setupSearchFilters() {
    const searchInput = document.getElementById('search-document');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFiltersAndRenderTable();
        });
    }
}

function applyFiltersAndRenderTable() {
    const tableBody = document.getElementById('documents-table-body');
    const searchInput = document.getElementById('search-document');
    const paginationSpan = document.getElementById('showing-entries-text');
    
    if (!tableBody) return;
    const queryText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filteredRequests = localRequestsCache.filter(req => {
        const stat = (req.status || '').trim();
        
        let matchesTab = (currentActiveFilter === "all");
        if (currentActiveFilter === "pending" && stat === "Pending Review") matchesTab = true;
        if (currentActiveFilter === "processing" && stat === "Processing") matchesTab = true;
        if (currentActiveFilter === "ready" && stat === "Ready for Pickup") matchesTab = true;
        if (currentActiveFilter === "completed" && stat === "Completed") matchesTab = true;

        const textTarget = `${req.requestId || ''} ${req.citizenName || ''} ${req.documentType || ''}`.toLowerCase();
        const matchesSearch = !queryText || textTarget.includes(queryText);

        return matchesTab && matchesSearch;
    });

    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedSlice = filteredRequests.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    if (totalItems === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty-state" style="text-align:center; padding: 40px 0;">
                    <i class="fas fa-folder-open fa-2x" style="opacity: 0.4; margin-bottom:10px; display:block;"></i>
                    No document requests matched your current parameters.
                </td>
            </tr>`;
        if (paginationSpan) paginationSpan.textContent = "Showing 0 to 0 of 0 requests";
        renderPaginationControls(totalPages);
        return;
    }

    paginatedSlice.forEach(req => {
        tableBody.appendChild(generateTableRowElement(req));
    });

    if (paginationSpan) {
        paginationSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} requests`;
    }
    renderPaginationControls(totalPages);
}

function generateTableRowElement(req) {
    const tr = document.createElement('tr');
    
    let triggerClass = 'trigger-pending';
    if (req.status === 'Processing') triggerClass = 'trigger-processing';
    else if (req.status === 'Ready for Pickup') triggerClass = 'trigger-ready';
    else if (req.status === 'Completed') triggerClass = 'trigger-completed';

    const rowStatus = req.status || 'Pending Review';

    tr.innerHTML = `
        <td><strong>${req.requestId || 'REQ-N/A'}</strong></td>
        <td>${req.citizenName || 'Unknown Citizen'}</td>
        <td>${req.documentType || 'General Certification'}</td>
        <td>${req.dateSubmitted || '--:--'}</td>
        <td>
            <div class="status-select-wrapper" style="position: relative;">
                <div class="status-trigger ${triggerClass}" onclick="window.toggleStatusDropdown(this)">
                    <span>${rowStatus}</span> <i class="fas fa-chevron-down"></i>
                </div>
                <div class="status-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid var(--border-color); border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; min-width: 160px; padding: 4px 0; max-height: 120px; overflow-y: auto;">
                    <div class="dropdown-item ${rowStatus === 'Pending Review' ? 'selected' : ''}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Pending Review')">Pending Review</div>
                    <div class="dropdown-item ${rowStatus === 'Processing' ? 'selected' : ''}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Processing')">Processing</div>
                    <div class="dropdown-item ${rowStatus === 'Ready for Pickup' ? 'selected' : ''}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Ready for Pickup')">Ready for Pickup</div>
                    <div class="dropdown-item ${rowStatus === 'Completed' ? 'selected' : ''}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Completed')">Completed</div>
                </div>
            </div>
        </td>
    `;
    return tr;
}

window.toggleStatusDropdown = function(element) {
    const openMenu = element.nextElementSibling;
    document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
        if (menu !== openMenu) menu.classList.remove('visible-show');
    });
    if (openMenu) openMenu.classList.toggle('visible-show');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-select-wrapper')) {
        document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
            menu.classList.remove('visible-show');
        });
    }
});

window.updateLocalDocumentStatus = async function(docId, newStatus, element) {
    const targetItem = localRequestsCache.find(r => r.id === docId);
    if (!targetItem) return;

    const previousStatus = targetItem.status;
    targetItem.status = newStatus;
    recalculateTabCounts();
    applyFiltersAndRenderTable();

    const token = getAdminToken();
    if (!token) {
        alert('Admin authentication is required to save status changes. This update is local only.');
        return;
    }

    if (String(docId).startsWith('req_')) {
        // Local-only fallback; no backend ID available.
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/government/requests/${docId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error((await response.json()).error || response.statusText);
        }
    } catch (error) {
        targetItem.status = previousStatus;
        recalculateTabCounts();
        applyFiltersAndRenderTable();
        alert('Unable to save status update. Reverting locally.');
        console.warn('Status update failed:', error);
    }
};

function setupPaginationConfigs() {
    const pageSelect = document.getElementById('records-per-page-select');
    if (pageSelect) {
        pageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value) || 10;
            currentPage = 1;
            applyFiltersAndRenderTable();
        });
    }
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('pagination-buttons-container');
    if (!container) return;

    container.innerHTML = '';
    const firstBtn = document.createElement('button');
    firstBtn.className = 'page-num';
    firstBtn.innerHTML = `<i class="fas fa-angle-double-left"></i>`;
    firstBtn.disabled = (currentPage === 1);
    firstBtn.style.opacity = (currentPage === 1) ? "0.4" : "1";
    firstBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage = 1; applyFiltersAndRenderTable(); } });
    container.appendChild(firstBtn);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-num';
    prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prevBtn.disabled = (currentPage === 1);
    prevBtn.style.opacity = (currentPage === 1) ? "0.4" : "1";
    prevBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage--; applyFiltersAndRenderTable(); } });
    container.appendChild(prevBtn);
    for (let currentIdx = 1; currentIdx <= totalPages; currentIdx++) {
        const numBtn = document.createElement('button');
        numBtn.className = `page-num ${currentIdx === currentPage ? 'active' : ''}`;
        numBtn.textContent = currentIdx;
        numBtn.addEventListener('click', () => {
            currentPage = currentIdx;
            applyFiltersAndRenderTable();
        });
        container.appendChild(numBtn);
    }
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-num';
    nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.style.opacity = (currentPage === totalPages) ? "0.4" : "1";
    nextBtn.addEventListener('click', () => { if(currentPage < totalPages) { currentPage++; applyFiltersAndRenderTable(); } });
    container.appendChild(nextBtn);

    const lastBtn = document.createElement('button');
    lastBtn.className = 'page-num';
    lastBtn.innerHTML = `<i class="fas fa-angle-double-right"></i>`;
    lastBtn.disabled = (currentPage === totalPages);
    lastBtn.style.opacity = (currentPage === totalPages) ? "0.4" : "1";
    lastBtn.addEventListener('click', () => { if(currentPage < totalPages) { currentPage = totalPages; applyFiltersAndRenderTable(); } });
    container.appendChild(lastBtn);
}
 // CSV CONVERTER, EXPORTER
function setupExportFeatures() {
    const topExportBtn = document.getElementById('btn-export-top');
    const primaryDownloadBtn = document.getElementById('btn-download-csv');

    const runExportSequence = () => {
        if (localRequestsCache.length === 0) {
            alert("No data available to export.");
            return;
        }

        let csvLines = ["Request ID,Citizen Name,Document Type,Date Submitted,Status"];
        localRequestsCache.forEach(item => {
            const row = [
                item.requestId || 'N/A',
                `"${item.citizenName || 'Unknown'}"`,
                `"${item.documentType || 'General'}"`,
                item.dateSubmitted || 'N/A',
                `"${item.status || 'Pending'}"`
            ];
            csvLines.push(row.join(","));
        });

        const textBlob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const temporaryUrl = URL.createObjectURL(textBlob);
        const auxiliaryAnchor = document.createElement('a');
        
        auxiliaryAnchor.setAttribute('href', temporaryUrl);
        auxiliaryAnchor.setAttribute('download', `Brgy_Senior_Document_Requests_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(auxiliaryAnchor);
        auxiliaryAnchor.click();
        
        document.body.removeChild(auxiliaryAnchor);
        URL.revokeObjectURL(temporaryUrl);
    };

    if (topExportBtn) topExportBtn.addEventListener('click', runExportSequence);
    if (primaryDownloadBtn) primaryDownloadBtn.addEventListener('click', runExportSequence);
}

function setupTabFiltering() {
    const tabs = document.querySelectorAll('.doc-tab');
    const filterLabelSpan = document.getElementById('current-filter-label');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            currentActiveFilter = tab.getAttribute('data-filter');
            currentPage = 1;
            if (filterLabelSpan) {
                filterLabelSpan.textContent = currentActiveFilter.charAt(0).toUpperCase() + currentActiveFilter.slice(1);
            }
            applyFiltersAndRenderTable();
        });
    });
}

