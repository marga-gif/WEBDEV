const API_BASE = window.API_BASE || `${window.location.origin}/api`;

function getsupAdToken() {
  const storedAuth = JSON.parse(
    localStorage.getItem("barangay_supAd_auth") || "null",
  );
  return storedAuth?.idToken || null;
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("barangay_supAd_user") || "null");
  } catch {
    return null;
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("message-toast");
  toast.textContent = message;
  toast.className = `toast show`;
  if (type === "error") {
    toast.style.background = "#b91c1c";
  } else {
    toast.style.background = "#111827";
  }
  setTimeout(() => {
    toast.className = "toast hidden";
    toast.style.background = "";
  }, 3200);
}

function redirectIfNotAuthenticated() {
  const supAdAuth = localStorage.getItem("barangay_supAd_auth");
  const supAdUser = localStorage.getItem("barangay_supAd_user");

  // If no auth data exists, redirect to login
  if (!supAdAuth || !supAdUser) {
    window.location.href = "login.html";
    return null;
  }

  // If auth data exists, restore session (sessionStorage may have cleared on page reload)
  sessionStorage.setItem("barangay_supAd_logged_in", "true");

  const storedAuth = JSON.parse(supAdAuth || "null");
  return storedAuth?.idToken || null;
}

function setActivePanel(targetId) {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });
  document.querySelectorAll(".content-panel").forEach((section) => {
    section.classList.toggle("show", section.id === targetId);
  });

  const activeNav = document.querySelector(".nav-link.active");
  const activeNavTitle = activeNav?.dataset?.title?.trim();
  const targetPanel = document.getElementById(targetId);
  const panelHeaderTitle = targetPanel?.querySelector(".panel-header h3, h3")?.textContent?.trim();
  document.getElementById("panel-title").textContent = activeNavTitle || panelHeaderTitle || "Overview";
}

