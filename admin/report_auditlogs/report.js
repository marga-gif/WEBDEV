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

const API_BASE = window.API_BASE;

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
    console.warn('Failed to parse stored admin user', error);
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

async function loadAuditLogsFromApi() {
  const token = ensureAdminAuth();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/social/audit-logs`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('Failed to load audit logs');
    const data = await res.json();
    if (Array.isArray(data)) mockAuditLogsCache = data.map(d => ({
      time: d.createdAt || d.timestamp || d.time || '',
      admin: d.actorEmail || d.admin || d.actor || 'System',
      action: d.action || d.type || 'Action',
      module: d.module || 'General',
      modClass: d.modClass || 'mod-users',
      details: JSON.stringify(d.meta || d.details || {}).slice(0, 200),
    }));
  } catch (err) {
    console.warn('Could not load audit logs from API:', err);
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
    console.warn('Could not load dashboard metrics', err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    if (!checkAdminAuth()) return;
    setupMobileMenuToggle();
    setupDropdownAndSearchFilters();
    setupExportCSVReportFeature();
    setupManualLogFABEntry();
    setupLogoutButton();
    populateAdminName();

    await loadAuditLogsFromApi();
    await loadDashboardMetricsFromApi();

    renderKPIMetricsCards();
    renderAnalyticsBarChart();
    applyFiltersAndRenderAuditTable();
  })();
});

// FIXED BURGER BUTTON LOGIC
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

function renderAnalyticsBarChart() {
  const chartContainer = document.getElementById("document-chart-container");
  if (!chartContainer) return;

  if (!mockDocumentChartData || mockDocumentChartData.length === 0) {
    chartContainer.innerHTML = `<div class="table-empty-state">No analytical graph variables recorded inside system cache.</div>`;
    return;
  }
  const maxVal = Math.max(...mockDocumentChartData.map((d) => d.value)) || 1;
  let chartHTML = "";

  mockDocumentChartData.forEach((item) => {
    const heightPct = (item.value / maxVal) * 100;
    chartHTML += `
          <div class="chart-bar-group">
              <span class="chart-val">${item.value}</span>
              <div class="chart-bar" style="height: ${heightPct}%;"></div>
              <span class="chart-label">${item.label}</span>
          </div>
      `;
  });
  chartContainer.innerHTML = chartHTML;
}

function setupDropdownAndSearchFilters() {
  const selectFilter = document.getElementById("audit-filter");
  const searchInput = document.getElementById("global-search-input");

  if (selectFilter) {
    selectFilter.addEventListener("change", (e) => {
      currentDropdownModuleFilter = e.target.value;
      currentPage = 1;
      applyFiltersAndRenderAuditTable();
    });
  }

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

  const totalItems = computationalResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const paginatedSlice = computationalResults.slice(startIdx, endIdx);

  tbody.innerHTML = "";

  if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty-state"><i class="fas fa-history" style="display:block; margin-bottom:8px; opacity:0.4;"></i>No security logs or trails match your parameters.</td></tr>`;
    if (showingText) showingText.textContent = "Showing 0 entries";
    renderPaginationFooterControls(totalPages);
    return;
  }

  paginatedSlice.forEach((log) => {
    tbody.innerHTML += `
          <tr>
              <td style="color: var(--text-muted); font-weight: 500;">${log.time}</td>
              <td><strong style="color: var(--text-main); font-weight: 600;">${log.admin}</strong></td>
              <td style="font-weight: 500;">${log.action}</td>
              <td><span class="log-module-badge ${log.modClass || 'mod-users'}">${log.module}</span></td>
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
  if (!dlBtn) return;

  dlBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (!mockAuditLogsCache || mockAuditLogsCache.length === 0) {
      alert("No telemetry audit entries recorded in cache to assemble a spreadsheet file.");
      return;
    }

    let csvLines = ["Timestamp,Admin Operator,Action Executed,Module Scope,Detailed Description"];
    mockAuditLogsCache.forEach((log) => {
      csvLines.push(`"${log.time}","${log.admin}","${log.action}","${log.module}","${log.details}"`);
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
  });
}

function setupManualLogFABEntry() {
  const fabBtn = document.getElementById("btn-add-manual-log");
  if (!fabBtn) return;

  fabBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const detailText = prompt("Enter a description details line to append a system audit log manually:");
    if (!detailText || detailText.trim() === "") return;

    const now = new Date();
    const formattedTimestamp = now.getFullYear() + "-" + 
                               String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                               String(now.getDate()).padStart(2, '0') + " " + 
                               String(now.getHours()).padStart(2, '0') + ":" + 
                               String(now.getMinutes()).padStart(2, '0') + ":" + 
                               String(now.getSeconds()).padStart(2, '0');

    const newManualLogEntry = {
      time: formattedTimestamp,
      admin: "Admin User",
      action: "Manual Override Entry",
      module: "Citizens",
      modClass: "mod-users",
      details: detailText.trim()
    };

    mockAuditLogsCache.unshift(newManualLogEntry); 
    currentPage = 1;
    applyFiltersAndRenderAuditTable();
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