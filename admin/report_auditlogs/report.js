// DATA CACHE CORES
let mockAuditLogsCache = [
  {
    time: "2026-06-13 15:45:22",
    admin: "Juan Dela Cruz",
    action: "Updated citizen profile",
    module: "Citizens",
    modClass: "mod-users",
    details: "Updated contact number of SC-2026-0156",
  },
  {
    time: "2026-06-12 14:30:10",
    admin: "Maria Santos",
    action: "Changed document status",
    module: "Document Requests",
    modClass: "mod-docs",
    details: "SC-2026-0788: Pending Review → Processing",
  },
  {
    time: "2026-06-11 11:02:05",
    admin: "Liza Reyes",
    action: "Added new event",
    module: "Social Wellness",
    modClass: "mod-events",
    details: "Event: Barangay Senior Assembly 2026",
  },
  {
    time: "2026-06-10 09:47:40",
    admin: "Maria Santos",
    action: "Updated payout batch",
    module: "Financial Assistance",
    modClass: "mod-finance",
    details: "Batch 2026-06-01 allocated successfully",
  }
];

let mockAnalyticsMetrics = {
  totalSeniors: 1247,
  newThisMonth: 78,
  prevMonthNew: 68,
  activeMobiles: 892,
  verifiedAccounts: 1153,
  averageAge: "71.4"
};

let mockDocumentChartData = [
  { label: "Barangay Clearance", value: 226 },
  { label: "Indigency Cert", value: 162 },
  { label: "Cert of Residency", value: 118 },
  { label: "Business Clearance", value: 76 },
  { label: "Solo Parent Cert", value: 54 },
];

let currentPage = 1;
const itemsPerPage = 10;
let currentDropdownModuleFilter = "all";
let globalSearchQueryText = "";
let currentSort = { column: null, direction: 'none' }; 

const API_BASE = window.API_BASE || '';

// --- CHART INSTANCES ---
let docBarChartInstance = null;
let moduleDoughnutChartInstance = null;

function getAdminToken() {
  const storedAuth = JSON.parse(localStorage.getItem('barangay_admin_auth') || 'null');
  return storedAuth?.idToken || null;
}

function ensureAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = '../auth/index.html';
    return null;
  }
  return token;
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || null;
  } catch (error) {
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
    adminNameEl.textContent = adminUser?.fullName || adminUser?.email || 'admin@barangay.gov.ph';
  }
}

async function loadAuditLogsFromApi() {
  const token = ensureAdminAuth();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/social/audit-logs`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('Failed to load audit logs');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) mockAuditLogsCache = data.map(d => ({
      time: d.createdAt || d.timestamp || d.time || '',
      admin: d.actorEmail || d.admin || d.actor || 'System',
      action: d.action || d.type || 'Action',
      module: d.module || 'General',
      modClass: d.modClass || 'mod-users',
      details: JSON.stringify(d.meta || d.details || {}).slice(0, 200),
    }));
  } catch (err) {
    console.warn('Could not load audit logs from API. Using local cache.');
  }
}

async function loadDashboardMetricsFromApi() {
  const token = getAdminToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/social/dashboard`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.metrics) {
      mockAnalyticsMetrics.totalSeniors = data.metrics.totalRegistered || mockAnalyticsMetrics.totalSeniors;
      mockAnalyticsMetrics.activeMobiles = data.metrics.activeAlerts || mockAnalyticsMetrics.activeMobiles;
      mockAnalyticsMetrics.verifiedAccounts = data.metrics.totalRegistered ? Math.max(0, data.metrics.totalRegistered - 94) : mockAnalyticsMetrics.verifiedAccounts;
    }
  } catch (err) {
    console.warn('Could not load dashboard metrics');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    if (!checkAdminAuth()) return;
    setupMobileMenuToggle();
    setupDropdownAndSearchFilters();
    setupExportCSVReportFeature();
    setupLogoutButton();
    populateAdminName();

    // Close headers naturally
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-header')) {
            document.querySelectorAll('.header-menu').forEach(menu => menu.classList.remove('show'));
        }
    });

    await loadAuditLogsFromApi();
    await loadDashboardMetricsFromApi();

    renderKPIMetricsCards();
    renderChartJSAnalytics();
    applyFiltersAndRenderAuditTable();
  })();
});

// REVISION: Header Interaction Protocol
window.toggleHeaderMenu = function(menuId, event) {
    event.stopPropagation();
    document.querySelectorAll('.header-menu').forEach(menu => {
        if (menu.id !== menuId) menu.classList.remove('show');
    });
    
    const targetMenu = document.getElementById(menuId);
    if (targetMenu) targetMenu.classList.toggle('show');
};

