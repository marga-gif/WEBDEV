let localCitizensCache = [
    {
        id: "doc_001",
        seniorId: "SC-PENDING",
        firstName: "Tomas",
        lastName: "Aquino",
        age: 61,
        birthdate: "1965-07-09",
        purok: "N/A",
        blockLot: "Blk 1 Lot 5",
        status: "Pending",
        emergencyContactName: "Clarissa Aquino",
        emergencyContactPhone: "0922-444-5555"
    },
    {
        id: "doc_002",
        seniorId: "SC-2026-0841",
        firstName: "Juan",
        lastName: "Dela Cruz",
        age: 68,
        birthdate: "1958-03-15",
        purok: "N/A",
        blockLot: "Blk 4 Lot 12",
        status: "Verified",
        emergencyContactName: "Maria Dela Cruz",
        emergencyContactPhone: "0917-123-4567"
    },
    {
        id: "doc_003",
        seniorId: "SC-2026-1102",
        firstName: "Elena",
        lastName: "Santos",
        age: 72,
        birthdate: "1954-11-22",
        purok: "N/A",
        blockLot: "Lot 2B",
        status: "Verified",
        emergencyContactName: "Roberto Santos",
        emergencyContactPhone: "0918-765-4321"
    }
];

const API_BASE = window.API_BASE;

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

async function loadCitizensFromApi() {
    const token = ensureAdminAuth();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/social/citizens`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Failed to load citizens');
        const data = await res.json();
        if (Array.isArray(data)) {
            localCitizensCache = data;
        }
    } catch (err) {
        console.warn('Could not load citizens from API:', err);
    }
}

// UI Configuration State
let currentPage = 1;
const itemsPerPage = 2; 
let currentFilterStatus = "All"; 
let isEditingDrawer = false; // Tracks whether the drawer is in read-only or edit mode

document.addEventListener('DOMContentLoaded', async () => {
    // Inject mobile responsive style overrides
    const responsiveStyleOverride = document.createElement('style');
    responsiveStyleOverride.innerHTML = `
        @media screen and (max-width: 768px) {
            .sidebar.mobile-visible {
                transform: translateX(0) !important;
                box-shadow: 10px 0 30px rgba(0,0,0,0.25);
            }
        }
        /* Style adjustments for inline drawer inputs to look modern and fit the UI */
        .drawer-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 14px;
            margin-top: 4px;
            font-family: inherit;
            color: var(--text-main);
        }
        .drawer-input:focus {
            outline: none;
            border-color: var(--primary-green);
        }
        .drawer-actions-row {
            display: flex;
            gap: 10px;
            margin-top: 12px;
        }
    `;
    document.head.appendChild(responsiveStyleOverride);

    if (!checkAdminAuth()) return;
    populateAdminName();
    setupMobileMenuToggle();
    setupFilterCycle();
    setupSearchFilters();
    setupDrawerInteractions();
    setupLogoutButton();

    await loadCitizensFromApi();
    updateMetricsDashboardCards();
    applyFilterAndRenderTable();
});

// ==========================================
// 1. MOBILE MENU HAMBURGER NAVIGATION OVERLAY
// ==========================================
function setupMobileMenuToggle() {
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

// ==========================================
// 2. CYCLING FILTER BUTTON CONTROLLER
// ==========================================
function setupFilterCycle() {
    const filterBtn = document.getElementById('btn-filter');
    const labelSpan = document.getElementById('filter-current-label');

    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (currentFilterStatus === "All") {
                currentFilterStatus = "Verified";
            } else if (currentFilterStatus === "Verified") {
                currentFilterStatus = "Pending";
            } else {
                currentFilterStatus = "All";
            }

            if (labelSpan) labelSpan.textContent = currentFilterStatus;
            currentPage = 1; 
            applyFilterAndRenderTable();
        });
    }
}

// ==========================================
// 3. SEARCH & ARRAYS EVALUATION INTERFACE
// ==========================================
function setupSearchFilters() {
    const searchInput = document.getElementById('search-citizen');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFilterAndRenderTable();
        });
    }
}

function applyFilterAndRenderTable() {
    const tableBody = document.getElementById('citizens-table-body');
    const searchInput = document.getElementById('search-citizen');
    const entriesLabel = document.getElementById('showing-entries');
    
    if (!tableBody) return;
    const searchString = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const computationalResults = localCitizensCache.filter(citizen => {
        const matchesSearch = !searchString || 
            `${citizen.firstName} ${citizen.lastName}`.toLowerCase().includes(searchString) || 
            (citizen.seniorId || '').toLowerCase().includes(searchString);

        const matchesStatus = currentFilterStatus === "All" || 
            citizen.status.toLowerCase() === currentFilterStatus.toLowerCase();

        return matchesSearch && matchesStatus;
    });

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
                <td colspan="6" class="table-empty-state" style="text-align:center; padding: 40px 0;">
                    <i class="fas fa-search-minus fa-2x" style="opacity: 0.4; margin-bottom:10px; display:block;"></i>
                    No records match your criteria.
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
    leftArrow.className = 'btn-icon';
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
    rightArrow.className = 'btn-icon';
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

function generateTableRow(docId, data) {
    const badgeClass = String(data.status).toLowerCase() === 'verified' ? 'verified' : 'pending';
    const displayId = data.seniorId || 'SC-PENDING';
    const displayFullName = `${data.lastName || ''}, ${data.firstName || ''}`.toUpperCase();
    const displayAge = data.age || '--';
    const displayBirthdate = data.birthdate || 'N/A';
    const displayPurok = data.purok || 'N/A';
    const displayBlock = data.blockLot || '';
    const displayStatus = data.status || 'Pending';

    return `
        <tr>
            <td><strong>${displayId}</strong></td>
            <td>${displayFullName}</td>
            <td>
                ${displayAge} Years Old
                <span class="sub-text" style="display:block; font-size:12px; color:var(--text-muted); margin-top:2px;">${displayBirthdate}</span>
            </td>
            <td>
                ${displayPurok}
                <span class="sub-text" style="display:block; font-size:12px; color:var(--text-muted); margin-top:2px;">${displayBlock}</span>
            </td>
            <td><span class="badge ${badgeClass}">${displayStatus}</span></td>
            <td>
                <button class="btn-icon" onclick="window.openProfileDrawer('${docId}')" title="View Profile">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" title="Quick Edit Status" onclick="window.toggleCitizenStatus('${docId}')">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
        </tr>
    `;
}

// Inline Status Switch Feature (Triggers when clicking the pen icon in the table)
window.toggleCitizenStatus = function(docId) {
    const citizen = localCitizensCache.find(c => c.id === docId);
    if (!citizen) return;
    
    citizen.status = citizen.status === "Verified" ? "Pending" : "Verified";
    if (citizen.status === "Verified" && citizen.seniorId === "SC-PENDING") {
        citizen.seniorId = "SC-2026-" + Math.floor(1000 + Math.random() * 9000);
    } else if (citizen.status === "Pending") {
        citizen.seniorId = "SC-PENDING";
    }
    
    updateMetricsDashboardCards();
    applyFilterAndRenderTable();

    // Persist status change to backend when possible
    const token = getAdminToken();
    if (!token) return; // keep local fallback

    // If id looks like a backend uid (not our local placeholder), attempt to PATCH
    if (!String(docId).startsWith('doc_') && !String(docId).startsWith('SC-')) {
        fetch(`${API_BASE}/social/citizens/${docId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({ status: citizen.status }),
        }).then((res) => {
            if (!res.ok) {
                console.warn('Failed to persist citizen status change');
            }
        }).catch((err) => console.warn('Citizen status persist error', err));
    }
};