async function fetchJson(url, options = {}) {
  const token = getsupAdToken();
  if (!token) {
    redirectIfNotAuthenticated();
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "login.html";
      throw new Error("Session expired. Redirecting to login.");
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
}

async function loadStats() {
  try {
    const data = await fetchJson(`${API_BASE}/superadmin/stats`);
    document.getElementById("stat-total-accounts").textContent =
      data.metrics.totalUsers;
    document.getElementById("stat-active-users").textContent =
      data.metrics.activeUsers;
    document.getElementById("stat-admin-count").textContent =
      data.metrics.adminAccounts;
    document.getElementById("stat-archived-count").textContent =
      data.metrics.archivedAccounts;

    // Financial/workflow metrics (synced from user + admin actions)
    document.getElementById("stat-pending-financial-requests").textContent =
      data.metrics.pendingFinancialRequests ?? 0;
    document.getElementById("stat-approved-financial-requests").textContent =
      data.metrics.approvedFinancialRequests ?? 0;
    document.getElementById("stat-rejected-financial-requests").textContent =
      data.metrics.rejectedFinancialRequests ?? 0;
    document.getElementById("stat-disbursed-financial-requests").textContent =
      data.metrics.disbursedFinancialRequests ?? 0;
    document.getElementById("stat-upcoming-payout-batches").textContent =
      data.metrics.upcomingPayoutBatches ?? 0;
    document.getElementById("stat-total-payout-batches").textContent =
      data.metrics.totalPayoutBatches ?? 0;

    const activityBody = document.getElementById("overview-activity-body");
      activityBody.innerHTML = "";
    if (!Array.isArray(data.recentActivity) || !data.recentActivity.length) {
      activityBody.innerHTML =
        '<tr><td colspan="4" class="empty-state">No recent activity found.</td></tr>';
      return;
    }

    // cache recent activity for client-side filtering
    window.__sa_recentActivity = data.recentActivity || [];
    data.recentActivity.slice(0, 20).forEach((item) => {
      const tr = document.createElement('tr');
      const time = new Date(item.createdAt || item.timestamp || item.adminAt || Date.now()).toLocaleString();
      const action = item.action || item.actionType || item.type || 'Activity';
      const actor = item.actorEmail || item.actorUid || item.actorRole || 'System';
      const details = (item.details || item.record || {});
      tr.innerHTML = `
        <td>${time}</td>
        <td>${action}</td>
        <td>${actor}</td>
        <td><code>${JSON.stringify(details).slice(0, 200)}</code></td>
      `;
      activityBody.appendChild(tr);
    });
  } catch (error) {
    console.warn("Could not load superadmin stats.", error);
    showToast("Unable to load overview.", "error");
  }
}

// Client-side filtering helpers
function applyOverviewFilter() {
  const q = (document.getElementById('filter-overview')?.value || '').toLowerCase().trim();
  const type = (document.getElementById('filter-overview-type')?.value || 'all');
  const list = window.__sa_recentActivity || [];
  const filtered = list.filter(item => {
    const lt = (item.logType || item.type || item.action || '').toLowerCase();
    if (type !== 'all' && !lt.includes(type)) return false;
    if (!q) return true;
    const hay = (`${item.action || item.type || item.logType || ''} ${item.actorEmail || item.actorUid || item.actorRole || ''} ${JSON.stringify(item.details || item.record || {})}`).toLowerCase();
    return hay.includes(q);
  });
  const tbody = document.getElementById('overview-activity-body');
  tbody.innerHTML = '';
  if (!filtered.length) return tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No activity found.</td></tr>';
  filtered.slice(0,50).forEach(item => {
    const tr = document.createElement('tr');
    const time = new Date(item.createdAt || item.timestamp || item.adminAt || Date.now()).toLocaleString();
    const action = item.action || item.actionType || item.type || 'Activity';
    const actor = item.actorEmail || item.actorUid || item.actorRole || 'System';
    tr.innerHTML = `<td>${time}</td><td>${action}</td><td>${actor}</td><td><code>${JSON.stringify(item.details || item.record || {}).slice(0,200)}</code></td>`;
    tbody.appendChild(tr);
  });
}

function applyDocumentsFilter() {
  const q = (document.getElementById('filter-documents')?.value || '').toLowerCase().trim();
  const status = (document.getElementById('filter-documents-status')?.value || 'all');
  const list = window.__sa_documentsCache || [];
  const filtered = list.filter(d => {
    if (status !== 'all' && String(d.status || '').trim() !== status) return false;
    if (!q) return true;
    return (`${d.requestId||''} ${d.citizenName||''} ${d.documentType||''} ${d.status||''}`).toLowerCase().includes(q);
  });
  const tbody = document.getElementById('documents-table-body');
  tbody.innerHTML = '';
  if (!filtered.length) return tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No document requests found.</td></tr>';
  filtered.forEach(doc => {
    const statusClass = `status-${(doc.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
    const statusLabel = `<span class="status-pill ${statusClass}">${doc.status || 'Pending Review'}</span>`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${doc.requestId || doc.id}</td>
      <td>${doc.citizenName || 'Unknown'}</td>
      <td>${doc.documentType || 'Unknown'}</td>
      <td>${doc.dateSubmitted || 'N/A'}</td>
      <td>${statusLabel}</td>
      <td>
        <button class="action-button" data-action="approve" data-id="${doc.id}">Approve</button>
        <button class="action-button danger" data-action="reject" data-id="${doc.id}">Reject</button>
        <button class="action-button" data-action="view" data-id="${doc.id}">View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function applyAuditFilter() {
  const q = (document.getElementById('filter-audit')?.value || '').toLowerCase().trim();
  const type = (document.getElementById('filter-audit-type')?.value || 'all');
  const list = window.__sa_auditCache || [];
  const filtered = list.filter(l => {
    const lt = (l.logType || l.type || l.action || '').toLowerCase();
    if (type !== 'all' && !lt.includes(type)) return false;
    if (!q) return true;
    return (`${l.actorEmail||''} ${l.action||l.type||''} ${JSON.stringify(l.details||l.record||{})}`).toLowerCase().includes(q);
  });
  const tbody = document.getElementById('audit-logs-body');
  tbody.innerHTML = '';
  if (!filtered.length) return tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No audit logs available.</td></tr>';
  filtered.slice(0,50).forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(log.createdAt || log.timestamp || log.adminAt || Date.now()).toLocaleString()}</td>
      <td>${log.actorEmail || log.actorUid || log.actorRole || 'System'}</td>
      <td>${log.action || log.type || 'Unknown'}</td>
      <td><code>${JSON.stringify(log.details || log.record || {}).slice(0,140)}</code></td>
    `;
    tbody.appendChild(row);
  });
}

function applyTrashFilter() {
  const q = (document.getElementById('filter-trash')?.value || '').toLowerCase().trim();
  const type = (document.getElementById('filter-trash-type')?.value || 'all');
  const list = window.__sa_archiveCache || [];
  const filtered = list.filter(item => {
    if (type === 'accounts' && item.record?.role === 'document-request') return false;
    if (type === 'document-requests' && item.record?.role !== 'document-request') return false;
    if (!q) return true;
    return (`${item.record?.fullName||''} ${item.record?.email||''} ${item.record?.role||''} ${item.record?.requestId||''}`).toLowerCase().includes(q);
  });
  const tbody = document.getElementById('trash-table-body');
  tbody.innerHTML = '';
  if (!filtered.length) return tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No archived items found.</td></tr>';
  filtered.slice(0,40).forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(entry.archivedAt || Date.now()).toLocaleString()}</td>
      <td>${entry.record?.fullName || entry.record?.email || 'Unknown'}</td>
      <td>${entry.record?.role || 'user'}</td>
      <td>${entry.record?.status || 'archived'}</td>
      <td><button class="action-button" data-action="restore" data-id="${entry.id}">Restore</button></td>
    `;
    tbody.appendChild(row);
  });
}

async function loadAccounts() {
  try {
    const role = document.getElementById("filter-role").value;
    const status = document.getElementById("filter-status").value;
    const q = document.getElementById("search-account").value.trim();
    const params = new URLSearchParams();
    if (role !== "all") params.append("role", role);
    if (status !== "all") params.append("status", status);
    if (q) params.append("q", q);

    const accounts = await fetchJson(
      `${API_BASE}/superadmin/accounts?${params.toString()}`,
    );
    const tbody = document.getElementById("accounts-table-body");
    tbody.innerHTML = "";

    if (!accounts.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state">No accounts found.</td></tr>';
      return;
    }

    accounts.forEach((account) => {
      const statusText = account.status || "active";
      const statusLabel = `<span class="status-pill status-${statusText}">${statusText}</span>`;
      const toggleLabel = statusText === "disabled" ? "Enable" : "Disable";
      const toggleAction = statusText === "disabled" ? "enable" : "disable";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${account.fullName || account.email || "Unknown"}</td>
        <td>${account.email || "—"}</td>
        <td>${account.role || "user"}</td>
        <td>${statusLabel}</td>
        <td>${(account.permissions || []).join(", ") || "default"}</td>
        <td>
          <button class="action-button" data-action="edit" data-id="${account.id}">Edit</button>
          <button class="action-button" data-action="${toggleAction}" data-id="${account.id}">${toggleLabel}</button>
          <button class="action-button danger" data-action="archive" data-id="${account.id}">Archive</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.warn("Could not load accounts", error);
    showToast("Unable to load accounts.", "error");
  }
}

async function loadAuditLogs() {
  try {
    const logs = await fetchJson(`${API_BASE}/superadmin/audit-logs`);
    // cache audit logs for filtering
    window.__sa_auditCache = logs || [];
    const tbody = document.getElementById("audit-logs-body");
    tbody.innerHTML = "";
    if (!logs.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-state">No audit logs available.</td></tr>';
      return;
    }

    logs.slice(0, 50).forEach((log) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${new Date(log.createdAt || log.timestamp || log.adminAt || Date.now()).toLocaleString()}</td>
          <td>${log.actorEmail || log.actorUid || log.actorRole || "System"}</td>
          <td>${log.action || log.type || "Unknown"}</td>
          <td><code>${JSON.stringify(log.details || log.record || {}).slice(0, 140)}</code></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.warn("Could not load audit logs", error);
    showToast("Unable to load audit logs.", "error");
  }
}

async function loadArchive() {
  try {
    const archive = await fetchJson(`${API_BASE}/superadmin/archive`);
    // cache archive for filtering
    window.__sa_archiveCache = archive || [];
    const tbody = document.getElementById("trash-table-body");
    tbody.innerHTML = "";
    if (!archive.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No archived accounts found.</td></tr>';
      return;
    }

    archive.slice(0, 40).forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(entry.archivedAt || Date.now()).toLocaleString()}</td>
        <td>${entry.record?.fullName || entry.record?.email || "Unknown"}</td>
        <td>${entry.record?.role || "user"}</td>
        <td>${entry.record?.status || "archived"}</td>
        <td><button class="action-button" data-action="restore" data-id="${entry.id}">Restore</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.warn("Could not load archive", error);
    showToast("Unable to load archive.", "error");
  }
}

async function loadRequestedDocuments() {
  try {
    const docs = await fetchJson(`${API_BASE}/government/requests`);
    const tbody = document.getElementById('documents-table-body');
    tbody.innerHTML = '';
    
    if (!Array.isArray(docs) || !docs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No document requests found.</td></tr>';
      return;
    }

    // filter to exclude rejected ones (unless you want to show them)
    const pending = docs.filter(d => d.status !== 'Rejected');
    
    pending.forEach((doc) => {
      const statusClass = `status-${(doc.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
      const statusLabel = `<span class="status-pill ${statusClass}">${doc.status || 'Pending Review'}</span>`;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.requestId || doc.id}</td>
        <td>${doc.citizenName || 'Unknown'}</td>
        <td>${doc.documentType || 'Unknown'}</td>
        <td>${doc.dateSubmitted || 'N/A'}</td>
        <td>${statusLabel}</td>
        <td>
          <button class="action-button" data-action="approve" data-id="${doc.id}">Approve</button>
          <button class="action-button danger" data-action="reject" data-id="${doc.id}">Reject</button>
          <button class="action-button" data-action="view" data-id="${doc.id}">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.warn('Could not load document requests', error);
    showToast('Unable to load document requests.', 'error');
  }
}

