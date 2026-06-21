// FOR DEMO PURPOSES
let mockSystemSettingsStore = {
    barangayName: "Barangay San Jose",
    municipality: "Pandi",
    province: "Bulacan",
    captain: "Hon. Pedro Penduko",
    oscaHead: "Maria Clara",
    address: "Purok 2, Main Street, San Jose",
    contactNumber: "0917-111-2222",
    publicEmail: "info@barangaysanjose.gov.ph",
    workingHours: "8:00 AM - 5:00 PM (Monday - Friday)"
};

let mockAdministratorsCache = [
    { id: "adm_1", empId: "EMP-001", name: "Juan Dela Cruz", email: "juan.delacruz@barangay.gov.ph", phone: "0917-111-2222", role: "Super Admin", status: "Active" },
    { id: "adm_2", empId: "EMP-005", name: "Maria Santos", email: "maria.santos@barangay.gov.ph", phone: "0918-333-4444", role: "Admin", status: "Active" }
];

let mockRolePermissions = {
    "Super Admin": { canRead: true, canAdd: true, canEdit: true, canDelete: true },
    "Admin": { canRead: true, canAdd: true, canEdit: false, canDelete: false }
};

const systemModules = [
    "SenEtizens Directory",
    "Document Requests",
    "Financial Assistance",
    "Medical Assistance",
    "Social Wellness (Events)",
    "Content Management"
];

let activeAdminSearchFilterQuery = "";
let currentEditAdminId = null;
let currentDeleteAdminId = null;

// --- REGEX VALIDATION DICTIONARY ---
const REGEX_RULES = {
    alphaSpaceOnly: /^[a-zA-ZÑñ\s]+$/,
    alphaNumSpaceDash: /^[a-zA-Z0-9Ññ\s\-]+$/,
    fullNameWithTitles: /^[a-zA-ZÑñ\s\-.,]+$/,
    completeAddress: /^[a-zA-Z0-9Ññ\s\-.,&#()]+$/,
    phonePH: /^(?:\+63|0)[0-9\-\s]{9,13}$/,
    emailFormat: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    empIdFormat: /^EMP-\d{3,4}$/i,
    notEmpty: /.+/
};

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

window.openModal = function(modalId) {
    document.getElementById('custom-modal-overlay').style.display = 'block';
    document.getElementById(modalId).style.display = 'flex';
};

window.closeModals = function() {
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
    
    // Clear Validation UI on close
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));

    currentEditAdminId = null;
    currentDeleteAdminId = null;
};

document.addEventListener("DOMContentLoaded", () => {
    if (!checkAdminAuth()) return;
    populateAdminName();
    setupMobileMenuBurger();
    setupTabNavigation();
    setupFileUploadValidation();
    setupSaveLogic();
    setupAdminManagementActions();
    setupACLTabLogic();
    setupLogoutButton();

    hydrateConfigurationFields();
    renderAdministratorsTableRoster();
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

function setupTabNavigation() {
    const tabs = document.querySelectorAll(".settings-tab-btn");
    const panes = document.querySelectorAll(".settings-tab-pane");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panes.forEach((p) => (p.style.display = "none"));

            tab.classList.add("active");
            const targetId = tab.getAttribute("data-target");
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.style.display = "block";
        });
    });
}

function hydrateConfigurationFields() {
    document.getElementById('setting-brgy-name').value = mockSystemSettingsStore?.barangayName || "";
    document.getElementById('setting-municipality').value = mockSystemSettingsStore?.municipality || "";
    document.getElementById('setting-province').value = mockSystemSettingsStore?.province || "";
    document.getElementById('setting-captain').value = mockSystemSettingsStore?.captain || "";
    document.getElementById('setting-osca').value = mockSystemSettingsStore?.oscaHead || "";
    document.getElementById('setting-address').value = mockSystemSettingsStore?.address || "";
    document.getElementById('setting-contact').value = mockSystemSettingsStore?.contactNumber || "";
    document.getElementById('setting-email').value = mockSystemSettingsStore?.publicEmail || "";
    document.getElementById('setting-hours').value = mockSystemSettingsStore?.workingHours || "";
}

function setupFileUploadValidation() {
    const fileInput = document.getElementById('setting-logo');
    const uploadText = document.getElementById('file-upload-text');
    const dropZone = document.getElementById('file-drop-zone');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            dropZone.classList.remove('file-error');

            if (file) {
                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                    dropZone.classList.add('file-error');
                    uploadText.innerHTML = `<i class="fas fa-exclamation-circle text-danger"></i> Invalid format. PNG/JPG only.`;
                    fileInput.value = "";
                    return;
                }
                if (file.size > 2 * 1024 * 1024) { 
                    dropZone.classList.add('file-error');
                    uploadText.innerHTML = `<i class="fas fa-exclamation-circle text-danger"></i> File too large. Max 2MB.`;
                    fileInput.value = "";
                    return;
                }
                uploadText.innerHTML = `<i class="fas fa-check-circle text-success" style="color:#10B981"></i> ${file.name}`;
            }
        });
    }
}

