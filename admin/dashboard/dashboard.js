//FOR DEMO PURPOSES
const mockDashboardData = {
    metrics: {
        totalRegistered: "1,248",
        pendingDocs: "7",
        eventRsvps: "42",
        activeAlerts: "2"
    },
    activities: [
        { icon: "fa-user-plus", color: "#1E40AF", text: "New Senior Citizen account registered: Tomas Aquino", time: "10 mins ago" },
        { icon: "fa-file-Medical Assistance", color: "#047857", text: "Medical Assistance financial assistance approved for Clara Reyes", time: "1 hr ago" },
        { icon: "fa-bullhorn", color: "#B45309", text: "System broadcast dispatched: Typhoon Track Warning", time: "3 hrs ago" }
    ],
    appointments: [
        { title: "Senior ID Card Issuance Roster", scope: "09:00 AM - 12:00 PM", status: "Ongoing" },
        { title: "Free Diagnostic Medical Assistance Check-up Group A", scope: "02:00 PM - 04:30 PM", status: "Pending" }
    ],
    notifications: [
        { title: "Critical Alert", text: "Ambulance dispatched to Purok 3.", time: "5 mins ago", unread: true },
        { title: "Document Pending", text: "Tomas Aquino submitted Senior ID application.", time: "12 mins ago", unread: true }
    ],
    searchIndex: [
        { name: "Aquino, Tomas", type: "Senior Citizen", link: "../citizens/index.html" },
        { name: "Dela Cruz, Juan", type: "Senior Citizen", link: "../citizens/index.html" },
        { name: "Senior ID Issuance", type: "Document Request", link: "../doc_reqs/index.html" },
        { name: "Financial Medicine Subsidy", type: "Budget Allocation", link: "../financial/index.html" }
    ]
};

const API_BASE = window.API_BASE;

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
function getAdminToken() {
    const storedAuth = JSON.parse(localStorage.getItem('barangay_admin_auth') || 'null');
    return storedAuth?.idToken || null;
}

