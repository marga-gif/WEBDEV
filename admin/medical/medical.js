const API_BASE = window.API_BASE;

// FOR DEMO PURPOSES
let mockAppointmentsData = [
    { id: "apt_1", date: "2026-06-05", time: "09:30 AM", patient: "JUAN DELA CRUZ", doctor: "Dr. Maria Santos", purpose: "Hypertension Routine Follow-up" },
    { id: "apt_2", date: "2026-06-11", time: "02:00 PM", patient: "TOMAS AQUINO", doctor: "Dr. Alan Diaz", purpose: "Asthma Nebulization Evaluation" },
    { id: "apt_3", date: "2026-06-15", time: "10:00 AM", patient: "ELENA SANTOS", doctor: "Dr. Elena Abad", purpose: "Diabetic Glucose Fasting Review" },
    { id: "apt_4", date: "2026-06-15", time: "03:15 PM", patient: "CLARA REYES", doctor: "Dr. Maria Santos", purpose: "General Physical Checkup" }
];

// UPDATED: Added contact, hours, and isActive flags
let mockProvidersDirectory = [

    { id: "prov_1", name: "Dr. Maria Santos", type: "Primary Care", location: "Purok 2 Health Center Annex", contact: "0917-111-2222", hours: "8:00 AM - 5:00 PM", isActive: true, status: "Active" },
    { id: "prov_2", name: "Dr. Alan Diaz", type: "Dental", location: "Barangay Central Dental Clinic", contact: "0918-333-4444", hours: "9:00 AM - 4:00 PM", isActive: true, status: "Active" },
    { id: "prov_3", name: "Dr. Elena Abad", type: "Optical", location: "Purok 4 Eyecare Station", contact: "0922-555-6666", hours: "10:00 AM - 3:00 PM", isActive: false, status: "Inactive" },
    { id: "prov_4", name: "Dr. Juanito Ramos", type: "Primary Care", location: "Purok 1 Clinic", contact: "0919-777-8888", hours: "8:00 AM - 6:00 PM", isActive: true, status: "Active" }
];

let currentCalendarDate = new Date(2026, 5, 13); 
let selectedCalendarDayString = ""; 
let directoryCurrentPage = 1;
const directoryItemsPerPage = 6; 
let targetedProviderTypeFilter = "All Types";
let targetedProviderStatusFilter = "All Statuses"; 

function getAdminToken() {
    const storedAuth = JSON.parse(localStorage.getItem('barangay_admin_auth') || 'null');
    return storedAuth && storedAuth.idToken ? storedAuth.idToken : null;
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

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAdminAuth()) return;
    setupMobileMenuToggle();
    setupTabSwitchingLogic();
    initializeCalendarEngine();
    setupProviderDirectoryLogic();
    setupModalFormActionLayer();
    setupRoutingRedirects();
    setupLogoutButton();

    populateAdminName();
    
    const year = currentCalendarDate.getFullYear();
    const month = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentCalendarDate.getDate()).padStart(2, '0');
    selectedCalendarDayString = `${year}-${month}-${day}`;
    
    await loadAppointmentsFromApi();
    renderCalendarGridCanvas();
    renderFilteredAppointmentsList();
    renderProviderDirectoryGrid();
});

