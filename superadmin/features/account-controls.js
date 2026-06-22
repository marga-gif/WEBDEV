window.SuperAdminAccountControls = {
  createStatusPill(status) {
    const normalized = (status || "active").toLowerCase();
    return `<span class="status-pill status-${normalized}">${normalized}</span>`;
  },

  formatPermissions(permissions = []) {
    if (!permissions.length) return "default";
    return permissions.join(", ");
  },

  renderAccountTable(accounts, targetElementId) {
    const tbody = document.getElementById(targetElementId);
    if (!tbody) return;

    tbody.innerHTML = "";
    if (!Array.isArray(accounts) || accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No accounts found.</td></tr>';
      return;
    }

    accounts.forEach((account) => {
      const statusText = (account.status || "active").toLowerCase();
      const statusLabel = this.createStatusPill(statusText);
      const toggleLabel = statusText === "disabled" ? "Enable" : "Disable";
      const toggleAction = statusText === "disabled" ? "enable" : "disable";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${account.fullName || account.email || "Unknown"}</td>
        <td>${account.email || "—"}</td>
        <td>${account.role || "user"}</td>
        <td>${statusLabel}</td>
        <td>${this.formatPermissions(account.permissions)}</td>
        <td>
          <button class="action-button" data-action="edit" data-id="${account.id}">Edit</button>
          <button class="action-button" data-action="${toggleAction}" data-id="${account.id}">${toggleLabel}</button>
          <button class="action-button danger" data-action="archive" data-id="${account.id}">Archive</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },
};