async function approveDocumentRequest(docId) {
  try {
    await fetchJson(`${API_BASE}/government/requests/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Processing', adminNotes: 'Approved by SuperAdmin' }),
    });
    showToast('Document request approved.');
    await loadRequestedDocuments();
  } catch (error) {
    console.warn('Unable to approve request', error);
    showToast(error.message || 'Unable to approve request.', 'error');
  }
}

async function rejectDocumentRequest(docId) {
  try {
    await fetchJson(`${API_BASE}/government/requests/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Rejected', adminNotes: 'Rejected by SuperAdmin' }),
    });
    showToast('Document request rejected.');
    await loadRequestedDocuments();
    // Refresh archive/trash panel so rejected request appears there
    await loadArchive();
  } catch (error) {
    console.warn('Unable to reject request', error);
    showToast(error.message || 'Unable to reject request.', 'error');
  }
}

async function loadSettings() {
  try {
    const settings = await fetchJson(`${API_BASE}/superadmin/settings`);
    document.getElementById("setting-siteName").value = settings.siteName || "";
    document.getElementById("setting-contactEmail").value =
      settings.contactEmail || "";
    document.getElementById("setting-contactPhone").value =
      settings.contactPhone || "";
    document.getElementById("setting-workingHours").value =
      settings.workingHours || "";
    document.getElementById("setting-street").value = settings.street || "";
    document.getElementById("setting-purok").value = settings.purok || "";
    document.getElementById("setting-barangay").value = settings.barangay || "";
    document.getElementById("setting-city").value = settings.city || "";
    document.getElementById("setting-province").value = settings.province || "";
    document.getElementById("setting-zipCode").value = settings.zipCode || "";
    document.getElementById("setting-timeZone").value = settings.timeZone || "";
  } catch (error) {
    console.warn("Could not load settings", error);
    showToast("Unable to load global settings.", "error");
  }
}

