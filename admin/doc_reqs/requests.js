// REVISION: Applied requested APPT-XXXXXX-XXXX formatting
let localRequestsCache = [
  {
    id: "req_001",
    requestId: "REQ-2026-001",
    trackNumber: "APPT-902144-1188",
    citizenName: "AQUINO, TOMAS",
    documentType: "Barangay Clearance",
    dateSubmitted: "2026-06-11",
    status: "Pending Review",
  },
  {
    id: "req_002",
    requestId: "REQ-2026-002",
    trackNumber: "APPT-714421-2211",
    citizenName: "DELA CRUZ, JUAN",
    documentType: "Certificate of Indigency",
    dateSubmitted: "2026-06-10",
    status: "Processing",
  },
  {
    id: "req_003",
    requestId: "REQ-2026-003",
    trackNumber: "APPT-882033-4455",
    citizenName: "SANTOS, ELENA",
    documentType: "Certificate of Residency",
    dateSubmitted: "2026-06-09",
    status: "Ready for Pickup",
  },
  {
    id: "req_004",
    requestId: "REQ-2026-004",
    trackNumber: "APPT-551988-9900",
    citizenName: "ALMANZOR, PEDRO",
    documentType: "Barangay ID Request",
    dateSubmitted: "2026-06-08",
    status: "Completed",
  },
  {
    id: "req_005",
    requestId: "REQ-2026-005",
    trackNumber: "APPT-229155-7766",
    citizenName: "MENDOZA, RICARDO",
    documentType: "Certificate of Good Moral Character",
    dateSubmitted: "2026-06-07",
    status: "Pending Review",
  },
  {
    id: "req_006",
    requestId: "REQ-2026-006",
    trackNumber: "APPT-440266-3322",
    citizenName: "RAMOS, LILIA",
    documentType: "Community Tax Certificate (Cedula)",
    dateSubmitted: "2026-06-05",
    status: "Processing",
  },
  {
    id: "req_007",
    requestId: "REQ-2026-007",
    trackNumber: "APPT-118877-5544",
    citizenName: "RODRIGUEZ, MARIO",
    documentType: "Barangay Clearance",
    dateSubmitted: "2026-06-02",
    status: "Pending Review",
  },
];

const API_BASE = window.API_BASE || "";
let activeStatusFilter = "All";
let activeDocTypeFilter = "All";
let currentSort = { column: null, direction: "none" };

let currentPage = 1;
let itemsPerPage = 10;
let statusChartInstance = null;
let docTypeChartInstance = null;

function getAdminToken() {
  const storedAuth = JSON.parse(
    localStorage.getItem("barangay_admin_auth") || "null",
  );
  return storedAuth && storedAuth.idToken ? storedAuth.idToken : null;
}

function normalizeStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "pending" || normalized === "pending review")
    return "Pending Review";
  if (normalized === "processing") return "Processing";
  if (normalized === "ready" || normalized === "ready for pickup")
    return "Ready for Pickup";
  if (normalized === "completed") return "Completed";
  return "Pending Review";
}