async function loadAppointmentsFromApi() {
    const token = ensureAdminAuth();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/medical/appointments`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!response.ok) throw new Error('Unable to fetch appointment data');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            mockAppointmentsData = data.map(item => ({
                id: item.id || `apt_${Date.now()}`,
                date: item.date || '',
                time: item.time || '',
                patient: item.fullName || item.patient || 'Untitled',
                doctor: item.doctorName || item.doctor || 'Unknown',
                purpose: item.medicalAttention || item.purpose || 'Medical request',
            }));
        }
    } catch (error) {
        console.warn('Loading appointments from API failed:', error);
    }
}


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

// Tab View Switching Logic
function setupTabSwitchingLogic() {
    const tabs = document.querySelectorAll('.module-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.getElementById('view-appointments').style.display = 'none';
            document.getElementById('view-appointments').classList.remove('active-grid');
            
            document.getElementById('view-directory').style.display = 'none';
            document.getElementById('view-directory').classList.remove('active-block');
            
            const target = tab.getAttribute('data-target');
            const targetView = document.getElementById(target);
            
            if (target === 'view-appointments') {
                targetView.style.display = ''; 
                targetView.classList.add('active-grid');
            } else {
                targetView.style.display = '';
                targetView.classList.add('active-block');
            }
        });
    });
}

function initializeCalendarEngine() {
    const prevBtn = document.getElementById('btn-calendar-prev');
    const nextBtn = document.getElementById('btn-calendar-next');
    const todayBtn = document.getElementById('btn-calendar-today');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendarGridCanvas();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendarGridCanvas();
        });
    }
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentCalendarDate = new Date(); // Today
            const year = currentCalendarDate.getFullYear();
            const month = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentCalendarDate.getDate()).padStart(2, '0');
            selectedCalendarDayString = `${year}-${month}-${day}`;
            renderCalendarGridCanvas();
            renderFilteredAppointmentsList();
        });
    }
}

function renderCalendarGridCanvas() {
    const canvas = document.getElementById('calendar-grid');
    const displayLabel = document.getElementById('calendar-month-display');
    if (!canvas) return;

    const currentYear = currentCalendarDate.getFullYear();
    const currentMonth = currentCalendarDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (displayLabel) displayLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    canvas.innerHTML = '';

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayLabels.forEach(label => {
        canvas.insertAdjacentHTML('beforeend', `<div class="calendar-weekday-header">${label}</div>`);
    });

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        let dayNum = totalDaysInPrevMonth - firstDayIndex + 1 + i;
        canvas.insertAdjacentHTML('beforeend', `<div class="calendar-day-node other-month">${dayNum}</div>`);
    }

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
        const matchingStringDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        let hasEvent = false;
        if (typeof mockAppointmentsData !== 'undefined' && mockAppointmentsData.length > 0) {
            hasEvent = mockAppointmentsData.some(a => a.date === matchingStringDate);
        }
        
        let hasEventClass = hasEvent ? "has-event" : "";
        let activeSelectionClass = (matchingStringDate === selectedCalendarDayString) ? "active-selected" : "";

        const cellElement = document.createElement('div');
        cellElement.className = `calendar-day-node ${hasEventClass} ${activeSelectionClass}`;
        cellElement.innerHTML = `<span>${dayNum}</span>`;

        cellElement.addEventListener('click', () => {
            selectedCalendarDayString = matchingStringDate;
            document.querySelectorAll('.calendar-day-node').forEach(node => node.classList.remove('active-selected'));
            cellElement.classList.add('active-selected');
            renderFilteredAppointmentsList();
        });

        canvas.appendChild(cellElement);
    }
}

function renderFilteredAppointmentsList() {
    const listContainer = document.getElementById('appointment-list-container');
    const titleLabel = document.getElementById('selected-date-title');
    if (!listContainer) return;

    if (titleLabel) {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const parsedDisplayDate = new Date(selectedCalendarDayString);
        titleLabel.textContent = `Appointments for ${isNaN(parsedDisplayDate) ? selectedCalendarDayString : parsedDisplayDate.toLocaleDateString('en-US', options)}`;
    }

    const dayMatches = mockAppointmentsData.filter(a => a.date === selectedCalendarDayString);
    listContainer.innerHTML = '';

    if (dayMatches.length === 0) {
        listContainer.innerHTML = `<div class="table-empty-state" style="margin-top: 50px;"><i class="far fa-calendar-times" style="display:block; margin-bottom:8px; opacity:0.4; font-size: 24px;"></i>No scheduled clinical consults logged for this timeline.</div>`;
        return;
    }
    dayMatches.forEach(apt => {
        const cardHTML = `
            <div class="appointment-card">
                <div class="apt-time">
                    ${apt.time.split(' ')[0]}
                    <span>${apt.time.split(' ')[1] || ''}</span>
                </div>
                <div class="apt-details" style="text-align: left;">
                    <h4>${apt.patient}</h4>
                    <p><i class="fas fa-user-md" style="margin-right:4px;"></i> ${apt.doctor} — <span style="color:var(--primary-green); font-weight:500;">${apt.purpose}</span></p>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function setupProviderDirectoryLogic() {
    const searchInput = document.getElementById('search-provider-input');
    const typeSelect = document.getElementById('filter-provider-type-select');
    const statusSelect = document.getElementById('filter-provider-status-select'); // NEW
    const triggerFilterBtn = document.getElementById('btn-trigger-filter-action');

    const handleFilterExecution = () => {
        if(typeSelect) targetedProviderTypeFilter = typeSelect.value;
        if(statusSelect) targetedProviderStatusFilter = statusSelect.value;
        directoryCurrentPage = 1;
        renderProviderDirectoryGrid();
    };

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            directoryCurrentPage = 1;
            renderProviderDirectoryGrid();
        });
    }

    if (triggerFilterBtn) triggerFilterBtn.addEventListener('click', handleFilterExecution);
    if (typeSelect) typeSelect.addEventListener('change', handleFilterExecution);
    if (statusSelect) statusSelect.addEventListener('change', handleFilterExecution);
}