async function loadProfilePanel() {
  try {
    const profile = await fetchJson(`${API_BASE}/auth/profile`);
    document.getElementById("profile-email").value = profile.email || "";
    document.getElementById("profile-firstName").value = profile.firstName || "";
    document.getElementById("profile-middleName").value = profile.middleName || "";
    document.getElementById("profile-lastName").value = profile.lastName || "";
    document.getElementById("profile-street").value = profile.street || "";
    document.getElementById("profile-purok").value = profile.purok || "";
    document.getElementById("profile-barangay").value = profile.barangay || "";
    document.getElementById("profile-city").value = profile.city || "";
    document.getElementById("profile-province").value = profile.province || "";
    document.getElementById("profile-zip").value = profile.zipCode || profile.zip || "";
    document.getElementById("profile-phone").value = profile.phone || profile.mobile || "";
  } catch (error) {
    console.warn("Unable to load profile details", error);
    showToast("Unable to load profile details.", "error");
  }
}

async function saveProfilePanel(event) {
  event.preventDefault();
  try {
    const firstName = document.getElementById("profile-firstName").value.trim();
    const middleName = document.getElementById("profile-middleName").value.trim();
    const lastName = document.getElementById("profile-lastName").value.trim();
    const street = document.getElementById("profile-street").value.trim();
    const purok = document.getElementById("profile-purok").value.trim();
    const barangay = document.getElementById("profile-barangay").value.trim();
    const city = document.getElementById("profile-city").value.trim();
    const province = document.getElementById("profile-province").value.trim();
    const zipCode = document.getElementById("profile-zip").value.trim();
    const phone = document.getElementById("profile-phone").value.trim();

    if (!firstName || !lastName) {
      showToast("First name and last name are required.", "error");
      return;
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    await fetchJson(`${API_BASE}/auth/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        firstName,
        middleName,
        lastName,
        fullName,
        street,
        purok,
        barangay,
        city,
        province,
        zipCode,
        phone,
      }),
    });

    const storedUser = getAdminUser();
    if (storedUser) {
      storedUser.fullName = fullName;
      localStorage.setItem("barangay_supAd_user", JSON.stringify(storedUser));
      document.getElementById("superadmin-name").textContent = fullName;
    }

    showToast("Profile saved successfully.");
  } catch (error) {
    console.warn("Unable to save profile", error);
    showToast(error.message || "Unable to save profile.", "error");
  }
}

function openAccountModal(account = {}, isNew = false) {
  const modalTitle = document.querySelector("#account-modal .modal-header h3");
  if (modalTitle) {
    modalTitle.textContent = isNew ? "Create New Account" : "Edit Account";
  }

  document.getElementById("account-fullName").value = account.fullName || "";
  document.getElementById("account-email").value = account.email || "";
  document.getElementById("account-role").value = account.role || "user";
  document.getElementById("account-status").value = account.status || "active";
  document.getElementById("account-mobile").value = account.mobile || "";
  document.getElementById("account-permissions").value = (
    account.permissions || []
  ).join(", ");
  document.getElementById("account-city").value = account.city || "";
  document.getElementById("account-barangay").value = account.barangay || "";
  document.getElementById("account-province").value = account.province || "";
  document.getElementById("account-form").dataset.accountId = account.id || "";
  document.getElementById("account-modal").classList.add("show");
}

function closeAccountModal() {
  document.getElementById("account-modal").classList.remove("show");
  document.getElementById("account-form").dataset.accountId = "";
}

async function loadAccountDetails(accountId) {
  try {
    return await fetchJson(`${API_BASE}/superadmin/accounts/${accountId}`);
  } catch (error) {
    console.warn("Unable to fetch full account details", error);
    return null;
  }
}

async function saveAccount() {
  const accountId = document.getElementById("account-form").dataset.accountId;
  const payload = {
    fullName: document.getElementById("account-fullName").value.trim(),
    email: document.getElementById("account-email").value.trim(),
    role: document.getElementById("account-role").value,
    status: document.getElementById("account-status").value,
    mobile: document.getElementById("account-mobile").value.trim(),
    permissions: document
      .getElementById("account-permissions")
      .value.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    city: document.getElementById("account-city").value.trim(),
    barangay: document.getElementById("account-barangay").value.trim(),
    province: document.getElementById("account-province").value.trim(),
  };

  try {
    if (!accountId) {
      await fetchJson(`${API_BASE}/superadmin/accounts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("New account created successfully.");
    } else {
      await fetchJson(`${API_BASE}/superadmin/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showToast("Account updated successfully.");
    }

    closeAccountModal();
    await loadAccounts();
    await loadStats();
    await loadArchive();
  } catch (error) {
    console.warn("Unable to save account", error);
    showToast(error.message || "Unable to save account.", "error");
  }
}

async function toggleAccountStatus(accountId, targetStatus) {
  try {
    await fetchJson(`${API_BASE}/superadmin/accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: targetStatus }),
    });
    showToast(`Account ${targetStatus === "active" ? "enabled" : "disabled"} successfully.`);
    await loadAccounts();
    await loadStats();
  } catch (error) {
    console.warn("Unable to toggle account status", error);
    showToast(error.message || "Unable to update account status.", "error");
  }
}

