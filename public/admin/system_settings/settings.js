// FOR DEMO PURPOSES
let mockSystemSettingsStore = {
    barangayName: "Barangay San Jose",
    street: "Purok 2, Main Street",
    city: "Antipolo",
    province: "Rizal",
    postalCode: "1870",
    captain: "Hon. Pedro Penduko",
    oscaHead: "Maria Clara",
    contactNumber: "0917-111-2222",
    publicEmail: "info@barangaysanjose.gov.ph",
    workingHours: "8:00 AM - 5:00 PM (Monday - Friday)"
};

let mockAdministratorsCache = [
    { id: "adm_1", empId: "EMP-001", name: "Juan Dela Cruz", email: "juan.delacruz@barangay.gov.ph", phone: "0917-111-2222", role: "Super Admin", status: "Active" },
    { id: "adm_2", empId: "EMP-005", name: "Maria Santos", email: "maria.santos@barangay.gov.ph", phone: "0918-333-4444", role: "Admin", status: "Active" },
    { id: "adm_3", empId: "EMP-012", name: "Antonio Luna", email: "antonio.luna@barangay.gov.ph", phone: "0922-555-6666", role: "Admin", status: "Active" }
];

let mockStandardUsersCache = [
    { id: "usr_1", userId: "SC-2026-101", name: "Elena Santos", email: "elena.santos@gmail.com", regDate: "2026-05-12", status: "Active" },
    { id: "usr_2", userId: "SC-2026-102", name: "Ricardo Mendoza", email: "ricardo.m@yahoo.com", regDate: "2026-05-18", status: "Active" },
    { id: "usr_3", userId: "SC-2026-103", name: "Clara Reyes", email: "creyes_1955@gmail.com", regDate: "2026-06-02", status: "Suspended" }
];

let activeAdminSearchFilterQuery = "";
let activeUserSearchFilterQuery = "";
let isDirty = false; // Tracks unsaved changes

