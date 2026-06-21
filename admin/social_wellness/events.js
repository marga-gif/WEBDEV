// 1. DATA CACHE CORES (Restored so the Publish Button has somewhere to save data)
const API_BASE = window.API_BASE;

let localEventsCache = [
    { id: "evt_001", title: "Quarterly Health & Wellness Checkup", scheduleDate: "2026-06-20", timeScope: "08:00 AM", location: "Barangay San Jose Gym", totalRsvps: 38, targetSlots: 100, status: "Upcoming", typeTag: "Medical Assistance" },
    { id: "evt_002", title: "Senior Citizens General Assembly Meeting", scheduleDate: "2026-06-28", timeScope: "01:30 PM", location: "Community Multi-Purpose Hall", totalRsvps: 89, targetSlots: 150, status: "Ongoing", typeTag: "Meeting" },
    { id: "evt_003", title: "Barangay Free Physical Therapy Session", scheduleDate: "2026-05-15", timeScope: "09:00 AM", location: "Health Center Hub", totalRsvps: 50, targetSlots: 50, status: "Completed", typeTag: "Wellness" }
];
let eventRegistrations = [];
let registrationsLoaded = false;
let registrationsFetchError = null;

let mockAttendeesProfileDatabase = {
    "evt_001": [
        { id: "SR-012", name: "Dela Cruz, Juan", checkedIn: true },
        { id: "SR-055", name: "Santos, Elena", checkedIn: false },
        { id: "SR-084", name: "Aquino, Tomas", checkedIn: false }
    ],
    "evt_002": [
        { id: "SR-012", name: "Dela Cruz, Juan", checkedIn: true },
        { id: "SR-033", name: "Reyes, Clara", checkedIn: true },
        { id: "SR-055", name: "Santos, Elena", checkedIn: false },
        { id: "SR-099", name: "Almanzor, Pedro", checkedIn: true }
    ],
    "evt_003": [
        { id: "SR-033", name: "Reyes, Clara", checkedIn: true },
        { id: "SR-099", name: "Almanzor, Pedro", checkedIn: true }
    ]
};

let selectedStatusPillTab = "all";
let chosenActivityTypeFilter = "All"; 
let currentSortOrderDirection = "Newest"; 
let currentlyInspectedEventId = null;
let activeAttendanceSubTab = "all"; 

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

function mapBackendEventToLocal(event) {
    return {
        id: event.id || `evt_${Date.now()}`,
        title: event.title || 'Untitled Event',
        scheduleDate: event.date || event.scheduleDate || '',
        timeScope: event.time || event.timeScope || '',
        location: event.location || 'TBD',
        totalRsvps: event.totalRsvps || 0,
        targetSlots: event.capacity || event.targetSlots || 0,
        status: event.status || determineStatusFromDate(event.date || event.scheduleDate || ''),
        typeTag: event.typeTag || (event.title && event.title.toLowerCase().includes('meeting') ? 'Meeting' : 'Wellness'),
    };
}

function determineStatusFromDate(dateStr) {
    if (!dateStr) return 'Upcoming';
    try {
        const today = new Date();
        const ymd = dateStr.split('T')[0];
        const parts = ymd.split('-');
        if (parts.length !== 3) return 'Upcoming';
        const [y, m, d] = parts.map(Number);
        const evDate = new Date(y, m - 1, d);
        // Compare only the date portion
        const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const e0 = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
        if (e0 > t0) return 'Upcoming';
        if (e0 < t0) return 'Completed';
        return 'Ongoing';
    } catch (err) {
        return 'Upcoming';
    }
}