// REVISION: Applied requested APPT-XXXXXX-XXXX fallback generator format
function normalizeRequestItem(item) {
  const createdDate =
    item.dateSubmitted ||
    item.createdDate ||
    item.createdAt?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);
  return {
    id: item.id || item.requestId || `req_${Date.now()}`,
    requestId:
      item.requestId || `REQ-${String(item.id || Date.now()).slice(-8)}`,
    trackNumber:
      item.trackNumber ||
      `APPT-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    citizenName:
      item.citizenName ||
      item.fullName ||
      item.userDisplayName ||
      "Unknown Citizen",
    citizenEmail: item.citizenEmail || item.email || "",
    documentType: item.documentType || item.category || "Document Request",
    dateSubmitted: createdDate,
    status: normalizeStatus(item.status),
    category: item.category || "",
    userId: item.userId || "",
    purpose: item.purpose || "",
    adminNotes: item.adminNotes || "",
  };
}

function getAdminUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("barangay_admin_user") || "null") || null
    );
  } catch (e) {
    return null;
  }
}

function checkAdminAuth() {
  const adminAuth = localStorage.getItem("barangay_admin_auth");
  const rememberActive =
    localStorage.getItem("barangay_admin_remembered") === "true";
  const isLoggedIn =
    sessionStorage.getItem("barangay_admin_logged_in") === "true";
  if (!adminAuth || (!isLoggedIn && !rememberActive)) {
    window.location.href = "../auth/index.html";
    return false;
  }
  if (!isLoggedIn && rememberActive) {
    sessionStorage.setItem("barangay_admin_logged_in", "true");
  }
  return true;
}

function populateAdminName(selector = "auth-admin-name") {
  const adminNameEl = document.getElementById(selector);
  const adminUser = getAdminUser();
  if (adminNameEl) {
    adminNameEl.textContent =
      adminUser?.fullName || adminUser?.email || "admin@barangay.gov.ph";
  }
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem("barangay_admin_logged_in");
    localStorage.removeItem("barangay_admin_remembered");
    localStorage.removeItem("barangay_admin_auth");
    localStorage.removeItem("barangay_admin_user");
    window.location.href = "../auth/index.html";
  });
}

function ensureAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = "../auth/index.html";
    return null;
  }
  return token;
}

async function loadDocumentRequests() {
  const token = ensureAdminAuth();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/government/requests`, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) throw new Error("Unable to load requests");

    const data = await response.json();
    if (Array.isArray(data)) {
      localRequestsCache = data.map(normalizeRequestItem);
    }
  } catch (error) {
    console.warn("Document requests load failed. Using Mock Cache.");
  }

  renderChartsAndMetrics();
  applyFiltersAndRenderTable();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!checkAdminAuth()) return;

  populateAdminName();
  setupMobileMenuBurger();
  setupSearchFilters();
  setupExportFeatures();
  setupPaginationConfigs();
  setupLogoutButton();

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown-header")) {
      document
        .querySelectorAll(".header-menu")
        .forEach((menu) => menu.classList.remove("show"));
    }
    if (!e.target.closest(".status-select-wrapper")) {
      document
        .querySelectorAll(".status-dropdown-menu")
        .forEach((menu) => menu.classList.remove("visible-show"));
    }
  });

  await loadDocumentRequests();
});

window.toggleHeaderMenu = function (menuId, event) {
  event.stopPropagation();
  document.querySelectorAll(".header-menu").forEach((menu) => {
    if (menu.id !== menuId) menu.classList.remove("show");
  });

  const targetMenu = document.getElementById(menuId);
  if (targetMenu) targetMenu.classList.toggle("show");
};

// REVISION: Added TrackNumber sort execution handling to action handler
window.applyHeaderAction = function (type, key, value) {
  if (type === "sort") {
    currentSort.column = value === "none" ? null : key;
    currentSort.direction = value;

    document.querySelectorAll(".dropdown-header .sort-icon").forEach((icon) => {
      if (
        !icon.parentElement.parentElement.classList.contains("scrollable-menu")
      ) {
        icon.className = "fas fa-sort sort-icon";
      }
    });

    if (value !== "none") {
      const headersMap = {
        trackNumber: "menu-reference",
        citizenName: "menu-name",
        dateSubmitted: "menu-date",
      };
      const menuId = headersMap[key];
      if (menuId) {
        const headerEl = document.getElementById(menuId).parentElement;
        const icon = headerEl.querySelector(".sort-icon");
        if (icon)
          icon.className =
            value === "asc"
              ? "fas fa-sort-up sort-icon"
              : "fas fa-sort-down sort-icon";
      }
    }
  } else if (type === "filter") {
    if (key === "status") {
      activeStatusFilter = value;
    } else if (key === "documentType") {
      activeDocTypeFilter = value;
    }
  }

  document
    .querySelectorAll(".header-menu")
    .forEach((menu) => menu.classList.remove("show"));
  currentPage = 1;
  applyFiltersAndRenderTable();
};

function setupMobileMenuBurger() {
  const burgerBtn = document.getElementById("menu-toggle");
  const sidebarMenu = document.getElementById("sidebar");

  if (burgerBtn && sidebarMenu) {
    burgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebarMenu.classList.toggle("mobile-visible");
    });
  }
}