function triggerFieldError(inputId, msgId) {
    document.getElementById(inputId).classList.add('input-error');
    document.getElementById(msgId).classList.add('show');
}

function clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));
}

function validateBarangayInfoFields() {
    clearFieldErrors();
    let isValid = true;

    const validationMap = [
        { id: 'setting-brgy-name', msg: 'msg-brgy-name', regex: REGEX_RULES.alphaNumSpaceDash },
        { id: 'setting-municipality', msg: 'msg-municipality', regex: REGEX_RULES.alphaSpaceOnly },
        { id: 'setting-province', msg: 'msg-province', regex: REGEX_RULES.alphaSpaceOnly },
        { id: 'setting-captain', msg: 'msg-captain', regex: REGEX_RULES.fullNameWithTitles },
        { id: 'setting-osca', msg: 'msg-osca', regex: REGEX_RULES.fullNameWithTitles },
        { id: 'setting-address', msg: 'msg-address', regex: REGEX_RULES.completeAddress },
        { id: 'setting-contact', msg: 'msg-contact', regex: REGEX_RULES.phonePH },
        { id: 'setting-email', msg: 'msg-email', regex: REGEX_RULES.emailFormat },
        { id: 'setting-hours', msg: 'msg-hours', regex: REGEX_RULES.notEmpty }
    ];

    validationMap.forEach(field => {
        const inputEl = document.getElementById(field.id);
        const val = inputEl.value.trim();

        if (val === "" || !field.regex.test(val)) {
            triggerFieldError(field.id, field.msg);
            isValid = false;
        }
    });

    return isValid;
}

function setupSaveLogic() {
    const saveBtn = document.getElementById("btn-save-settings");
    const saveBtnText = document.getElementById("save-btn-text");
    
    if (saveBtn && saveBtnText) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();

            if (!validateBarangayInfoFields()) {
                alert("Settings Update Aborted: Please correct the highlighted errors before saving.");
                return;
            }

            const originalText = saveBtnText.innerText;
            saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
            saveBtn.disabled = true;

            mockSystemSettingsStore.barangayName = document.getElementById("setting-brgy-name").value.trim();
            mockSystemSettingsStore.municipality = document.getElementById("setting-municipality").value.trim();
            mockSystemSettingsStore.province = document.getElementById("setting-province").value.trim();
            mockSystemSettingsStore.captain = document.getElementById("setting-captain").value.trim();
            mockSystemSettingsStore.oscaHead = document.getElementById("setting-osca").value.trim();
            mockSystemSettingsStore.address = document.getElementById("setting-address").value.trim();
            mockSystemSettingsStore.contactNumber = document.getElementById("setting-contact").value.trim();
            mockSystemSettingsStore.publicEmail = document.getElementById("setting-email").value.trim();
            mockSystemSettingsStore.workingHours = document.getElementById("setting-hours").value.trim();
            
            setTimeout(() => {
                saveBtnText.innerHTML = "Configurations Saved";
                saveBtn.style.backgroundColor = "#10B981"; 

                setTimeout(() => {
                    saveBtnText.innerHTML = originalText;
                    saveBtn.style.backgroundColor = ""; 
                    saveBtn.disabled = false;
                }, 1000);
            }, 400);
        });
    }
}