async function loadDashboardData() {
    const token = getAdminToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/social/dashboard`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!response.ok) {
            throw new Error('Unable to load dashboard data');
        }
        const data = await response.json();

        if (data.metrics) {
            mockDashboardData.metrics.totalRegistered = String(data.metrics.totalRegistered || '0');
            mockDashboardData.metrics.pendingDocs = String(data.metrics.pendingDocs || '0');
            mockDashboardData.metrics.eventRsvps = String(data.metrics.eventRsvps || '0');
            mockDashboardData.metrics.activeAlerts = String(data.metrics.activeAlerts || '0');
        }

        if (Array.isArray(data.recentActivity) && data.recentActivity.length > 0) {
            mockDashboardData.activities = data.recentActivity.map((log) => ({
                icon: 'fa-bullhorn',
                color: '#047857',
                text: `${log.action?.replace(/_/g, ' ') || 'Activity'}${log.actorEmail ? ' by ' + log.actorEmail : ''}`,
                time: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now',
            }));
        }

        if (Array.isArray(data.upcomingAppointments) && data.upcomingAppointments.length > 0) {
            mockDashboardData.appointments = data.upcomingAppointments.map((appt) => ({
                title: appt.fullName || appt.patient || appt.medicalAttention || 'Appointment',
                scope: `${appt.date || ''} ${appt.time || ''}`.trim(),
                status: appt.status || 'Scheduled',
            }));
        }

        setupDashboardInteractions();
        setupDropdownModules();
        setupRoutingActions();
    } catch (error) {
        console.warn('Dashboard API load failed:', error);
        setupDashboardInteractions();
        setupDropdownModules();
        setupRoutingActions();
    }
}

function checkAdminAuth() {
    const adminAuth = localStorage.getItem('barangay_admin_auth');
    const adminUser = localStorage.getItem('barangay_admin_user');
    const isLoggedIn = sessionStorage.getItem('barangay_admin_logged_in') === 'true';
    const rememberActive = localStorage.getItem('barangay_admin_remembered') === 'true';

    if (!adminAuth || !adminUser || (!isLoggedIn && !rememberActive)) {
        window.location.href = '../auth/index.html';
        return;
    }

    if (!isLoggedIn && rememberActive) {
        sessionStorage.setItem('barangay_admin_logged_in', 'true');
    }

    // Populate admin info in sidebar
    try {
        const user = JSON.parse(adminUser);
        const adminNameEl = document.getElementById('auth-admin-name');
        const adminRoleEl = document.getElementById('auth-admin-role');
        if (adminNameEl) adminNameEl.textContent = user.fullName || user.email || 'Admin User';
        if (adminRoleEl) adminRoleEl.textContent = 'Administrator';
    } catch (e) {
        console.warn('Could not parse admin user data');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Check admin authentication first
    checkAdminAuth();

    const styleOverride = document.createElement('style');
    styleOverride.innerHTML = `
        @media screen and (max-width: 768px) {
            #menu-toggle { display: block !important; }
            .sidebar.mobile-open { transform: translateX(0) !important; box-shadow: 10px 0 30px rgba(0,0,0,0.25); }
        }
        .dropdown-overlay-card {
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--bg-panel);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 320px;
            margin-top: 12px;
            z-index: 200;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .search-box .dropdown-overlay-card { left: 0; right: auto; width: 100%; min-width: 280px; }
        .dropdown-item-row {
            padding: 8px 12px;
            border-radius: var(--border-radius-sm);
            cursor: pointer;
            transition: var(--transition-smooth);
            text-decoration: none;
            color: var(--text-main);
        }
        .dropdown-item-row:hover { background-color: var(--bg-main); }
    `;
    document.head.appendChild(styleOverride);

    setupMobileNavigation();
    await loadDashboardData();
    setupLogout();
});

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('barangay_admin_logged_in');
            localStorage.removeItem('barangay_admin_remembered');
            localStorage.removeItem('barangay_admin_auth');
            localStorage.removeItem('barangay_admin_user');
            window.location.href = '../auth/index.html';
        });
    }
}


function setupMobileNavigation() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');

    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-open');
        });

        document.addEventListener('click', (e) => {
            if (sidebarMenu.classList.contains('mobile-open') && !sidebarMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
                sidebarMenu.classList.remove('mobile-open');
            }
        });
    }
}

function setupDashboardInteractions() {
    // Ingest parameters securely from local memory cache blocks
    const totalEl = document.getElementById('metric-total-registered');
    const docsEl = document.getElementById('metric-pending-docs');
    const rsvpsEl = document.getElementById('metric-event-rsvps');
    const alertsEl = document.getElementById('metric-active-alerts');

    if (totalEl) totalEl.textContent = mockDashboardData.metrics.totalRegistered;
    if (docsEl) docsEl.textContent = mockDashboardData.metrics.pendingDocs;
    if (rsvpsEl) rsvpsEl.textContent = mockDashboardData.metrics.eventRsvps;
    if (alertsEl) alertsEl.textContent = mockDashboardData.metrics.activeAlerts;

    renderActivityPanel();
    renderAppointmentsPanel();
}

function renderActivityPanel() {
    const activityBox = document.getElementById('recent-activity-box');
    if (!activityBox) return;

    let canvasHtml = `<div style="display:flex; flex-direction:column; gap:16px; width:100%;">`;
    mockDashboardData.activities.forEach(log => {
        canvasHtml += `
            <div style="display:flex; align-items:flex-start; gap:12px; font-size:14px; border-bottom: 1px solid var(--border-color); padding-bottom:12px;">
                <div style="color:${log.color}; width:24px; text-align:center; font-size:16px;"><i class="fas ${log.icon}"></i></div>
                <div style="flex-grow:1;">
                    <p style="color:var(--text-main); font-weight:500; line-height:1.4; text-align:left;">${log.text}</p>
                    <span style="font-size:12px; color:var(--text-muted); display:block; margin-top:2px; text-align:left;">${log.time}</span>
                </div>
            </div>`;
    });
    canvasHtml += `</div>`;

    activityBox.innerHTML = canvasHtml;
}

function renderAppointmentsPanel() {
    const appointmentsBox = document.getElementById('today-appointments-box');
    if (!appointmentsBox) return;

    let canvasHtml = `<div style="display:flex; flex-direction:column; gap:16px; width:100%;">`;
    mockDashboardData.appointments.forEach(sched => {
        canvasHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; border-bottom: 1px solid var(--border-color); padding-bottom:12px; gap:10px;">
                <div style="text-align:left;">
                    <h4 style="color:var(--text-main); font-weight:600; font-size:14px; margin:0;">${sched.title}</h4>
                    <span style="font-size:12px; color:var(--text-muted); display:block; margin-top:2px;"><i class="far fa-clock" style="margin-right:4px;"></i>${sched.scope}</span>
                </div>
                <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; white-space:nowrap; background-color:${sched.status === 'Ongoing' ? '#EBF5FF' : '#FFFBEB'}; color:${sched.status === 'Ongoing' ? '#1E40AF' : '#B45309'};">${sched.status}</span>
            </div>`;
    });
    canvasHtml += `</div>`;

    appointmentsBox.innerHTML = canvasHtml;
}

