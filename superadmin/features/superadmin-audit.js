export async function loadSuperAdminAudit(fetchJson, targetElementId) {
  try {
    const logs = await fetchJson(`${API_BASE}/superadmin/audit-logs`);
    const tbody = document.getElementById(targetElementId);
    tbody.innerHTML = "";
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No audit logs available.</td></tr>';
      return;
    }

    logs.slice(0, 50).forEach((log) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}</td>
          <td>${log.actorEmail || log.actorUid || log.actorRole || "System"}</td>
          <td>${log.action || log.type || "Unknown"}</td>
          <td><code>${JSON.stringify(log.details || log.record || {}).slice(0, 140)}</code></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.warn("Could not load superadmin audit logs", error);
    const tbody = document.getElementById(targetElementId);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Unable to load logs.</td></tr>';
    }
  }
}