// --- SECURE ADMIN ACCOUNT MANAGEMENT ---
function setupAdminManagementActions() {
    const inviteBtn = document.getElementById('btn-add-admin');
    const searchInput = document.getElementById('search-admin');
    const saveAdminBtn = document.getElementById('btn-save-admin');
    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeAdminSearchFilterQuery = e.target.value.toLowerCase().trim();
            renderAdministratorsTableRoster();
        });
    }
    
    if (inviteBtn) {
        inviteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFieldErrors();
            currentEditAdminId = null; 
            document.getElementById('modal-title').innerHTML = "<i class='fas fa-user-plus'></i> Invite New Admin";
            
            document.getElementById('modal-emp-id').value = "";
            document.getElementById('modal-emp-id').disabled = false; 
            document.getElementById('modal-name').value = "";
            document.getElementById('modal-email').value = "";
            document.getElementById('modal-phone').value = "";
            document.getElementById('modal-role').value = "Admin";
            
            openModal('admin-form-modal');
        });
    }

    if (saveAdminBtn) {
        saveAdminBtn.addEventListener('click', () => {
            clearFieldErrors();
            let isFormValid = true;

            const empId = document.getElementById('modal-emp-id').value.trim();
            const name = document.getElementById('modal-name').value.trim();
            const email = document.getElementById('modal-email').value.trim();
            const phone = document.getElementById('modal-phone').value.trim();
            const role = document.getElementById('modal-role').value;

            if (!REGEX_RULES.empIdFormat.test(empId)) { triggerFieldError('modal-emp-id', 'msg-modal-emp-id'); isFormValid = false; }
            if (!REGEX_RULES.fullNameWithTitles.test(name)) { triggerFieldError('modal-name', 'msg-modal-name'); isFormValid = false; }
            if (!REGEX_RULES.emailFormat.test(email)) { triggerFieldError('modal-email', 'msg-modal-email'); isFormValid = false; }
            if (!REGEX_RULES.phonePH.test(phone)) { triggerFieldError('modal-phone', 'msg-modal-phone'); isFormValid = false; }
            if (role !== "Super Admin" && role !== "Admin") { triggerFieldError('modal-role', 'msg-modal-role'); isFormValid = false; }

            if (!isFormValid) return;

            if (currentEditAdminId) {
                // Prevent demotion of the last Super Admin
                if (role !== "Super Admin") {
                    const adminToEdit = mockAdministratorsCache.find(a => a.id === currentEditAdminId);
                    if (adminToEdit && adminToEdit.role === "Super Admin") {
                        const superAdminCount = mockAdministratorsCache.filter(a => a.role === "Super Admin").length;
                        if (superAdminCount <= 1) {
                            return alert("Security Protocol: You cannot demote the final remaining Super Admin account.");
                        }
                    }
                }

                const admin = mockAdministratorsCache.find(a => a.id === currentEditAdminId);
                if (admin) {
                    admin.empId = empId.toUpperCase();
                    admin.name = name;
                    admin.email = email;
                    admin.phone = phone;
                    admin.role = role;
                }
            } else {
                // Check duplicate EMP ID
                if (mockAdministratorsCache.some(a => a.empId === empId.toUpperCase())) {
                    triggerFieldError('modal-emp-id', 'msg-modal-emp-id');
                    alert("This Employee ID is already registered in the system.");
                    return;
                }

                mockAdministratorsCache.push({
                    id: "adm_" + Date.now(),
                    empId: empId.toUpperCase(),
                    name: name,
                    email: email,
                    phone: phone,
                    role: role,
                    status: "Active"
                });
            }

            renderAdministratorsTableRoster();
            renderACLUsersList(document.getElementById('acl-role-selector').value);
            closeModals();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (currentDeleteAdminId) {
                const adminToDelete = mockAdministratorsCache.find(a => a.id === currentDeleteAdminId);
                
                if (adminToDelete && adminToDelete.role === "Super Admin") {
                    const superAdminCount = mockAdministratorsCache.filter(a => a.role === "Super Admin").length;
                    if (superAdminCount <= 1) {
                        alert("Security Protocol: System requires at least one active Super Admin. Deletion rejected.");
                        closeModals();
                        return;
                    }
                }

                mockAdministratorsCache = mockAdministratorsCache.filter(a => a.id !== currentDeleteAdminId);
                renderAdministratorsTableRoster();
                renderACLUsersList(document.getElementById('acl-role-selector').value);
            }
            closeModals();
        });
    }
}

function renderAdministratorsTableRoster() {
    const tbody = document.getElementById('admins-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filteredAdmins = mockAdministratorsCache.filter(adm => {
        return !activeAdminSearchFilterQuery || 
               adm.name.toLowerCase().includes(activeAdminSearchFilterQuery) || 
               adm.email.toLowerCase().includes(activeAdminSearchFilterQuery) ||
               adm.empId.toLowerCase().includes(activeAdminSearchFilterQuery);
    });

    if (filteredAdmins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state"><i class="fas fa-users-slash" style="display:block; margin-bottom:6px; opacity:0.4;"></i>No administrative accounts match your search parameters.</td></tr>`;
        return;
    }

    filteredAdmins.forEach(adm => {
        let roleBadgeClass = adm.role === "Super Admin" ? "badge super-admin" : "badge admin-role";
        
        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${adm.empId}</strong></td>
            <td><strong style="color: var(--text-main); font-weight: 600;">${adm.name}</strong></td>
            <td>${adm.email}</td>
            <td>${adm.phone}</td>
            <td><span class="${roleBadgeClass}">${adm.role}</span></td>
            <td><span class="badge active-status">${adm.status}</span></td>
            <td>
                <button class="btn-icon" title="Modify Access Key" onclick="window.editAdminAccountRoleScope('${adm.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon text-crimson" title="Revoke Authorization" onclick="window.revokeAdminAccountPrivileges('${adm.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(rowHTML);
    });
}