// --- REGEX VALIDATION DICTIONARY ---
const REGEX_RULES = {
    namePart: /^[a-zA-ZÑñ\s\-']{2,60}$/, 
    alphaNumSpaceDash: /^[a-zA-Z0-9Ññ\s\-.,']{2,100}$/,
    fullNameWithTitles: /^[a-zA-ZÑñ\s\-.,']{2,60}$/,
    completeAddress: /^[a-zA-Z0-9Ññ\s\-.,&#()]{5,}$/,
    postalCode: /^[0-9]{4}$/,
    phonePH: /^(?:09|\+639)\d{2}-?\d{3}-?\d{4}$/,
    emailFormat: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    empIdFormat: /^EMP-\d{3,4}$/i,
    notEmpty: /.+/
};

function getAdminUser() {
    try { return JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || null; } 
    catch (e) { return null; }
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
    clearFieldErrors();
};

document.addEventListener("DOMContentLoaded", () => {
    if (!checkAdminAuth()) return;
    populateAdminName();
    setupMobileMenuBurger();
    setupTabNavigation();
    setupFileUploadValidation();
    setupRealTimeValidation();
    setupSaveLogic();
    setupAdminManagementActions();
    setupUserManagementActions();
    setupUnsavedChangesWarning();

    hydrateConfigurationFields();
    checkBrgyFormCompleteness();
    renderAdministratorsTableRoster();
    renderStandardUsersTable();
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
    document.getElementById('setting-street').value = mockSystemSettingsStore?.street || "";
    document.getElementById('setting-city').value = mockSystemSettingsStore?.city || "";
    document.getElementById('setting-province').value = mockSystemSettingsStore?.province || "";
    document.getElementById('setting-postal').value = mockSystemSettingsStore?.postalCode || "";
    document.getElementById('setting-captain').value = mockSystemSettingsStore?.captain || "";
    document.getElementById('setting-osca').value = mockSystemSettingsStore?.oscaHead || "";
    document.getElementById('setting-contact').value = mockSystemSettingsStore?.contactNumber || "";
    document.getElementById('setting-email').value = mockSystemSettingsStore?.publicEmail || "";
    document.getElementById('setting-hours').value = mockSystemSettingsStore?.workingHours || "";
}

function setupFileUploadValidation() {
    const fileInput = document.getElementById('setting-logo');
    const uploadText = document.getElementById('file-upload-text');
    const dropZone = document.getElementById('file-drop-zone');
    const msgBlock = document.getElementById('msg-file-upload');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            dropZone.classList.remove('file-error');
            msgBlock.classList.remove('show');

            if (file) {
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                    dropZone.classList.add('file-error');
                    uploadText.innerHTML = `<i class="fas fa-exclamation-circle text-danger"></i> Format Error`;
                    msgBlock.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Invalid format. PNG, JPG, or WEBP only.`;
                    msgBlock.classList.add('show');
                    fileInput.value = "";
                    return;
                }
                if (file.size > 2 * 1024 * 1024) { 
                    dropZone.classList.add('file-error');
                    uploadText.innerHTML = `<i class="fas fa-exclamation-circle text-danger"></i> Size Error`;
                    msgBlock.innerHTML = `<i class="fas fa-exclamation-triangle"></i> File too large. Max 2MB.`;
                    msgBlock.classList.add('show');
                    fileInput.value = "";
                    return;
                }
                uploadText.innerHTML = `<i class="fas fa-check-circle text-success" style="color:#10B981"></i> ${file.name}`;
                isDirty = true;
            }
        });
    }
}

function triggerFieldError(inputId, msgId, customMessage = null) {
    const inputEl = document.getElementById(inputId);
    const msgEl = document.getElementById(msgId);
    if(inputEl) inputEl.classList.add('input-error');
    if(msgEl) {
        msgEl.classList.add('show');
        if(customMessage) {
            msgEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${customMessage}`;
        }
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));
    
    // Clear global error explicitly
    const globalErr = document.getElementById('global-brgy-error');
    if (globalErr) {
        globalErr.innerHTML = '';
        globalErr.classList.remove('show');
    }
}

// Error prevention constraint logic
function checkBrgyFormCompleteness() {
    const reqFields = document.querySelectorAll('.req-brgy-field');
    const saveBtn = document.getElementById('btn-save-settings');
    let isComplete = true;

    reqFields.forEach(field => {
        if (field.value.trim() === '') {
            isComplete = false;
        }
    });

    if (saveBtn) saveBtn.disabled = !isComplete;
}

function checkAdminFormCompleteness() {
    const reqFields = document.querySelectorAll('.req-admin-field');
    const saveBtn = document.getElementById('btn-save-admin');
    let isComplete = true;

    reqFields.forEach(field => {
        if (field.value.trim() === '') {
            isComplete = false;
        }
    });

    if (saveBtn) saveBtn.disabled = !isComplete;
}

function sanitizeInput(inputString) {
    // Strips HTML tags
    return inputString.replace(/<[^>]*>?/gm, '').trim();
}

function setupRealTimeValidation() {
    const inputs = document.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        // Evaluate input dynamically on interaction
        input.addEventListener('blur', (e) => {
            // Trim whitespace on blur
            if (e.target.tagName.toLowerCase() === 'input') {
                e.target.value = e.target.value.trim();
            }
            
            const val = e.target.value;
            if (e.target.classList.contains('req-brgy-field') || e.target.classList.contains('req-admin-field')) {
                if (!val) {
                    triggerFieldError(e.target.id, `msg-${e.target.id}`);
                }
            }
        });

        input.addEventListener('input', (e) => {
            e.target.classList.remove('input-error');
            const msgObj = document.getElementById(`msg-${e.target.id}`);
            if (msgObj) msgObj.classList.remove('show');

            if (e.target.classList.contains('form-dirty-trigger')) {
                isDirty = true;
            }

            if (e.target.classList.contains('req-brgy-field')) checkBrgyFormCompleteness();
            if (e.target.classList.contains('req-admin-field')) checkAdminFormCompleteness();

            if (e.target.id === 'setting-contact' || e.target.id === 'modal-phone') {
                let val = e.target.value.replace(/\D/g, ''); 
                if (val.length > 4 && val.length <= 7) {
                    val = val.slice(0, 4) + '-' + val.slice(4);
                } else if (val.length > 7) {
                    val = val.slice(0, 4) + '-' + val.slice(4, 7) + '-' + val.slice(7, 11);
                }
                e.target.value = val;
            }
        });
    });
}

function setupUnsavedChangesWarning() {
    window.addEventListener('beforeunload', function (e) {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function validateBarangayInfoFields() {
    clearFieldErrors();
    let isValid = true;

    const validationMap = [
        { id: 'setting-brgy-name', msg: 'msg-brgy-name', regex: REGEX_RULES.alphaNumSpaceDash },
        { id: 'setting-street', msg: 'msg-street', regex: REGEX_RULES.completeAddress },
        { id: 'setting-city', msg: 'msg-city', regex: REGEX_RULES.namePart },
        { id: 'setting-province', msg: 'msg-province', regex: REGEX_RULES.namePart },
        { id: 'setting-postal', msg: 'msg-postal', regex: REGEX_RULES.postalCode },
        { id: 'setting-captain', msg: 'msg-captain', regex: REGEX_RULES.fullNameWithTitles },
        { id: 'setting-osca', msg: 'msg-osca', regex: REGEX_RULES.fullNameWithTitles },
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
    const globalErrorBlock = document.getElementById("global-brgy-error");
    
    if (saveBtn && saveBtnText) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();

            if (!validateBarangayInfoFields()) {
                globalErrorBlock.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please correct the highlighted errors before saving.';
                globalErrorBlock.classList.add('show');
                return;
            }

            globalErrorBlock.classList.remove('show');
            const originalText = saveBtnText.innerText;
            saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
            saveBtn.disabled = true;

            // Apply HTML sanitization before saving state
            mockSystemSettingsStore.barangayName = sanitizeInput(document.getElementById("setting-brgy-name").value);
            mockSystemSettingsStore.street = sanitizeInput(document.getElementById("setting-street").value);
            mockSystemSettingsStore.city = sanitizeInput(document.getElementById("setting-city").value);
            mockSystemSettingsStore.province = sanitizeInput(document.getElementById("setting-province").value);
            mockSystemSettingsStore.postalCode = sanitizeInput(document.getElementById("setting-postal").value);
            mockSystemSettingsStore.captain = sanitizeInput(document.getElementById("setting-captain").value);
            mockSystemSettingsStore.oscaHead = sanitizeInput(document.getElementById("setting-osca").value);
            mockSystemSettingsStore.contactNumber = sanitizeInput(document.getElementById("setting-contact").value);
            mockSystemSettingsStore.publicEmail = sanitizeInput(document.getElementById("setting-email").value);
            mockSystemSettingsStore.workingHours = sanitizeInput(document.getElementById("setting-hours").value);
            
            setTimeout(() => {
                saveBtnText.innerHTML = "Configurations Saved";
                saveBtn.style.backgroundColor = "#10B981"; 
                isDirty = false; 

                setTimeout(() => {
                    saveBtnText.innerHTML = originalText;
                    saveBtn.style.backgroundColor = ""; 
                    saveBtn.disabled = false;
                }, 1500);
            }, 800);
        });
    }
}

// --- SECURE ADMIN ACCOUNT MANAGEMENT ---
function setupAdminManagementActions() {
    const inviteBtn = document.getElementById('btn-add-admin');
    const searchInput = document.getElementById('search-admin');
    const saveAdminBtn = document.getElementById('btn-save-admin');

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
            
            document.getElementById('modal-emp-id').value = "";
            document.getElementById('modal-name').value = "";
            document.getElementById('modal-email').value = "";
            document.getElementById('modal-phone').value = "";
            
            checkAdminFormCompleteness();
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

            if (!REGEX_RULES.empIdFormat.test(empId)) { triggerFieldError('modal-emp-id', 'msg-modal-emp-id'); isFormValid = false; }
            if (!REGEX_RULES.namePart.test(name)) { triggerFieldError('modal-name', 'msg-modal-name'); isFormValid = false; }
            if (!REGEX_RULES.emailFormat.test(email)) { triggerFieldError('modal-email', 'msg-modal-email'); isFormValid = false; }
            if (!REGEX_RULES.phonePH.test(phone)) { triggerFieldError('modal-phone', 'msg-modal-phone'); isFormValid = false; }

            if (!isFormValid) return;

            // Prevent duplicate accounts natively without an alert pop-up
            if (mockAdministratorsCache.some(a => a.empId === empId.toUpperCase())) {
                triggerFieldError('modal-emp-id', 'msg-modal-emp-id', 'This Employee ID is already registered in the system.');
                return;
            }
            
            // Double click prevention spinner
            saveAdminBtn.disabled = true;
            saveAdminBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                mockAdministratorsCache.push({
                    id: "adm_" + Date.now(),
                    empId: empId.toUpperCase(),
                    name: sanitizeInput(name),
                    email: email,
                    phone: phone,
                    role: "Admin",
                    status: "Active"
                });

                renderAdministratorsTableRoster();
                closeModals();
                saveAdminBtn.innerHTML = `<i class="fas fa-check"></i> Send Invite`; // Reset
            }, 600);
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
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">
            <i class="fas fa-users-slash" style="display:block; margin-bottom:12px; opacity:0.4; font-size:32px;"></i>
            No administrative accounts match your search parameters.
        </td></tr>`;
        return;
    }

    filteredAdmins.forEach(adm => {
        let roleBadgeClass = adm.role === "Super Admin" ? "badge super-admin" : "badge admin-role";
        let statusBadgeClass = adm.status === "Active" ? "badge active-status" : "badge inactive-status";
        
        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${adm.empId}</strong></td>
            <td><strong style="color: var(--text-main); font-weight: 600;">${adm.name}</strong></td>
            <td>${adm.email}</td>
            <td>${adm.phone}</td>
            <td><span class="${roleBadgeClass}">${adm.role}</span></td>
            <td><span class="${statusBadgeClass}">${adm.status}</span></td>
        `;
        tbody.appendChild(rowHTML);
    });
}