function setupDropdownModules() {
    const bellBtn = document.getElementById('notification-bell-btn');
    const bellCounter = document.getElementById('notification-counter');
    const notifPanel = document.getElementById('notification-dropdown-panel');
    const searchInput = document.getElementById('system-search-input');
    const searchPanel = document.getElementById('search-dropdown-panel');

    if (bellCounter) bellCounter.textContent = mockDashboardData.notifications.length;
    if (bellBtn && notifPanel) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchPanel.style.display = "none"; 
            
            if (notifPanel.style.display === "none") {
                let itemsHtml = `<h4 style="font-size:13px; font-weight:700; margin-bottom:6px; border-bottom:1px solid var(--border-color); padding-bottom:6px; text-align:left;">System Notifications</h4>`;
                mockDashboardData.notifications.forEach(n => {
                    itemsHtml += `
                        <div class="dropdown-item-row" style="text-align:left; font-size:12px;">
                            <strong style="display:block; color:var(--primary-dark);">${n.title}</strong>
                            <p style="margin:2px 0; color:var(--text-main);">${n.text}</p>
                            <span style="font-size:10px; color:var(--text-muted);">${n.time}</span>
                        </div>`;
                });
                notifPanel.innerHTML = itemsHtml;
                notifPanel.style.display = "flex";
            } else {
                notifPanel.style.display = "none";
            }
        });
    }
    if (searchInput && searchPanel) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            notifPanel.style.display = "none"; // Close neighbor layer

            if (!query) {
                searchPanel.style.display = "none";
                return;
            }

            const matchedItems = mockDashboardData.searchIndex.filter(item => 
                item.name.toLowerCase().includes(query) || item.type.toLowerCase().includes(query)
            );

            if (matchedItems.length === 0) {
                searchPanel.innerHTML = `<span style="font-size:12px; color:var(--text-muted); padding:6px;">No entries found.</span>`;
            } else {
                let resultsHtml = "";
                matchedItems.forEach(item => {
                    resultsHtml += `
                        <a href="${item.link}" class="dropdown-item-row" style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                            <span style="font-weight:500;">${item.name}</span>
                            <span style="font-size:11px; background:#E5E7EB; padding:2px 6px; border-radius:4px; color:var(--text-muted);">${item.type}</span>
                        </a>`;
                });
                searchPanel.innerHTML = resultsHtml;
            }
            searchPanel.style.display = "flex";
        });

        // Retain dropdown visible while interacting inside search boundary box
        searchInput.addEventListener('click', (e) => e.stopPropagation());
    }
    document.addEventListener('click', () => {
        if(notifPanel) notifPanel.style.display = "none";
        if(searchPanel) searchPanel.style.display = "none";
    });
}

function setupRoutingActions() {
    const viewAllBtn = document.getElementById('btn-view-all-activity');
    const viewCalendarBtn = document.getElementById('btn-view-calendar');
    const logoutBtn = document.getElementById('logout-btn');

    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            window.location.href = "../report_auditlogs/index.html";
        });
    }

    if (viewCalendarBtn) {
        viewCalendarBtn.addEventListener('click', () => {
            window.location.href = "../social_wellness/index.html";
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = "../auth/index.html";
        });
    }
}