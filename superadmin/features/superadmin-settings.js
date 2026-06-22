export async function loadSuperAdminSettings(fetchJson) {
  const apiBase = window.API_BASE || `${window.location.origin}/api`;
  const settings = await fetchJson(`${apiBase}/superadmin/settings`);
  document.getElementById("setting-siteName").value = settings.siteName || "";
  document.getElementById("setting-contactEmail").value = settings.contactEmail || "";
  document.getElementById("setting-contactPhone").value = settings.contactPhone || "";
  document.getElementById("setting-workingHours").value = settings.workingHours || "";
  document.getElementById("setting-street").value = settings.street || "";
  document.getElementById("setting-purok").value = settings.purok || "";
  document.getElementById("setting-barangay").value = settings.barangay || "";
  document.getElementById("setting-city").value = settings.city || "";
  document.getElementById("setting-province").value = settings.province || "";
  document.getElementById("setting-zipCode").value = settings.zipCode || "";
  document.getElementById("setting-timeZone").value = settings.timeZone || "";
}

export async function saveSuperAdminSettings(fetchJson, payload) {
  const apiBase = window.API_BASE || `${window.location.origin}/api`;
  return await fetchJson(`${apiBase}/superadmin/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