// --- STANDARD USER MANAGEMENT ---
function setupUserManagementActions() {
    const searchInput = document.getElementById('search-users');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeUserSearchFilterQuery = e.target.value.toLowerCase().trim();
            renderStandardUsersTable();
        });
    }

    // Connects custom action modal
    const confirmActionBtn = document.getElementById('btn-confirm-action');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', () => {
            if (pendingActionUser) {
                pendingActionUser.status = pendingActionUser.status === "Active" ? "Suspended" : "Active";
                renderStandardUsersTable();
                closeModals();
                pendingActionUser = null;
            }
        });
    }
}

function renderStandardUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filteredUsers = mockStandardUsersCache.filter(usr => {
        return !activeUserSearchFilterQuery || 
               usr.name.toLowerCase().includes(activeUserSearchFilterQuery) || 
               usr.email.toLowerCase().includes(activeUserSearchFilterQuery) ||
               usr.userId.toLowerCase().includes(activeUserSearchFilterQuery);
    });

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">
            <i class="fas fa-user-slash" style="display:block; margin-bottom:12px; opacity:0.4; font-size: 32px;"></i>
            No citizen accounts match your search parameters.
        </td></tr>`;
        return;
    }

    filteredUsers.forEach(usr => {
        let statusBadgeClass = usr.status === "Active" ? "badge active-status" : "badge inactive-status";
        let actionIcon = usr.status === "Active" ? "<i class='fas fa-ban'></i> Suspend" : "<i class='fas fa-check-circle'></i> Activate";
        let actionClass = usr.status === "Active" ? "text-crimson" : "text-success";
        
        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${usr.userId}</strong></td>
            <td><strong style="color: var(--text-main); font-weight: 600;">${usr.name}</strong></td>
            <td>${usr.email}</td>
            <td>${usr.regDate}</td>
            <td><span class="${statusBadgeClass}">${usr.status}</span></td>
            <td>
                <button class="btn-secondary-compact ${actionClass}" onclick="window.triggerUserStatusModal('${usr.id}')">${actionIcon}</button>
            </td>
        `;
        tbody.appendChild(rowHTML);
    });
}

// Global scope for pending action targeting
let pendingActionUser = null;

window.triggerUserStatusModal = function(userId) {
    const user = mockStandardUsersCache.find(u => u.id === userId);
    if (!user) return;
    
    pendingActionUser = user;
    const isSuspend = user.status === "Active";
    
    document.getElementById('confirm-title').innerHTML = isSuspend 
        ? '<i class="fas fa-exclamation-triangle text-danger"></i> Suspend User' 
        : '<i class="fas fa-check-circle text-success"></i> Activate User';
        
    document.getElementById('confirm-message').textContent = isSuspend 
        ? `Are you sure you want to suspend access for citizen account ${user.name}?` 
        : `Re-activate citizen account for ${user.name}?`;
        
    const confirmBtn = document.getElementById('btn-confirm-action');
    confirmBtn.className = isSuspend ? "btn-primary btn-danger-override" : "btn-primary btn-success-override";
    confirmBtn.innerHTML = isSuspend ? "<i class='fas fa-ban'></i> Confirm Suspend" : "<i class='fas fa-check'></i> Confirm Activate";
    
    openModal('confirm-action-modal');
};