function renderChartsAndMetrics() {
  let statusCounts = {
    "Pending Review": 0,
    Processing: 0,
    "Ready for Pickup": 0,
    Completed: 0,
  };
  let docTypeCounts = {};
  let totalRequests = localRequestsCache.length;
  let activeTrackNumbers = 0;
  let completedTrackNumbers = 0;

  localRequestsCache.forEach((req) => {
    const stat = req.status || "Pending Review";
    if (statusCounts[stat] !== undefined) statusCounts[stat]++;

    const type = req.documentType || "Unknown";
    docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;

    if (stat === "Completed" || stat === "Ready for Pickup") {
      completedTrackNumbers++;
    } else {
      activeTrackNumbers++;
    }
  });

  const totalEl = document.getElementById("metric-total-req");
  const activeEl = document.getElementById("metric-active-track");
  const completedEl = document.getElementById("metric-completed");
  if (totalEl) totalEl.textContent = totalRequests.toLocaleString();
  if (activeEl) activeEl.textContent = activeTrackNumbers.toLocaleString();
  if (completedEl)
    completedEl.textContent = completedTrackNumbers.toLocaleString();

  const sortedDocTypes = Object.entries(docTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const docLabels = sortedDocTypes.map((item) => item[0]);
  const docData = sortedDocTypes.map((item) => item[1]);

  const statCtx = document.getElementById("statusChart");
  if (statCtx) {
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(statCtx, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Processing", "Ready", "Completed"],
        datasets: [
          {
            data: [
              statusCounts["Pending Review"],
              statusCounts["Processing"],
              statusCounts["Ready for Pickup"],
              statusCounts["Completed"],
            ],
            backgroundColor: ["#F59E0B", "#3B82F6", "#10B981", "#6B7280"],
            borderWidth: 0,
            cutout: "70%",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right" } },
      },
    });
  }

  const docCtx = document.getElementById("docTypeChart");
  if (docCtx) {
    if (docTypeChartInstance) docTypeChartInstance.destroy();
    docTypeChartInstance = new Chart(docCtx, {
      type: "bar",
      data: {
        labels: docLabels.map((l) =>
          l.length > 25 ? l.substring(0, 25) + "..." : l,
        ),
        datasets: [
          {
            label: "Volume Tracked",
            data: docData,
            backgroundColor: "#1A6B3B",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { title: (ctx) => docLabels[ctx[0].dataIndex] },
          },
        },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }
}

function setupSearchFilters() {
  const searchInput = document.getElementById("search-document");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      applyFiltersAndRenderTable();
    });
  }
}

function applyFiltersAndRenderTable() {
  const tableBody = document.getElementById("documents-table-body");
  const searchInput = document.getElementById("search-document");
  const paginationSpan = document.getElementById("showing-entries-text");

  if (!tableBody) return;
  const queryText = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredRequests = localRequestsCache.filter((req) => {
    const docType = (req.documentType || "").trim();
    const stat = (req.status || "").trim();

    let matchesDocTypeDropdown =
      activeDocTypeFilter === "All" || docType === activeDocTypeFilter;
    let matchesStatus =
      activeStatusFilter === "All" || stat === activeStatusFilter;

    const textTarget =
      `${req.requestId || ""} ${req.trackNumber || ""} ${req.citizenName || ""} ${req.documentType || ""}`.toLowerCase();
    const matchesSearch = !queryText || textTarget.includes(queryText);

    return matchesDocTypeDropdown && matchesSearch && matchesStatus;
  });

  if (currentSort.column && currentSort.direction !== "none") {
    filteredRequests.sort((a, b) => {
      let valA = a[currentSort.column] || "";
      let valB = b[currentSort.column] || "";

      if (currentSort.column === "dateSubmitted") {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
        return currentSort.direction === "asc" ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return currentSort.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedSlice = filteredRequests.slice(startIndex, endIndex);

  tableBody.innerHTML = "";

  if (totalItems === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty-state" style="text-align:center; padding: 40px 0;">
                    <i class="fas fa-folder-open fa-2x" style="opacity: 0.4; margin-bottom:10px; display:block;"></i>
                    No tracking records match your current parameters.
                </td>
            </tr>`;
    if (paginationSpan)
      paginationSpan.textContent = "Showing 0 to 0 of 0 requests";
    renderPaginationControls(totalPages);
    return;
  }

  paginatedSlice.forEach((req) => {
    tableBody.appendChild(generateTableRowElement(req));
  });

  if (paginationSpan) {
    paginationSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} requests`;
  }
  renderPaginationControls(totalPages);
}

function generateTableRowElement(req) {
  const tr = document.createElement("tr");

  let triggerClass = "trigger-pending";
  if (req.status === "Processing") triggerClass = "trigger-processing";
  else if (req.status === "Ready for Pickup") triggerClass = "trigger-ready";
  else if (req.status === "Completed") triggerClass = "trigger-completed";

  const rowStatus = req.status || "Pending Review";

  tr.innerHTML = `
        <td><strong>${req.requestId || "REQ-N/A"}</strong></td>
        <td><span style="background-color:#E5E7EB; padding: 4px 8px; border-radius:4px; font-size:12px; font-weight:700; letter-spacing:0.02em; color: var(--text-main);">${req.trackNumber || "PENDING"}</span></td>
        <td>${req.citizenName || "Unknown Citizen"}</td>
        <td>${req.documentType || "General Certification"}</td>
        <td>${req.dateSubmitted || "--:--"}</td>
        <td>
            <div class="status-select-wrapper" style="position: relative; display: inline-block;">
                <div class="status-trigger ${triggerClass}" onclick="window.toggleStatusDropdown(this)" aria-label="Change Status">
                    ${rowStatus}
                </div>
                <div class="status-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid var(--border-color); border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; min-width: 170px; padding: 4px 0; max-height: 140px; overflow-y: auto;">
                    <div class="dropdown-item ${rowStatus === "Pending Review" ? "selected" : ""}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Pending Review', this)">Pending Review</div>
                    <div class="dropdown-item ${rowStatus === "Processing" ? "selected" : ""}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Processing', this)">Processing</div>
                    <div class="dropdown-item ${rowStatus === "Ready for Pickup" ? "selected" : ""}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Ready for Pickup', this)">Ready for Pickup</div>
                    <div class="dropdown-item ${rowStatus === "Completed" ? "selected" : ""}" style="padding: 10px 14px; cursor: pointer; font-size:13px;" onclick="window.updateLocalDocumentStatus('${req.id}', 'Completed', this)">Completed</div>
                </div>
            </div>
        </td>
    `;
  return tr;
}

window.toggleStatusDropdown = function (element) {
  const openMenu = element.nextElementSibling;
  document.querySelectorAll(".status-dropdown-menu").forEach((menu) => {
    if (menu !== openMenu) menu.classList.remove("visible-show");
  });
  if (openMenu) openMenu.classList.toggle("visible-show");
};

// Error Handling with UI feedback instead of native alerts
window.updateLocalDocumentStatus = async function (docId, newStatus, clickedElement) {
  const targetItem = localRequestsCache.find((r) => r.id === docId);
  if (!targetItem) return;

  const previousStatus = targetItem.status;
  targetItem.status = newStatus;

  renderChartsAndMetrics();
  applyFiltersAndRenderTable();

  const token = getAdminToken();
  if (!token) return;

  if (String(docId).startsWith("req_")) return;

  try {
    const response = await fetch(`${API_BASE}/government/requests/${docId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok)
      throw new Error((await response.json()).error || response.statusText);
  } catch (error) {
    targetItem.status = previousStatus;
    renderChartsAndMetrics();
    applyFiltersAndRenderTable();
    
    // Simulate UI failure cleanly
    if (clickedElement) {
        const trNode = clickedElement.closest('tr');
        if(trNode) {
            const tempDiv = document.createElement('div');
            tempDiv.style = "position: absolute; right: 20px; color: #ef4444; font-size: 11px; font-weight: 600; padding: 4px; z-index: 100;";
            tempDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Network Failed`;
            trNode.querySelector('td:last-child').appendChild(tempDiv);
            setTimeout(() => tempDiv.remove(), 2500);
        }
    }
  }
};

function setupPaginationConfigs() {
  const pageSelect = document.getElementById("records-per-page-select");
  if (pageSelect) {
    pageSelect.addEventListener("change", (e) => {
      itemsPerPage = parseInt(e.target.value) || 10;
      currentPage = 1;
      applyFiltersAndRenderTable();
    });
  }
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById("pagination-buttons-container");
  if (!container) return;

  container.innerHTML = "";
  const firstBtn = document.createElement("button");
  firstBtn.className = "page-num";
  firstBtn.innerHTML = `<i class="fas fa-angle-double-left"></i>`;
  firstBtn.disabled = currentPage === 1;
  firstBtn.style.opacity = currentPage === 1 ? "0.4" : "1";
  firstBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage = 1;
      applyFiltersAndRenderTable();
    }
  });
  container.appendChild(firstBtn);

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-num";
  prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.style.opacity = currentPage === 1 ? "0.4" : "1";
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFiltersAndRenderTable();
    }
  });
  container.appendChild(prevBtn);

  for (let currentIdx = 1; currentIdx <= totalPages; currentIdx++) {
    const numBtn = document.createElement("button");
    numBtn.className = `page-num ${currentIdx === currentPage ? "active" : ""}`;
    numBtn.textContent = currentIdx;
    numBtn.addEventListener("click", () => {
      currentPage = currentIdx;
      applyFiltersAndRenderTable();
    });
    container.appendChild(numBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-num";
  nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.style.opacity = currentPage === totalPages ? "0.4" : "1";
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      applyFiltersAndRenderTable();
    }
  });
  container.appendChild(nextBtn);

  const lastBtn = document.createElement("button");
  lastBtn.className = "page-num";
  lastBtn.innerHTML = `<i class="fas fa-angle-double-right"></i>`;
  lastBtn.disabled = currentPage === totalPages;
  lastBtn.style.opacity = currentPage === totalPages ? "0.4" : "1";
  lastBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage = totalPages;
      applyFiltersAndRenderTable();
    }
  });
  container.appendChild(lastBtn);
}