async function archiveAccount(accountId) {
  try {
    await fetchJson(`${API_BASE}/superadmin/accounts/${accountId}/archive`, {
      method: "POST",
    });
    showToast("Account archived successfully.");
    await loadAccounts();
    await loadStats();
    await loadArchive();
  } catch (error) {
    console.warn("Unable to archive account", error);
    showToast(error.message || "Unable to archive account.", "error");
  }
}

async function restoreAccount(archiveId) {
  try {
    await fetchJson(`${API_BASE}/superadmin/accounts/${archiveId}/restore`, {
      method: "POST",
    });
    showToast("Account restored successfully.");
    await loadAccounts();
    await loadStats();
    await loadArchive();
  } catch (error) {
    console.warn("Unable to restore account", error);
    showToast(error.message || "Unable to restore archive.", "error");
  }
}

async function initNavigation() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      setActivePanel(button.dataset.target);
    });
  });

  const profileSummary = document.querySelector('.admin-summary');
  if (profileSummary) {
    profileSummary.addEventListener('click', () => {
      openProfileModal();
    });
  }

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("barangay_supAd_logged_in");
    localStorage.removeItem("barangay_supAd_remembered");
    localStorage.removeItem("barangay_supAd_auth");
    localStorage.removeItem("barangay_supAd_user");
    window.location.href = "login.html";
  });

  document
    .getElementById("search-account")
    .addEventListener("input", () => loadAccounts());
  document
    .getElementById("filter-role")
    .addEventListener("change", () => loadAccounts());
  document
    .getElementById("filter-status")
    .addEventListener("change", () => loadAccounts());

  document
    .getElementById("account-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveAccount();
    });

  document
    .getElementById("close-account-modal")
    .addEventListener("click", closeAccountModal);
  document
    .getElementById("cancel-account-modal")
    .addEventListener("click", closeAccountModal);

  document
    .getElementById("accounts-table-body")
    .addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === "edit") {
        const fullAccount = await loadAccountDetails(id);
        if (fullAccount && typeof fullAccount === "object") {
          openAccountModal(fullAccount, false);
        } else {
          const row = button.closest("tr");
          const cells = row.querySelectorAll("td");
          const account = {
            id,
            fullName: cells[0]?.textContent.trim(),
            email: cells[1]?.textContent.trim(),
            role: cells[2]?.textContent.trim().toLowerCase(),
            status: cells[3]?.textContent.trim().toLowerCase(),
          };
          openAccountModal(account, false);
        }
      }

      if (action === "disable" || action === "enable") {
        const targetStatus = action === "enable" ? "active" : "disabled";
        if (confirm(`Are you sure you want to ${action} this account?`)) {
          await toggleAccountStatus(id, targetStatus);
        }
      }

      if (action === "archive") {
        if (confirm("Archive this account? It can be restored later.")) {
          archiveAccount(id);
        }
      }
    });

  document
    .getElementById("trash-table-body")
    .addEventListener("click", async (event) => {
      const button = event.target.closest('button[data-action="restore"]');
      if (!button) return;
      const id = button.dataset.id;
      if (confirm("Restore this archived account?")) {
        await restoreAccount(id);
      }
    });

  document
    .getElementById("documents-table-body")
    .addEventListener("click", async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === 'approve') {
        if (confirm('Approve this document request?')) {
          await approveDocumentRequest(id);
        }
      } else if (action === 'reject') {
        if (confirm('Reject this document request?')) {
          await rejectDocumentRequest(id);
        }
      } else if (action === 'view') {
        const row = button.closest('tr');
        const cells = row.querySelectorAll('td');
        alert(`Request ID: ${cells[0]?.textContent}\nCitizen: ${cells[1]?.textContent}\nType: ${cells[2]?.textContent}\nSubmitted: ${cells[3]?.textContent}\nStatus: ${cells[4]?.textContent}`);
      }
    });

  document
    .getElementById("settings-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = {
          siteName: document.getElementById("setting-siteName").value.trim(),
          contactEmail: document
            .getElementById("setting-contactEmail")
            .value.trim(),
          contactPhone: document
            .getElementById("setting-contactPhone")
            .value.trim(),
          workingHours: document
            .getElementById("setting-workingHours")
            .value.trim(),
          street: document.getElementById("setting-street").value.trim(),
          purok: document.getElementById("setting-purok").value.trim(),
          barangay: document.getElementById("setting-barangay").value.trim(),
          city: document.getElementById("setting-city").value.trim(),
          province: document.getElementById("setting-province").value.trim(),
          zipCode: document.getElementById("setting-zipCode").value.trim(),
          timeZone: document.getElementById("setting-timeZone").value.trim(),
        };
        await fetchJson(`${API_BASE}/superadmin/settings`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("Global settings saved successfully.");
      } catch (error) {
        console.warn("Unable to save settings", error);
        showToast(error.message || "Unable to save settings.", "error");
      }
    });

  const profileForm = document.getElementById("profile-panel-form");
  if (profileForm) {
    profileForm.addEventListener("submit", saveProfilePanel);
    document.getElementById('close-profile-modal')?.addEventListener('click', closeProfileModal);
    document.getElementById('cancel-profile-modal')?.addEventListener('click', closeProfileModal);
  }
}