async function loadEventRegistrationsFromApi() {
    const token = getAdminToken();
    registrationsFetchError = null;
    registrationsLoaded = false;
    eventRegistrations = [];

    if (!token) {
        registrationsFetchError = 'Admin authentication token is missing.';
        registrationsLoaded = true;
        return;
    }

    try {
        console.log('[admin social] fetching event registrations, token present:', !!token);
        const response = await fetch(`${API_BASE}/social/registrations`, {
            headers: {
                Authorization: 'Bearer ' + token,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load registrations (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const payload = Array.isArray(data) ? data : [];

        eventRegistrations = payload.map(reg => ({
            id: reg.id || null,
            eventId: reg.eventId,
            eventTitle: reg.eventTitle || '',
            userId: reg.userId,
            participantName: reg.participantName || 'Unknown Attendee',
            participantEmail: reg.participantEmail || '',
            status: reg.status || 'Registered',
            createdAt: reg.createdAt || '',
        }));

        // Update mock attendees database from registrations
        eventRegistrations.forEach(reg => {
            if (!mockAttendeesProfileDatabase[reg.eventId]) {
                mockAttendeesProfileDatabase[reg.eventId] = [];
            }
            const alreadyExists = mockAttendeesProfileDatabase[reg.eventId].find(a => a.id === reg.userId);
            if (!alreadyExists) {
                mockAttendeesProfileDatabase[reg.eventId].push({
                    id: reg.userId,
                    name: reg.participantName,
                    checkedIn: false,
                });
            }
        });

        // Update event RSVP counts from registrations
        localEventsCache.forEach(evt => {
            const count = eventRegistrations.filter(r => r.eventId === evt.id).length;
            if (count > 0) {
                evt.totalRsvps = count;
            }
        });

        console.log(`[admin social] loaded ${eventRegistrations.length} registrations`, eventRegistrations);
    } catch (error) {
        console.warn('Could not load event registrations from API:', error);
        registrationsFetchError = error.message || 'Unable to load event registrations.';
        eventRegistrations = [];
    } finally {
        registrationsLoaded = true;
    }
}

async function loadEventsFromApi() {
    const token = ensureAdminAuth();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/social/events`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!response.ok) throw new Error('Unable to load events');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            localEventsCache = data.map(mapBackendEventToLocal).map(ev => ({
                ...ev,
                status: determineStatusFromDate(ev.scheduleDate),
            }));
        }
    } catch (error) {
        console.warn('Failed to load social events from API:', error);
    }
    // Load registrations after events
    await loadEventRegistrationsFromApi();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAdminAuth()) return;
    console.log('[admin social] admin token present at DOMContentLoaded:', !!getAdminToken());
    setupMobileMenuBurger();
    setupTabPillFiltering();
    setupAdvancedControlsAndSorting();
    setupModalFormActionLayer();
    setupAttendancePanelMechanics();
    setupLogoutButton();

    populateAdminName();
    
    await loadEventsFromApi();
    recalculateStatusPillTabCounts();
    applyFiltersAndRenderEventGridCanvas();

    // Poll for registration updates every 30 seconds to sync attendees from Firestore
    setInterval(async () => {
        await loadEventRegistrationsFromApi();
        applyFiltersAndRenderEventGridCanvas();
    }, 30000);
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

function recalculateStatusPillTabCounts() {
    const metrics = { all: localEventsCache.length, upcoming: 0, ongoing: 0, completed: 0 };

    localEventsCache.forEach(e => {
        const computed = determineStatusFromDate(e.scheduleDate || '');
        const stat = String(computed).toLowerCase();
        if (stat === "upcoming") metrics.upcoming++;
        else if (stat === "ongoing") metrics.ongoing++;
        else if (stat === "completed") metrics.completed++;
    });

    document.getElementById('count-all').innerText = metrics.all;
    document.getElementById('count-upcoming').innerText = metrics.upcoming;
    document.getElementById('count-ongoing').innerText = metrics.ongoing;
    document.getElementById('count-completed').innerText = metrics.completed;
}

function setupTabPillFiltering() {
    const statusPills = document.querySelectorAll('.event-pill-tab');
    statusPills.forEach(pill => {
        pill.addEventListener('click', () => {
            statusPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            selectedStatusPillTab = pill.getAttribute('data-status');
            applyFiltersAndRenderEventGridCanvas();
        });
    });
}

function setupAdvancedControlsAndSorting() {
    const searchInput = document.getElementById('search-event-input');
    const cycleFilterBtn = document.getElementById('btn-toggle-filter-cycle');
    const cycleSortBtn = document.getElementById('btn-toggle-sort-order');

    if (searchInput) {
        searchInput.addEventListener('input', applyFiltersAndRenderEventGridCanvas);
    }

    if (cycleFilterBtn) {
        cycleFilterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const tagsOrder = ["All", "Medical Assistance", "Meeting", "Wellness"];
            let nextIdx = (tagsOrder.indexOf(chosenActivityTypeFilter) + 1) % tagsOrder.length;
            chosenActivityTypeFilter = tagsOrder[nextIdx];

            document.getElementById('lbl-active-tag').textContent = chosenActivityTypeFilter;
            applyFiltersAndRenderEventGridCanvas();
        });
    }

    if (cycleSortBtn) {
        cycleSortBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const sortingStates = ["Newest", "Oldest", "Alphabetical"];
            let nextIdx = (sortingStates.indexOf(currentSortOrderDirection) + 1) % sortingStates.length;
            currentSortOrderDirection = sortingStates[nextIdx];

            document.getElementById('lbl-active-sort').textContent = currentSortOrderDirection;
            applyFiltersAndRenderEventGridCanvas();
        });
    }
}

function applyFiltersAndRenderEventGridCanvas() {
    const gridContainer = document.getElementById('event-grid-container');
    const searchInput = document.getElementById('search-event-input');
    if (!gridContainer) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let processedCards = localEventsCache.filter(evt => {
        const computedStatus = determineStatusFromDate(evt.scheduleDate || '');
        const matchesStatus = (selectedStatusPillTab === "all" || String(computedStatus).toLowerCase() === selectedStatusPillTab);
        const matchesCategory = (chosenActivityTypeFilter === "All" || evt.typeTag === chosenActivityTypeFilter);
        const matchesSearchText = !query || evt.title.toLowerCase().includes(query) || evt.location.toLowerCase().includes(query);

        // attach computedStatus for rendering convenience
        evt._computedStatus = computedStatus;
        return matchesStatus && matchesCategory && matchesSearchText;
    });

    if (currentSortOrderDirection === "Newest") {
        processedCards.sort((a, b) => b.scheduleDate.localeCompare(a.scheduleDate));
    } else if (currentSortOrderDirection === "Oldest") {
        processedCards.sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate));
    } else if (currentSortOrderDirection === "Alphabetical") {
        processedCards.sort((a, b) => a.title.localeCompare(b.title));
    }

    gridContainer.innerHTML = "";

    if (processedCards.length === 0) {
        gridContainer.innerHTML = `
            <div class="table-empty-state" style="grid-column: 1 / -1; padding: 50px 0;">
                <i class="far fa-calendar-times fa-2x" style="opacity:0.4; margin-bottom:8px; display:block;"></i>
                No community events matched your specified layout filters.
            </div>`;
        return;
    }
    processedCards.forEach(evt => {
        const parsedDate = new Date(evt.scheduleDate);
        const prettyDate = isNaN(parsedDate) ? evt.scheduleDate : parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        const statusToShow = evt._computedStatus || determineStatusFromDate(evt.scheduleDate || '');
        let statusBadgeClass = String(statusToShow).toLowerCase() === 'upcoming' ? 'upcoming' : (String(statusToShow).toLowerCase() === 'ongoing' ? 'ongoing' : 'completed');
        let completionPercent = Math.min(100, Math.round((evt.totalRsvps / (evt.targetSlots || 100)) * 100));

        const cardHTML = `
            <div class="event-card" style="cursor: pointer;" onclick="window.inspectEventAttendance('${evt.id}')">
                <div class="event-image-wrapper">
                    <div style="width:100%; height:100%; background:linear-gradient(135deg, var(--primary-dark) 0%, #1e293b 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:24px;">
                        <i class="${evt.typeTag === 'Medical Assistance' ? 'fas fa-notes-Medical Assistance' : (evt.typeTag === 'Meeting' ? 'fas fa-users' : 'fas fa-heartbeat')}"></i>
                    </div>
                    <span class="event-status-badge ${statusBadgeClass}">${statusToShow}</span>
                </div>
                <div class="event-content">
                    <h3 class="event-title">${evt.title}</h3>
                    <div class="event-meta">
                        <span><i class="far fa-calendar-alt"></i>${prettyDate}</span>
                        <span><i class="far fa-clock"></i>${evt.timeScope}</span>
                        <span><i class="fas fa-map-marker-alt"></i>${evt.location}</span>
                    </div>
                    <div class="rsvp-progress">
                        <div class="progress-header">
                            <span>RSVP Progress</span>
                            <span>${evt.totalRsvps} / ${evt.targetSlots || 100} (${completionPercent}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${completionPercent}%;"></div>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="btn-outline" style="flex:1;" onclick="event.stopPropagation(); window.triggerInlineMockRsvpIncrement('${evt.id}')"><i class="fas fa-user-plus"></i> Join RSVP</button>
                    </div>
                </div>
            </div>`;
        gridContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

window.triggerInlineMockRsvpIncrement = function(eventId) {
    const targetEvent = localEventsCache.find(e => e.id === eventId);
    if (!targetEvent) return;

    if (targetEvent.totalRsvps >= targetEvent.targetSlots) {
        alert("This event has reached maximum target enrollment boundaries.");
        return;
    }
    targetEvent.totalRsvps++;

    if (!mockAttendeesProfileDatabase[eventId]) mockAttendeesProfileDatabase[eventId] = [];
    mockAttendeesProfileDatabase[eventId].push({
        id: "SR-" + Math.floor(100 + Math.random() * 900),
        name: "Anonymous Citizen Member",
        checkedIn: false
    });

    recalculateStatusPillTabCounts();
    applyFiltersAndRenderEventGridCanvas();

    if (currentlyInspectedEventId === eventId) {
        window.inspectEventAttendance(eventId);
    }
};

function setupModalFormActionLayer() {
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modal = document.getElementById('create-event-modal');
    const openBtn = document.getElementById('open-event-modal');
    const closeBtnX = document.getElementById('close-event-modal-btn');
    const cancelBtn = document.getElementById('cancel-event-modal-btn');
    const saveBtn = document.getElementById('save-event-btn');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            if (modalOverlay) modalOverlay.style.display = "block";
            modal.style.display = "flex";
        });
    }

    const hideAndResetModalClosure = () => {
        if (modalOverlay) modalOverlay.style.display = "none";
        if (modal) modal.style.display = "none";
        document.getElementById('modal-event-title').value = "";
        document.getElementById('modal-event-date').value = "";
        document.getElementById('modal-event-time').value = "";
        document.getElementById('modal-event-location').value = "";
        document.getElementById('modal-event-slots').value = "100";
    };

    if (closeBtnX) closeBtnX.addEventListener('click', hideAndResetModalClosure);
    if (cancelBtn) cancelBtn.addEventListener('click', hideAndResetModalClosure);

    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const titleInput = document.getElementById('modal-event-title');
            const dateInput = document.getElementById('modal-event-date');
            const timeInput = document.getElementById('modal-event-time');
            const locInput = document.getElementById('modal-event-location');
            const slotsInput = document.getElementById('modal-event-slots');

            const title = titleInput.value.trim();
            const date = dateInput.value;
            const time = timeInput.value;
            const loc = locInput.value.trim();
            const slots = parseInt(slotsInput.value);

            // --- 1. TITLE VALIDATION ---
            const textRegex = /^[A-Za-z0-9Ññ\s\-\.,'&()]+$/;
            if (!title || title.length < 5) {
                alert("Action Blocked: Event Title must be at least 5 characters long.");
                titleInput.focus();
                return;
            }
            if (!textRegex.test(title)) {
                alert("Action Blocked: Event Title contains invalid special characters.");
                titleInput.focus();
                return;
            }

            // --- 2. DATE VALIDATION ---
            if (!date) {
                alert("Action Blocked: You must select an Event Date.");
                dateInput.focus();
                return;
            }
            
            // Generate string comparison to prevent past dates based on local timeline
            const systemCurrentDateStr = new Date().toISOString().split('T')[0]; 
            if (date < systemCurrentDateStr) {
                alert("Action Blocked: You cannot schedule an event in the past.");
                dateInput.focus();
                return;
            }

            // --- 3. TIME VALIDATION ---
            if (!time) {
                alert("Action Blocked: You must assign a start time for the event.");
                timeInput.focus();
                return;
            }

            // --- 4. LOCATION VALIDATION ---
            if (!loc || loc.length < 5) {
                alert("Action Blocked: Venue / Location must be specified properly (min 5 characters).");
                locInput.focus();
                return;
            }
            if (!textRegex.test(loc)) {
                alert("Action Blocked: Venue / Location contains invalid special characters.");
                locInput.focus();
                return;
            }

            // --- 5. TARGET CAPACITY VALIDATION ---
            if (!slots || isNaN(slots) || slots < 1 || slots > 5000) {
                alert("Action Blocked: Target RSVPs must be a realistic positive number (between 1 and 5000).");
                slotsInput.focus();
                return;
            }

            // --- STATUS & TYPE CALCULATION ---
            let statusFlag = determineStatusFromDate(date);

            let typeTag = "Wellness";
            if (title.toLowerCase().includes("med") || title.toLowerCase().includes("health") || title.toLowerCase().includes("clinic")) typeTag = "Medical Assistance";
            else if (title.toLowerCase().includes("meet") || title.toLowerCase().includes("assembly") || title.toLowerCase().includes("seminar")) typeTag = "Meeting";

            const newGeneratedEventObj = {
                id: "evt_" + Date.now(),
                title: title,
                scheduleDate: date,
                timeScope: convertMilitaryTo12HourStr(time),
                location: loc,
                totalRsvps: 0,
                targetSlots: slots,
                status: statusFlag,
                typeTag: typeTag
            };

            mockAttendeesProfileDatabase[newGeneratedEventObj.id] = [];

            const token = getAdminToken();
            if (token) {
                try {
                    const response = await fetch(`${API_BASE}/social/events`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token,
                        },
                        body: JSON.stringify({
                            title,
                            date,
                            time: time,
                            location: loc,
                            capacity: slots,
                            description: `${typeTag} event created by admin`,
                        }),
                    });

                    if (response.ok) {
                        const created = await response.json();
                        newGeneratedEventObj.id = created.id || newGeneratedEventObj.id;
                        newGeneratedEventObj.scheduleDate = created.date || newGeneratedEventObj.scheduleDate;
                        newGeneratedEventObj.timeScope = created.time || newGeneratedEventObj.timeScope;
                        newGeneratedEventObj.targetSlots = created.capacity || newGeneratedEventObj.targetSlots;
                    } else {
                        console.warn('Create event API failed:', await response.text());
                    }
                } catch (error) {
                    console.warn('Social event create request failed:', error);
                }
            }

            localEventsCache.unshift(newGeneratedEventObj); 
            
            recalculateStatusPillTabCounts();
            applyFiltersAndRenderEventGridCanvas();
            hideAndResetModalClosure();
        });
    }
}
function convertMilitaryTo12HourStr(timeStr) {
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function setupAttendancePanelMechanics() {
    const closePanelBtn = document.getElementById('close-attendance-mobile');
    const panelNode = document.getElementById('attendance-panel');
    const tabAllBtn = document.getElementById('tab-show-all-attendees');
    const tabCheckedBtn = document.getElementById('tab-show-checked-attendees');
    const attendeeSearchInput = document.getElementById('search-attendee-input');
    const bulkCheckInBtn = document.getElementById('btn-check-in-all-roster');

    if (closePanelBtn && panelNode) {
        closePanelBtn.addEventListener('click', () => {
            panelNode.classList.remove('mobile-open-panel');
            currentlyInspectedEventId = null;
        });
    }
    if (tabAllBtn && tabCheckedBtn) {
        tabAllBtn.addEventListener('click', () => {
            tabCheckedBtn.classList.remove('active');
            tabAllBtn.classList.add('active');
            activeAttendanceSubTab = "all";
            renderInspectedAttendeeRosterRows();
        });
        tabCheckedBtn.addEventListener('click', () => {
            tabAllBtn.classList.remove('active');
            tabCheckedBtn.classList.add('active');
            activeAttendanceSubTab = "checked";
            renderInspectedAttendeeRosterRows();
        });
    }
    if (attendeeSearchInput) {
        attendeeSearchInput.addEventListener('input', renderInspectedAttendeeRosterRows);
    }

    if (bulkCheckInBtn) {
        bulkCheckInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetRoster = mockAttendeesProfileDatabase[currentlyInspectedEventId];
            if (!targetRoster || targetRoster.length === 0) return;

            targetRoster.forEach(attendee => attendee.checkedIn = true);
            
            window.inspectEventAttendance(currentlyInspectedEventId);
            applyFiltersAndRenderEventGridCanvas();
        });
    }
    
    window.inspectEventAttendance = function(eventId) {
        currentlyInspectedEventId = eventId;
        const targetEvent = localEventsCache.find(e => e.id === eventId);
        if (!targetEvent) return;
        
        if (panelNode) panelNode.classList.add('mobile-open-panel');
        
        const headerCanvas = document.getElementById('attendance-header');
        if (headerCanvas) {
            headerCanvas.innerHTML = `
                <div style="background:var(--primary-dark); width:40px; height:40px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0;">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="attendance-event-info" style="text-align:left;">
                    <h4>${targetEvent.title.toUpperCase()}</h4>
                    <p><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i> ${targetEvent.location}</p>
                </div>
            `;
        }
        document.getElementById('attendance-stats').style.display = "flex";
        document.getElementById('attendance-tabs').style.display = "flex";
        document.getElementById('attendance-controls').style.display = "flex";
        renderInspectedAttendeeRosterRows();
    };
}

function renderInspectedAttendeeRosterRows() {
    const listContainer = document.getElementById('attendee-list-container');
    const searchInput = document.getElementById('search-attendee-input');
    if (!listContainer) return;
    
    const targetEvent = localEventsCache.find(e => e.id === currentlyInspectedEventId);
    const completeRoster = mockAttendeesProfileDatabase[currentlyInspectedEventId] || [];
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let totalCheckedInCount = completeRoster.filter(a => a.checkedIn).length;
    
    document.getElementById('stat-rsvps').textContent = `${targetEvent.totalRsvps} / ${targetEvent.targetSlots || 100}`;
    document.getElementById('stat-checked-in').textContent = totalCheckedInCount;
    document.getElementById('tab-count-attendees').textContent = `(${completeRoster.length})`;
    document.getElementById('tab-count-checked').textContent = `(${totalCheckedInCount})`;
    
    let displayedAttendees = completeRoster.filter(a => {
        const matchesTab = (activeAttendanceSubTab === "all" || a.checkedIn);
        const matchesQuery = !query || a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query);
        return matchesTab && matchesQuery;
    });

    listContainer.innerHTML = "";
    if (displayedAttendees.length === 0) {
        listContainer.innerHTML = `<div class="table-empty-state" style="padding:30px 0;"><i class="fas fa-user-slash" style="display:block; margin-bottom:6px; opacity:0.4;"></i>No attendees matched your selection.</div>`;
        return;
    }
    
    displayedAttendees.forEach(member => {
        let statusBadgeHTML = member.checkedIn ? 
            `<span class="status-label status-checked"><i class="fas fa-check"></i> In</span>` :
            `<span class="status-label status-pending" onclick="window.triggerSingleAttendeeCheckIn('${member.id}')">Check In</span>`;

        const rowHTML = `
            <div class="attendee-item">
                <div class="attendee-info">
                    <div class="attendee-avatar"><i class="fas fa-user"></i></div>
                    <div style="text-align:left;">
                        <span class="attendee-name">${member.name}</span>
                        <p class="attendee-id">${member.id}</p>
                    </div>
                </div>
                <div>${statusBadgeHTML}</div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', rowHTML);
    });
}

window.triggerSingleAttendeeCheckIn = function(attendeeId) {
    const targetRoster = mockAttendeesProfileDatabase[currentlyInspectedEventId];
    if (!targetRoster) return;

    const profile = targetRoster.find(a => a.id === attendeeId);
    if (profile) {
        profile.checkedIn = true;
        renderInspectedAttendeeRosterRows();
        applyFiltersAndRenderEventGridCanvas();
    }
};

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