function updateMetricsDashboardCards() {
    let verifiedCount = 0;
    let pendingCount = 0;

    localCitizensCache.forEach(c => {
        if (String(c.status).toLowerCase() === 'verified') verifiedCount++;
        else pendingCount++;
    });

    const totalEl = document.getElementById('metric-total-seniors');
    const verifiedEl = document.getElementById('metric-verified');
    const pendingEl = document.getElementById('metric-pending');

    if (totalEl) totalEl.textContent = localCitizensCache.length;
    if (verifiedEl) verifiedEl.textContent = verifiedCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
}

function setupDrawerInteractions() {
    const drawer = document.getElementById('profile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('close-drawer');
    let dynamicActiveTab = 'personal';
    let currentOpenDocId = null;
    let pendingTabSwitchBtn = null; // Tracks which tab they clicked before the warning

    // Custom Modal Elements
    const confirmModal = document.getElementById('discard-confirm-modal');
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const proceedBtn = document.getElementById('btn-confirm-discard');
    const cancelBtnModal = document.getElementById('btn-cancel-discard');
    const closeIconModal = document.getElementById('close-discard-modal-btn');

    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
        isEditingDrawer = false;
        currentOpenDocId = null;
    };

    if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if(overlay) overlay.addEventListener('click', closeDrawer);

    // --- Modal Warning Controllers ---
    const hideConfirmModal = () => {
        if(modalOverlay) modalOverlay.style.display = "none";
        if(confirmModal) confirmModal.style.display = "none";
        pendingTabSwitchBtn = null;
    };

    if(cancelBtnModal) cancelBtnModal.addEventListener('click', hideConfirmModal);
    if(closeIconModal) closeIconModal.addEventListener('click', hideConfirmModal);
    
    // If they click "Discard Changes"
    if(proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            isEditingDrawer = false;
            hideConfirmModal();
            
            if (pendingTabSwitchBtn) {
                const tabButtons = document.querySelectorAll('.drawer-tabs .tab-btn');
                tabButtons.forEach(t => t.classList.remove('active'));
                pendingTabSwitchBtn.classList.add('active');
                
                dynamicActiveTab = pendingTabSwitchBtn.getAttribute('data-tab');
                const citizen = localCitizensCache.find(c => c.id === currentOpenDocId);
                if (citizen) renderTabPaneContent(citizen, dynamicActiveTab);
            }
        });
    }

    window.openProfileDrawer = function(docId) {
        currentOpenDocId = docId;
        isEditingDrawer = false;
        dynamicActiveTab = 'personal';
        
        const citizen = localCitizensCache.find(c => c.id === docId);
        if (!citizen) return;

        updateDrawerHeroSection(citizen);

        const tabButtons = document.querySelectorAll('.drawer-tabs .tab-btn');
        tabButtons.forEach((t, idx) => {
            if(idx === 0) t.classList.add('active');
            else t.classList.remove('active');
        });

        renderTabPaneContent(citizen, dynamicActiveTab);

        drawer.classList.add('open');
        overlay.classList.add('active');
    };

    const tabButtons = document.querySelectorAll('.drawer-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isEditingDrawer) {
                // Trigger custom modal instead of native confirm
                pendingTabSwitchBtn = btn;
                if(modalOverlay) modalOverlay.style.display = "block";
                if(confirmModal) confirmModal.style.display = "flex";
                return;
            }
            
            tabButtons.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            
            dynamicActiveTab = btn.getAttribute('data-tab');
            const citizen = localCitizensCache.find(c => c.id === currentOpenDocId);
            if (citizen) renderTabPaneContent(citizen, dynamicActiveTab);
        });
    });

    function updateDrawerHeroSection(citizen) {
        document.getElementById('detail-name').innerText = `${citizen.lastName}, ${citizen.firstName}`.toUpperCase();
        document.getElementById('detail-id').innerText = citizen.seniorId || 'SC-N/A';
        
        const statusBadge = document.getElementById('detail-status');
        if (statusBadge) {
            statusBadge.innerText = citizen.status || 'Pending';
            statusBadge.className = `badge ${String(citizen.status).toLowerCase() === 'verified' ? 'verified' : 'pending'}`;
        }
    }

    function renderTabPaneContent(citizen, tab) {
        const paneContent = document.getElementById('tab-personal');
        if (!paneContent) return;

        if (tab === 'emergency') {
            if (isEditingDrawer) {
                paneContent.innerHTML = `
                    <div class="detail-group">
                        <label>Contact Person <span style="color:#EF4444;">*</span></label>
                        <input type="text" id="edit-emg-name" class="drawer-input" value="${citizen.emergencyContactName || ''}" placeholder="e.g. Maria Dela Cruz">
                    </div>
                    <div class="detail-group">
                        <label>Phone Number <span style="color:#EF4444;">*</span></label>
                        <input type="text" id="edit-emg-phone" class="drawer-input" value="${citizen.emergencyContactPhone || ''}" placeholder="e.g. 0917-123-4567">
                    </div>
                    <div class="drawer-actions-row">
                        <button id="btn-save-drawer" class="btn-primary" style="padding:8px 16px; font-size:12px;"><i class="fas fa-save"></i> Save</button>
                        <button id="btn-cancel-drawer" class="btn-secondary" style="padding:8px 16px; font-size:12px;">Cancel</button>
                    </div>
                `;
            } else {
                paneContent.innerHTML = `
                    <div class="detail-group">
                        <label>Contact Person</label>
                        <p>${citizen.emergencyContactName || 'None Logged'}</p>
                    </div>
                    <div class="detail-group">
                        <label>Phone Number</label>
                        <p>${citizen.emergencyContactPhone || 'N/A'}</p>
                    </div>
                    <button id="btn-edit-drawer" class="btn-secondary w-100 mt-3"><i class="fas fa-edit"></i> Edit Emergency Info</button>
                `;
            }
        } else if (tab === 'history') {
            paneContent.innerHTML = `
                <div class="detail-group">
                    <label>Recent System Activity</label>
                    <p style="font-size: 13px; opacity: 0.85; margin-bottom:6px;"><i class="fas fa-check-circle" style="color:var(--primary-green);"></i> Account profile verified offline.</p>
                    <p style="font-size: 13px; opacity: 0.85;"><i class="fas fa-clock" style="color:var(--text-muted);"></i> Form variables synchronized perfectly.</p>
                </div>
            `;
        } else {
            // Personal Data View Tab
            if (isEditingDrawer) {
                paneContent.innerHTML = `
                    <div class="detail-group">
                        <label>First Name <span style="color:#EF4444;">*</span></label>
                        <input type="text" id="edit-fname" class="drawer-input" value="${citizen.firstName}">
                    </div>
                    <div class="detail-group">
                        <label>Last Name <span style="color:#EF4444;">*</span></label>
                        <input type="text" id="edit-lname" class="drawer-input" value="${citizen.lastName}">
                    </div>
                    <div class="detail-group">
                        <label>Age <span style="color:#EF4444;">*</span></label>
                        <input type="number" id="edit-age" class="drawer-input" value="${citizen.age}">
                    </div>
                    <div class="detail-group">
                        <label>Birthdate <span style="color:#EF4444;">*</span></label>
                        <input type="date" id="edit-bdate" class="drawer-input" value="${citizen.birthdate}">
                    </div>
                    <div class="detail-group">
                        <label>Purok / Area</label>
                        <input type="text" id="edit-purok" class="drawer-input" value="${citizen.purok || ''}">
                    </div>
                    <div class="detail-group">
                        <label>Block / Lot / Street Address</label>
                        <input type="text" id="edit-block" class="drawer-input" value="${citizen.blockLot || ''}">
                    </div>
                    <div class="drawer-actions-row">
                        <button id="btn-save-drawer" class="btn-primary" style="padding:8px 16px; font-size:12px;"><i class="fas fa-save"></i> Save Changes</button>
                        <button id="btn-cancel-drawer" class="btn-secondary" style="padding:8px 16px; font-size:12px;">Cancel</button>
                    </div>
                `;
            } else {
                paneContent.innerHTML = `
                    <div class="detail-group">
                        <label>Age</label>
                        <p>${citizen.age || '--'} Years Old</p>
                    </div>
                    <div class="detail-group">
                        <label>Birthdate</label>
                        <p>${citizen.birthdate || '-'}</p>
                    </div>
                    <div class="detail-group">
                        <label>Address</label>
                        <p>${`${citizen.purok || ''} ${citizen.blockLot || ''}`.trim() || '-'}</p>
                    </div>
                    <button id="btn-edit-drawer" class="btn-secondary w-100 mt-3"><i class="fas fa-edit"></i> Edit Details</button>
                `;
            }
        }

        attachDrawerFormEventListeners(citizen);
    }

    function attachDrawerFormEventListeners(citizen) {
        const editBtn = document.getElementById('btn-edit-drawer');
        const saveBtn = document.getElementById('btn-save-drawer');
        const cancelBtn = document.getElementById('btn-cancel-drawer');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                isEditingDrawer = true;
                renderTabPaneContent(citizen, dynamicActiveTab);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                isEditingDrawer = false;
                renderTabPaneContent(citizen, dynamicActiveTab);
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // STRENGTHENED VALIDATION LOGIC
                const textRegex = /^[A-Za-zÑñ\s\-\.,']+$/;
                const phoneRegex = /^(?:\+63|0)[0-9\-\s]{9,13}$/;

                if (dynamicActiveTab === 'personal') {
                    const fname = document.getElementById('edit-fname').value.trim();
                    const lname = document.getElementById('edit-lname').value.trim();
                    const age = parseInt(document.getElementById('edit-age').value);
                    const bdate = document.getElementById('edit-bdate').value;
                    const purok = document.getElementById('edit-purok').value.trim();
                    const block = document.getElementById('edit-block').value.trim();

                    if (!fname || !lname) return alert("Action Blocked: First and Last name are strictly required.");
                    if (!textRegex.test(fname) || !textRegex.test(lname)) return alert("Action Blocked: Names must not contain numbers or illegal special characters.");
                    if (!age || age < 60 || age > 120) return alert("Action Blocked: Please enter a valid senior citizen age (60-120).");
                    if (!bdate) return alert("Action Blocked: Birthdate is required.");

                    citizen.firstName = fname;
                    citizen.lastName = lname;
                    citizen.age = age;
                    citizen.birthdate = bdate;
                    citizen.purok = purok;
                    citizen.blockLot = block;

                } else if (dynamicActiveTab === 'emergency') {
                    const emgName = document.getElementById('edit-emg-name').value.trim();
                    const emgPhone = document.getElementById('edit-emg-phone').value.trim();

                    if (!emgName || !emgPhone) return alert("Action Blocked: Emergency Contact Name and Phone Number are required.");
                    if (!textRegex.test(emgName)) return alert("Action Blocked: Emergency contact name contains invalid characters.");
                    if (!phoneRegex.test(emgPhone)) return alert("Action Blocked: Please enter a valid Philippine contact number format.");

                    citizen.emergencyContactName = emgName;
                    citizen.emergencyContactPhone = emgPhone;
                }

                isEditingDrawer = false;
                updateDrawerHeroSection(citizen);
                renderTabPaneContent(citizen, dynamicActiveTab);
                applyFilterAndRenderTable();
                updateMetricsDashboardCards();
            });
        }
    }
}