// NEW: Global status toggler connected to checkboxes
window.toggleProviderStatus = function(provId) {
    const provider = mockProvidersDirectory.find(p => p.id === provId);
    if(provider) {
        provider.isActive = !provider.isActive;
        provider.status = provider.isActive ? "Active" : "Inactive";
        alert(`System Update: ${provider.name} is now marked as ${provider.status}.`);
        renderProviderDirectoryGrid(); // Refresh to apply UI and filter updates
    }
};

function renderProviderDirectoryGrid() {
    const grid = document.getElementById('provider-grid-container');
    const showingText = document.getElementById('directory-showing');
    const searchInput = document.getElementById('search-provider-input');
    if (!grid) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredArray = mockProvidersDirectory.filter(prov => {
        const matchesSearch = !query || prov.name.toLowerCase().includes(query) || prov.location.toLowerCase().includes(query);
        const matchesType = (targetedProviderTypeFilter === "All Types" || prov.type === targetedProviderTypeFilter);
        
        // NEW Status filtering logic
        const matchesStatus = (targetedProviderStatusFilter === "All Statuses" || 
                              (targetedProviderStatusFilter === "Active" && prov.isActive) ||
                              (targetedProviderStatusFilter === "Inactive" && !prov.isActive));

        return matchesSearch && matchesType && matchesStatus;
    });

    const totalItems = filteredArray.length;
    const totalPages = Math.ceil(totalItems / directoryItemsPerPage) || 1;

    if (directoryCurrentPage > totalPages) directoryCurrentPage = totalPages;

    const startIdx = (directoryCurrentPage - 1) * directoryItemsPerPage;
    const endIdx = Math.min(startIdx + directoryItemsPerPage, totalItems);
    const paginatedSlice = filteredArray.slice(startIdx, endIdx);

    grid.innerHTML = '';

    if (totalItems === 0) {
        grid.innerHTML = `<div class="table-empty-state" style="grid-column: 1 / -1; margin-top: 60px;"><i class="fas fa-address-book" style="display:block; margin-bottom:8px; opacity:0.4; font-size: 24px;"></i>No active healthcare providers match your search parameters.</div>`;
        if(showingText) showingText.textContent = "Showing 0 of 0 providers";
        renderDirectoryPagination(totalPages);
        return;
    }

    paginatedSlice.forEach(p => {
        let colorTheme = "#1A6B3B"; // Emerald hex
        if (p.type === "Dental") colorTheme = "#2563EB"; // Blue
        if (p.type === "Optical") colorTheme = "#D97706"; // Amber

        const cardHTML = `
            <div class="provider-card" style="text-align: left;">
                <div class="provider-header">
                    <div class="provider-icon" style="background-color: ${colorTheme};"><i class="fas fa-user-md"></i></div>
                    <div class="provider-info">
                        <h4>${p.name.toUpperCase()}</h4>
                        <p>${p.type}</p>
                    </div>
                </div>
                
                <div class="provider-detail-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${p.location}</span>
                </div>
                
                <div class="provider-detail-row">
                    <i class="fas fa-phone-alt"></i>
                    <span>${p.contact || 'No contact provided'}</span>
                </div>
                
                <div class="provider-detail-row">
                    <i class="far fa-clock"></i>
                    <span>${p.hours || 'Standard Hours'}</span>
                </div>

                <div class="provider-footer">
                    <span><i class="fas fa-circle" style="color: ${p.isActive ? 'var(--primary-green-bright)' : 'var(--text-muted)'}; font-size: 8px; margin-right: 4px;"></i> ${p.status}</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${p.isActive ? 'checked' : ''} onclick="window.toggleProviderStatus('${p.id}')">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });

    if (showingText) showingText.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalItems} providers`;
    renderDirectoryPagination(totalPages);
}

function renderDirectoryPagination(totalPages) {
    const container = document.getElementById('directory-pagination-container');
    if (!container) return;

    container.innerHTML = '';

    const prevArrow = document.createElement('button');
    prevArrow.className = 'page-num';
    prevArrow.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prevArrow.disabled = (directoryCurrentPage === 1);
    prevArrow.style.opacity = (directoryCurrentPage === 1) ? "0.38" : "1";
    prevArrow.addEventListener('click', () => {
        if (directoryCurrentPage > 1) {
            directoryCurrentPage--;
            renderProviderDirectoryGrid();
        }
    });
    container.appendChild(prevArrow);

    for (let numIdx = 1; numIdx <= totalPages; numIdx++) {
        const numBtn = document.createElement('button');
        numBtn.className = `page-num ${numIdx === directoryCurrentPage ? 'active' : ''}`;
        numBtn.textContent = numIdx;
        numBtn.addEventListener('click', () => {
            directoryCurrentPage = numIdx;
            renderProviderDirectoryGrid();
        });
        container.appendChild(numBtn);
    }
    const nextArrow = document.createElement('button');
    nextArrow.className = 'page-num';
    nextArrow.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    nextArrow.disabled = (directoryCurrentPage === totalPages);
    nextArrow.style.opacity = (directoryCurrentPage === totalPages) ? "0.38" : "1";
    nextArrow.addEventListener('click', () => {
        if (directoryCurrentPage < totalPages) {
            directoryCurrentPage++;
            renderProviderDirectoryGrid();
        }
    });
    container.appendChild(nextArrow);
}

function setupModalFormActionLayer() {
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modal = document.getElementById('add-provider-modal');
    const openBtn = document.getElementById('open-add-provider-btn');
    const closeBtnX = document.getElementById('close-prov-modal-btn');
    const cancelBtn = document.getElementById('cancel-prov-modal-btn');
    const saveBtn = document.getElementById('save-prov-btn'); 

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            if (modalOverlay) modalOverlay.style.display = "block";
            modal.style.display = "flex";
        });
    }
    
    const hideAndResetModalClosure = () => {
        if (modalOverlay) modalOverlay.style.display = "none";
        if (modal) modal.style.display = "none";
        document.getElementById('new-prov-name').value = "";
        document.getElementById('new-prov-type').value = "Primary Care";
        document.getElementById('new-prov-location').value = "";
        document.getElementById('new-prov-contact').value = "";
        document.getElementById('new-prov-hours').value = "Mon-Fri: 8:00 AM - 5:00 PM";
    };
    
    if (closeBtnX) closeBtnX.addEventListener('click', hideAndResetModalClosure);
    if (cancelBtn) cancelBtn.addEventListener('click', hideAndResetModalClosure);

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('new-prov-name');
            const typeInput = document.getElementById('new-prov-type');
            const locInput = document.getElementById('new-prov-location');
            const contactInput = document.getElementById('new-prov-contact');
            const hoursInput = document.getElementById('new-prov-hours');

            const name = nameInput.value.trim();
            const type = typeInput.value;
            const location = locInput.value.trim();
            const contact = contactInput.value.trim();
            const hours = hoursInput.value.trim();

            // --- STRICT VALIDATION RULES ---
            const textRegex = /^[A-Za-z0-9Ññ\s\-\.,'&()]+$/;
            const phoneRegex = /^(?:\+63|0)[0-9\-\s]{9,13}$/;

            // 1. Name Validation
            if (!name || name.length < 3) {
                alert("Action Blocked: Provider Name must be at least 3 characters long.");
                nameInput.focus();
                return;
            }
            if (!textRegex.test(name)) {
                alert("Action Blocked: Provider Name contains invalid special characters.");
                nameInput.focus();
                return;
            }

            // 2. Contact Validation
            if (!contact || !phoneRegex.test(contact)) {
                alert("Action Blocked: A valid regional contact number is required (e.g., 0917-123-4567).");
                contactInput.focus();
                return;
            }

            // 3. Location Validation
            if (!location || location.length < 5) {
                alert("Action Blocked: Location/Address must be specified properly (min 5 characters).");
                locInput.focus();
                return;
            }
            if (!textRegex.test(location)) {
                alert("Action Blocked: Location contains invalid special characters.");
                locInput.focus();
                return;
            }

            const newGeneratedProvider = {
                id: "prov_" + Date.now(),
                name: name,
                type: type,
                location: location,
                contact: contact,
                hours: hours || "Standard Hours",
                isActive: true,
                status: "Active"
            }

            mockProvidersDirectory.unshift(newGeneratedProvider);
            directoryCurrentPage = 1;
            renderProviderDirectoryGrid();
            hideAndResetModalClosure();
        });
    }
}

function setupRoutingRedirects() {
    const viewAllAptsBtn = document.getElementById('btn-view-all-appointments');
    const logoutBtn = document.getElementById('logout-btn');
    if (viewAllAptsBtn) {
        viewAllAptsBtn.addEventListener('click', () => {
            window.location.href = "../social_wellness/index.html";
        });
    }
}