function setupExportFeatures() {
  const primaryDownloadBtn = document.getElementById("btn-download-csv");
  const mobileDownloadBtn = document.getElementById("btn-download-csv-mobile");

  const runExportSequence = () => {
    if (localRequestsCache.length === 0) {
      // Simulate UI error gracefully
      const primaryBtn = document.getElementById("btn-download-csv");
      if(primaryBtn) {
          const defaultHTML = primaryBtn.innerHTML;
          primaryBtn.innerHTML = `<i class="fas fa-exclamation-circle"></i> Empty Set`;
          primaryBtn.style.backgroundColor = "#ef4444";
          setTimeout(() => {
              primaryBtn.innerHTML = defaultHTML;
              primaryBtn.style.backgroundColor = "";
          }, 2000);
      }
      return;
    }

    let csvLines = [
      "Request ID,Reference Code,Citizen Name,Document Type,Date Submitted,Status",
    ];
    localRequestsCache.forEach((item) => {
      const row = [
        item.requestId || "N/A",
        item.trackNumber || "N/A",
        `"${item.citizenName || "Unknown"}"`,
        `"${item.documentType || "General"}"`,
        item.dateSubmitted || "N/A",
        `"${item.status || "Pending"}"`,
      ];
      csvLines.push(row.join(","));
    });

    const textBlob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const temporaryUrl = URL.createObjectURL(textBlob);
    const auxiliaryAnchor = document.createElement("a");

    auxiliaryAnchor.setAttribute("href", temporaryUrl);
    auxiliaryAnchor.setAttribute(
      "download",
      `Brgy_Document_Requests_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(auxiliaryAnchor);
    auxiliaryAnchor.click();

    document.body.removeChild(auxiliaryAnchor);
    URL.revokeObjectURL(temporaryUrl);
  };

  if (primaryDownloadBtn) primaryDownloadBtn.addEventListener("click", runExportSequence);
  if (mobileDownloadBtn) mobileDownloadBtn.addEventListener("click", runExportSequence);
}