window.applyHeaderAction = function(type, key, value) {
    if (type === 'sort') {
        currentSort.column = value === 'none' ? null : key;
        currentSort.direction = value;
        
        document.querySelectorAll('.dropdown-header .sort-icon').forEach(icon => {
            if(!icon.parentElement.parentElement.classList.contains('scrollable-menu')) {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
        
        if (value !== 'none') {
            const headersMap = { 'date': 'menu-date', 'admin': 'menu-admin' };
            const menuId = headersMap[key];
            if (menuId) {
                const headerEl = document.getElementById(menuId).parentElement;
                const icon = headerEl.querySelector('.sort-icon');
                if (icon) icon.className = value === 'asc' ? 'fas fa-sort-up sort-icon' : 'fas fa-sort-down sort-icon';
            }
        }
    } else if (type === 'filter') {
        if (key === 'module') currentDropdownModuleFilter = value;
    }
    
    document.querySelectorAll('.header-menu').forEach(menu => menu.classList.remove('show'));
    currentPage = 1;
    applyFiltersAndRenderAuditTable();
};

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

function renderKPIMetricsCards() {
  const total = mockAnalyticsMetrics?.totalSeniors || 0;
  const added = mockAnalyticsMetrics?.newThisMonth || 0;
  const prev = mockAnalyticsMetrics?.prevMonthNew || 1; 
  const mobiles = mockAnalyticsMetrics?.activeMobiles || 0;
  const verified = mockAnalyticsMetrics?.verifiedAccounts || 0;
  const avgAge = mockAnalyticsMetrics?.averageAge || "0.0";

  const trendPercentage = Math.round(((added - prev) / prev) * 100);
  const mobilePercentage = total === 0 ? "0.0" : ((mobiles / total) * 100).toFixed(1);
  const verifiedPercentage = total === 0 ? "0.0" : ((verified / total) * 100).toFixed(1);

  document.getElementById("kpi-total").innerText = total.toLocaleString();
  document.getElementById("kpi-new").innerText = added;
  document.getElementById("kpi-new-trend").innerHTML = `<i class="fas fa-arrow-up"></i> ${trendPercentage}%`;
  document.getElementById("kpi-mobile").innerText = mobiles.toLocaleString();
  document.getElementById("kpi-mobile-pct").innerText = `(${mobilePercentage}%)`;
  document.getElementById("kpi-age").innerText = avgAge;
  document.getElementById("kpi-verified").innerText = verified.toLocaleString();
  document.getElementById("kpi-verified-pct").innerText = `(${verifiedPercentage}%)`;
}

// REVISION: Advanced Chart.js Rendering
function renderChartJSAnalytics() {
    // Top Documents Bar Chart
    const docLabels = mockDocumentChartData.map(d => d.label);
    const docData = mockDocumentChartData.map(d => d.value);

    const barCtx = document.getElementById('documentBarChart');
    if (barCtx) {
        if (docBarChartInstance) docBarChartInstance.destroy();
        docBarChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: docLabels,
                datasets: [{
                    label: 'Document Requests',
                    data: docData,
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

    // Module Audit Distribution Doughnut
    let moduleCounts = {};
    mockAuditLogsCache.forEach(log => {
        const mod = log.module || 'Unknown';
        moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });

    const modLabels = Object.keys(moduleCounts);
    const modData = Object.values(moduleCounts);
    const modColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

    const doughCtx = document.getElementById('moduleDoughnutChart');
    if (doughCtx) {
        if (moduleDoughnutChartInstance) moduleDoughnutChartInstance.destroy();
        moduleDoughnutChartInstance = new Chart(doughCtx, {
            type: 'doughnut',
            data: {
                labels: modLabels,
                datasets: [{
                    data: modData,
                    backgroundColor: modColors.slice(0, modLabels.length),
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        });
    }
}

function setupDropdownAndSearchFilters() {
  const searchInput = document.getElementById("global-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      globalSearchQueryText = e.target.value.toLowerCase().trim();
      currentPage = 1;
      applyFiltersAndRenderAuditTable();
    });
  }
}

function applyFiltersAndRenderAuditTable() {
  const tbody = document.getElementById("audit-logs-body");
  const showingText = document.getElementById("audit-showing");
  if (!tbody) return;

  const computationalResults = mockAuditLogsCache.filter((log) => {
    const matchesDropdown = currentDropdownModuleFilter === "all" || log.module === currentDropdownModuleFilter;
    const searchTextTarget = `${log.admin} ${log.action} ${log.details} ${log.module}`.toLowerCase();
    const matchesSearchText = !globalSearchQueryText || searchTextTarget.includes(globalSearchQueryText);
    return matchesDropdown && matchesSearchText;
  });

  if (currentSort.column && currentSort.direction !== 'none') {
        computationalResults.sort((a, b) => {
            let valA = a[currentSort.column] || '';
            let valB = b[currentSort.column] || '';
            
            if (currentSort.column === 'date') valA = a.time || ''; valB = b.time || '';

            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return currentSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }

  const totalItems = computationalResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const paginatedSlice = computationalResults.slice(startIdx, endIdx);

  tbody.innerHTML = "";

  if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state"><i class="fas fa-history" style="display:block; margin-bottom:8px; opacity:0.4; font-size:24px;"></i>No security logs or trails match your parameters.</td></tr>`;
    if (showingText) showingText.textContent = "Showing 0 entries";
    renderPaginationFooterControls(totalPages);
    return;
  }

  paginatedSlice.forEach((log) => {
    // REVISION: Splitting Timestamp into Date and Time Strings securely
    const splitTimestamp = (log.time || "---- --:--").split(' ');
    const dateString = splitTimestamp[0];
    const timeString = splitTimestamp.slice(1).join(' ') || '--:--';

    tbody.innerHTML += `
          <tr>
              <td style="color: var(--text-main); font-weight: 500;">${dateString}</td>
              <td style="color: var(--text-muted); font-weight: 500;">${timeString}</td>
              <td><strong style="color: var(--text-main); font-weight: 600;">${log.admin}</strong></td>
              <td><span class="log-module-badge ${log.modClass || 'mod-users'}">${log.module}</span></td>
              <td style="font-weight: 500;">${log.action}</td>
              <td style="color: var(--text-muted); font-weight: 500;">${log.details}</td>
          </tr>
      `;
  });

  if (showingText) {
    showingText.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalItems} entries`;
  }

  renderPaginationFooterControls(totalPages);
}

function renderPaginationFooterControls(totalPages) {
  const container = document.getElementById("pagination-wrapper");
  if (!container) return;

  container.innerHTML = "";

  const leftArrow = document.createElement("button");
  leftArrow.className = "page-num";
  leftArrow.innerHTML = `<i class="fas fa-chevron-left"></i>`;
  leftArrow.disabled = (currentPage === 1);
  leftArrow.style.opacity = (currentPage === 1) ? "0.38" : "1";
  leftArrow.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFiltersAndRenderAuditTable();
    }
  });
  container.appendChild(leftArrow);

  for (let idx = 1; idx <= totalPages; idx++) {
    const numBtn = document.createElement("button");
    numBtn.className = `page-num ${idx === currentPage ? "active" : ""}`;
    numBtn.textContent = idx;
    numBtn.addEventListener("click", () => {
      currentPage = idx;
      applyFiltersAndRenderAuditTable();
    });
    container.appendChild(numBtn);
  }

  const rightArrow = document.createElement("button");
  rightArrow.className = "page-num";
  rightArrow.innerHTML = `<i class="fas fa-chevron-right"></i>`;
  rightArrow.disabled = (currentPage === totalPages);
  rightArrow.style.opacity = (currentPage === totalPages) ? "0.38" : "1";
  rightArrow.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      applyFiltersAndRenderAuditTable();
    }
  });
  container.appendChild(rightArrow);
}

function setupExportCSVReportFeature() {
  const dlBtn = document.getElementById("btn-download-report");
  const errorMsg = document.getElementById("export-error-msg");
  if (!dlBtn) return;

  dlBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (errorMsg) {
        errorMsg.classList.remove("show");
        errorMsg.innerHTML = "";
    }

    if (!mockAuditLogsCache || mockAuditLogsCache.length === 0) {
      if (errorMsg) {
          errorMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No telemetry audit entries recorded to assemble a spreadsheet file.';
          errorMsg.classList.add("show");
      }
      return;
    }

    // Double Submission & Feedback Implementation
    const originalHtml = dlBtn.innerHTML;
    dlBtn.disabled = true;
    dlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating CSV...';

    setTimeout(() => {
        let csvLines = ["Date,Time,Admin Operator,Module Scope,Action Executed,Detailed Description"];
        mockAuditLogsCache.forEach((log) => {
          const splitTime = (log.time || "").split(' ');
          const pureDate = splitTime[0] || '';
          const pureTime = splitTime.slice(1).join(' ') || '';
          csvLines.push(`"${pureDate}","${pureTime}","${log.admin}","${log.module}","${log.action}","${log.details}"`);
        });

        const textBlob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(textBlob);
        const temporaryAnchor = document.createElement("a");

        temporaryAnchor.setAttribute("href", downloadUrl);
        temporaryAnchor.setAttribute("download", `Barangay_System_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(temporaryAnchor);
        
        temporaryAnchor.click();
        document.body.removeChild(temporaryAnchor);
        URL.revokeObjectURL(downloadUrl);

        dlBtn.disabled = false;
        dlBtn.innerHTML = originalHtml;
    }, 600); // Simulate backend processing delay for UX feedback
  });
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem('barangay_admin_logged_in');
    localStorage.removeItem('barangay_admin_remembered');
    localStorage.removeItem('barangay_admin_auth');
    localStorage.removeItem('barangay_admin_user');
    window.location.href = "../auth/index.html";
  });
}