window.editAdminAccountRoleScope = function(adminId) {
    const admin = mockAdministratorsCache.find(a => a.id === adminId);
    if (!admin) return;

    clearFieldErrors();
    currentEditAdminId = adminId;
    document.getElementById('modal-title').innerHTML = "<i class='fas fa-user-edit'></i> Edit Administrator";
    
    document.getElementById('modal-emp-id').value = admin.empId;
    document.getElementById('modal-emp-id').disabled = true; 
    document.getElementById('modal-name').value = admin.name;
    document.getElementById('modal-email').value = admin.email;
    document.getElementById('modal-phone').value = admin.phone;
    document.getElementById('modal-role').value = admin.role;

    openModal('admin-form-modal');
};

window.revokeAdminAccountPrivileges = function(adminId) {
    const admin = mockAdministratorsCache.find(a => a.id === adminId);
    if (!admin) return;

    currentDeleteAdminId = adminId;
    document.getElementById('delete-confirm-text').innerHTML = `Are you sure you want to completely revoke system access for <strong>${admin.name}</strong>? This action will remove them from the active roster.`;
    
    openModal('confirm-delete-modal');
};

// --- ROLES & PERMISSIONS (ACL) LOGIC ---
function setupACLTabLogic() {
    const roleSelector = document.getElementById('acl-role-selector');
    const saveAclBtn = document.getElementById('btn-save-acl');

    if (roleSelector) {
        renderACLMatrix(roleSelector.value);
        renderACLUsersList(roleSelector.value);

        roleSelector.addEventListener('change', (e) => {
            renderACLMatrix(e.target.value);
            renderACLUsersList(e.target.value);
        });
    }

    if (saveAclBtn) {
        saveAclBtn.addEventListener('click', () => {
            const currentRole = roleSelector.value;
            if (currentRole === "Super Admin") {
                alert("Super Admin permissions are fixed by the system and cannot be altered.");
                return;
            }

            saveAclBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
            saveAclBtn.disabled = true;

            setTimeout(() => {
                saveAclBtn.innerHTML = `<i class="fas fa-check"></i> Matrix Saved`;
                saveAclBtn.style.backgroundColor = "#10B981";

                setTimeout(() => {
                    saveAclBtn.innerHTML = `<i class="fas fa-save"></i> Save Permissions`;
                    saveAclBtn.style.backgroundColor = "";
                    saveAclBtn.disabled = false;
                }, 1000);
            }, 500);
        });
    }
}

function renderACLMatrix(roleName) {
    const tbody = document.getElementById('acl-matrix-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const isSuper = roleName === "Super Admin";
    const perms = mockRolePermissions[roleName] || { canRead: false, canAdd: false, canEdit: false, canDelete: false };

    systemModules.forEach(module => {
        const lockSettings = module === "System Settings" && !isSuper;

        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${module}</strong></td>
            <td class="text-center"><input type="checkbox" class="custom-checkbox" ${isSuper || perms.canRead ? 'checked' : ''} ${isSuper || lockSettings ? 'disabled' : ''}></td>
            <td class="text-center"><input type="checkbox" class="custom-checkbox" ${isSuper || perms.canAdd ? 'checked' : ''} ${isSuper || lockSettings ? 'disabled' : ''}></td>
            <td class="text-center"><input type="checkbox" class="custom-checkbox" ${isSuper || perms.canEdit ? 'checked' : ''} ${isSuper || lockSettings ? 'disabled' : ''}></td>
            <td class="text-center"><input type="checkbox" class="custom-checkbox" ${isSuper || perms.canDelete ? 'checked' : ''} ${isSuper || lockSettings ? 'disabled' : ''}></td>
        `;
        tbody.appendChild(rowHTML);
    });
}

function renderACLUsersList(roleName) {
    const tbody = document.getElementById('acl-users-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const usersInRole = mockAdministratorsCache.filter(adm => adm.role === roleName);

    if (usersInRole.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty-state"><i class="fas fa-user-slash" style="display:block; margin-bottom:6px; opacity:0.4;"></i>No active administrators currently assigned to this role scope.</td></tr>`;
        return;
    }

    usersInRole.forEach(adm => {
        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${adm.empId}</strong></td>
            <td>${adm.name}</td>
            <td>${adm.email}</td>
            <td><span class="badge active-status">${adm.status}</span></td>
        `;
        tbody.appendChild(rowHTML);
    });
}