async function initialize() {
  redirectIfNotAuthenticated();
  const storedAdmin = getAdminUser();
  if (storedAdmin) {
    document.getElementById("superadmin-name").textContent =
      storedAdmin.fullName || storedAdmin.email || "Super Admin";
  }

  await initNavigation();
  // Ensure topbar title and visible panel match the active nav on load
  try {
    const activeTarget = document.querySelector('.nav-link.active')?.dataset?.target || 'panel-overview';
    setActivePanel(activeTarget);
  } catch (e) {
    // ignore
  }
  await Promise.all([
    loadStats(),
    loadAccounts(),
    loadRequestedDocuments(),
    loadAuditLogs(),
    loadArchive(),
    loadSettings(),
  ]);
  // Hook up filter inputs and dropdown selects (search + select like Account Monitoring)
  document.getElementById('filter-overview')?.addEventListener('input', applyOverviewFilter);
  document.getElementById('filter-documents')?.addEventListener('input', applyDocumentsFilter);
  document.getElementById('filter-audit')?.addEventListener('input', applyAuditFilter);
  document.getElementById('filter-trash')?.addEventListener('input', applyTrashFilter);
  document.getElementById('filter-overview-type')?.addEventListener('change', applyOverviewFilter);
  document.getElementById('filter-documents-status')?.addEventListener('change', applyDocumentsFilter);
  document.getElementById('filter-audit-type')?.addEventListener('change', applyAuditFilter);
  document.getElementById('filter-trash-type')?.addEventListener('change', applyTrashFilter);
}

function openProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  modal.classList.add('show');
  // load latest profile into modal fields
  loadProfilePanel().catch(() => {});
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  modal.classList.remove('show');
}

initialize().catch((error) => {
  console.error("Initialization failed", error);
  showToast("Unable to initialize SuperAdmin console.", "error");
});
