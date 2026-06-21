// SIMULATED AUTHENTICATION STATE
const MOCK_AUTH_USER = {
    id: "adm_1",
    empId: "EMP-001",
    firstName: "Juan",
    middleName: "Macalintal",
    lastName: "Dela Cruz",
    suffix: "",
    dob: "1990-05-15",
    address: "Purok 2, Main Street, Barangay San Jose, Pandi",
    email: "juan.delacruz@barangay.gov.ph",
    phone: "0917-111-2222",
    role: "Admin",
    avatarUrl: null 
};

// REGEX VALIDATION DICTIONARY
const REGEX_RULES = {
    namePart: /^[a-zA-ZÑñ\s\-]+$/, 
    suffixPart: /^[a-zA-Z\s.]+$/, 
    address: /^[a-zA-Z0-9Ññ\s\-.,&#()]+$/,
    phonePH: /^(?:09|\+639)\d{2}-?\d{3}-?\d{4}$/, 
    emailFormat: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/ 
};

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
    const adminUser = getAdminUser();
    const displayName = adminUser?.fullName || adminUser?.email || 'Admin User';
    const roleName = adminUser?.role || 'Administrator';

    const adminNameEl = document.getElementById(selector) || document.getElementById('nav-admin-name');
    if (adminNameEl) {
        adminNameEl.textContent = displayName;
    }

    const profileCardName = document.getElementById('card-admin-name');
    if (profileCardName) {
        profileCardName.textContent = displayName;
    }

    const adminRoleEl = document.getElementById('nav-admin-role') || document.getElementById('auth-admin-role');
    if (adminRoleEl) {
        adminRoleEl.textContent = roleName;
    }
}

async function loadProfileFromApi() {
    const token = ensureAdminAuth();
    if (!token) return null;

    try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        return data;
    } catch (err) {
        console.warn('Could not load profile from API:', err);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAdminAuth()) return;
    setupMobileMenuBurger();
    populateAdminName();
    hydrateProfileInterface();

    const apiProfile = await loadProfileFromApi();
    if (apiProfile) {
        try {
            const stored = JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || {};
            stored.fullName = apiProfile.fullName || stored.fullName;
            stored.email = apiProfile.email || stored.email;
            stored.phone = apiProfile.phone || stored.phone;
            stored.purok = apiProfile.purok || stored.purok;
            localStorage.setItem('barangay_admin_user', JSON.stringify(stored));
        } catch (e) {}
        populateAdminName();
        hydrateProfileInterface();
    }

    setupAvatarUpload();
    setupProfileFormLogic();
    setupSecurityFormLogic();
    setupRealTimeValidation();
    setupPasswordToggles();
    setupLogoutButton();
});

// FIXED: Sidebar Mobile Logic
function setupMobileMenuBurger() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');
    
    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-visible');
        });
        
        // The fix: Using !burgerBtn.contains(e.target) prevents the icon click from instantly closing the menu
        document.addEventListener('click', (e) => {
            if (sidebarMenu.classList.contains('mobile-visible') && 
                !sidebarMenu.contains(e.target) && 
                !burgerBtn.contains(e.target)) {
                sidebarMenu.classList.remove('mobile-visible');
            }
        });
    }
}

// Helper to format full name securely
function constructFullName() {
    let name = MOCK_AUTH_USER.firstName;
    if (MOCK_AUTH_USER.middleName) name += ` ${MOCK_AUTH_USER.middleName.charAt(0)}.`;
    name += ` ${MOCK_AUTH_USER.lastName}`;
    if (MOCK_AUTH_USER.suffix) name += ` ${MOCK_AUTH_USER.suffix}`;
    return name;
}

// Populate interface with user data
function hydrateProfileInterface() {
    // Try to hydrate from stored admin user first
    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem('barangay_admin_user') || 'null');
    } catch (e) { stored = null; }

    if (stored) {
        const displayName = stored.fullName || stored.email || constructFullName();
        document.getElementById('nav-admin-name').textContent = displayName;
        document.getElementById('nav-admin-role').textContent = stored.role || MOCK_AUTH_USER.role;
        document.getElementById('card-admin-name').textContent = displayName;
        const roleBadge = document.getElementById('card-role-badge');
        roleBadge.textContent = stored.role || MOCK_AUTH_USER.role;
        roleBadge.className = (stored.role === "Super Admin") ? "role-badge super-admin" : "role-badge admin-role";

        document.getElementById('prof-emp-id').value = stored.empId || stored.uid || MOCK_AUTH_USER.empId;
        document.getElementById('prof-role').value = stored.role || MOCK_AUTH_USER.role;

        document.getElementById('prof-fname').value = stored.firstName || stored.first_name || '';
        document.getElementById('prof-mname').value = stored.middleName || '';
        document.getElementById('prof-lname').value = stored.lastName || '';
        document.getElementById('prof-suffix').value = stored.suffix || '';
        document.getElementById('prof-dob').value = stored.birthDate || stored.dob || '';
        document.getElementById('prof-phone').value = stored.mobile || stored.phone || '';
        document.getElementById('prof-email').value = stored.email || '';
        document.getElementById('prof-address').value = stored.street || stored.address || '';

        if (stored.photoData) setAvatarImage(stored.photoData);
    } else {
        // fallback to mock
        const displayName = constructFullName();
        document.getElementById('nav-admin-name').textContent = displayName;
        document.getElementById('nav-admin-role').textContent = MOCK_AUTH_USER.role;
        document.getElementById('card-admin-name').textContent = displayName;
        const roleBadge = document.getElementById('card-role-badge');
        roleBadge.textContent = MOCK_AUTH_USER.role;
        roleBadge.className = MOCK_AUTH_USER.role === "Super Admin" ? "role-badge super-admin" : "role-badge admin-role";

        document.getElementById('prof-emp-id').value = MOCK_AUTH_USER.empId;
        document.getElementById('prof-role').value = MOCK_AUTH_USER.role;

        document.getElementById('prof-fname').value = MOCK_AUTH_USER.firstName;
        document.getElementById('prof-mname').value = MOCK_AUTH_USER.middleName;
        document.getElementById('prof-lname').value = MOCK_AUTH_USER.lastName;
        document.getElementById('prof-suffix').value = MOCK_AUTH_USER.suffix;
        document.getElementById('prof-dob').value = MOCK_AUTH_USER.dob;
        document.getElementById('prof-phone').value = MOCK_AUTH_USER.phone;
        document.getElementById('prof-email').value = MOCK_AUTH_USER.email;
        document.getElementById('prof-address').value = MOCK_AUTH_USER.address;

        if (MOCK_AUTH_USER.avatarUrl) setAvatarImage(MOCK_AUTH_USER.avatarUrl);
    }
}

// Age Validator Helper
function validateAgeIsOver18(dobString) {
    if (!dobString) return false;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 18;
}

// Dynamic Input Masking & Error Clearing
function setupRealTimeValidation() {
    const inputs = document.querySelectorAll('input:not(.input-disabled)');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.classList.remove('input-error');
            const msgObj = document.getElementById(`msg-${e.target.id}`);
            if (msgObj) msgObj.classList.remove('show');

            if (e.target.id === 'prof-phone') {
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

function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.toggle-password');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    });
}

function setupAvatarUpload() {
    const fileInput = document.getElementById('profile-image-upload');
    const errorMsg = document.getElementById('msg-avatar-error');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            errorMsg.classList.remove('show');
            const file = e.target.files[0];

            if (file) {
                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                    errorMsg.textContent = "Invalid format. JPEG/PNG only.";
                    errorMsg.classList.add('show');
                    fileInput.value = "";
                    return;
                }
                if (file.size > 2 * 1024 * 1024) { 
                    errorMsg.textContent = "File too large. Max 2MB.";
                    errorMsg.classList.add('show');
                    fileInput.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(event) {
                    setAvatarImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function setAvatarImage(imgSrc) {
    const placeholder = document.getElementById('avatar-placeholder');
    const imgPreview = document.getElementById('avatar-image-preview');
    const footerIcon = document.getElementById('footer-icon');
    const footerAvatar = document.getElementById('footer-avatar');

    placeholder.style.display = 'none';
    imgPreview.src = imgSrc;
    imgPreview.style.display = 'block';

    footerIcon.style.display = 'none';
    footerAvatar.src = imgSrc;
    footerAvatar.style.display = 'block';
}

function triggerFieldError(inputId, msgId) {
    document.getElementById(inputId).classList.add('input-error');
    document.getElementById(msgId).classList.add('show');
}

function clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));
}

// Profile Form Action & Advanced Validation
function setupProfileFormLogic() {
    const saveBtn = document.getElementById("btn-save-profile");
    const saveBtnText = document.getElementById("save-btn-text");
    
    if (saveBtn && saveBtnText) {
        saveBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            clearFieldErrors();
            let isFormValid = true;

            const fName = document.getElementById('prof-fname').value.trim();
            const mName = document.getElementById('prof-mname').value.trim();
            const lName = document.getElementById('prof-lname').value.trim();
            const suffix = document.getElementById('prof-suffix').value.trim();
            const dob = document.getElementById('prof-dob').value;
            const phone = document.getElementById('prof-phone').value.trim();
            const email = document.getElementById('prof-email').value.trim();
            const address = document.getElementById('prof-address').value.trim();

            // Name Constraints
            if (!fName || !REGEX_RULES.namePart.test(fName)) { triggerFieldError('prof-fname', 'msg-prof-fname'); isFormValid = false; }
            if (mName && !REGEX_RULES.namePart.test(mName)) { triggerFieldError('prof-mname', 'msg-prof-mname'); isFormValid = false; }
            if (!lName || !REGEX_RULES.namePart.test(lName)) { triggerFieldError('prof-lname', 'msg-prof-lname'); isFormValid = false; }
            if (suffix && !REGEX_RULES.suffixPart.test(suffix)) { triggerFieldError('prof-suffix', 'msg-prof-suffix'); isFormValid = false; }

            // Demographic Constraints
            if (!validateAgeIsOver18(dob)) { triggerFieldError('prof-dob', 'msg-prof-dob'); isFormValid = false; }
            if (!REGEX_RULES.phonePH.test(phone)) { triggerFieldError('prof-phone', 'msg-prof-phone'); isFormValid = false; }
            if (!REGEX_RULES.emailFormat.test(email)) { triggerFieldError('prof-email', 'msg-prof-email'); isFormValid = false; }
            if (!address || !REGEX_RULES.address.test(address)) { triggerFieldError('prof-address', 'msg-prof-address'); isFormValid = false; }

            if (!isFormValid) {
                alert("Profile Update Aborted: Please correct the highlighted errors.");
                return;
            }

            const originalText = saveBtnText.innerText;
            saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Updating...`;
            saveBtn.disabled = true;

            // Commit to mock database
            const fullName = `${fName}${mName ? ' ' + mName.charAt(0) + '.' : ''} ${lName}${suffix ? ' ' + suffix : ''}`.trim();

            const token = getAdminToken();
            if (token) {
                try {
                    const res = await fetch(`${API_BASE}/auth/profile`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer ' + token,
                        },
                        body: JSON.stringify({ fullName, phone, purok: address }),
                    });

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Failed to save profile');
                    }

                    const updated = await res.json();
                    // Update local storage so other admin pages show updated info
                    try {
                        const stored = JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || {};
                        stored.fullName = updated.fullName || fullName;
                        stored.mobile = updated.phone || phone;
                        stored.phone = updated.phone || phone;
                        stored.purok = updated.purok || address;
                        localStorage.setItem('barangay_admin_user', JSON.stringify(stored));
                    } catch (e) { /* ignore */ }

                    document.getElementById('nav-admin-name').textContent = updated.fullName || fullName;
                    document.getElementById('card-admin-name').textContent = updated.fullName || fullName;

                    saveBtnText.innerHTML = "Profile Updated";
                    saveBtn.style.backgroundColor = "#10B981"; 

                    setTimeout(() => {
                        saveBtnText.innerHTML = originalText;
                        saveBtn.style.backgroundColor = ""; 
                        saveBtn.disabled = false;
                    }, 1500);
                } catch (err) {
                    alert(err.message || 'Unable to save profile.');
                    saveBtnText.innerHTML = originalText;
                    saveBtn.disabled = false;
                }
            } else {
                // No token - fall back to local commit
                MOCK_AUTH_USER.firstName = fName;
                MOCK_AUTH_USER.middleName = mName;
                MOCK_AUTH_USER.lastName = lName;
                MOCK_AUTH_USER.suffix = suffix;
                MOCK_AUTH_USER.dob = dob;
                MOCK_AUTH_USER.phone = phone;
                MOCK_AUTH_USER.email = email;
                MOCK_AUTH_USER.address = address;

                setTimeout(() => {
                    const newDisplayName = constructFullName();
                    document.getElementById('nav-admin-name').textContent = newDisplayName;
                    document.getElementById('card-admin-name').textContent = newDisplayName;

                    saveBtnText.innerHTML = "Profile Updated";
                    saveBtn.style.backgroundColor = "#10B981"; 

                    setTimeout(() => {
                        saveBtnText.innerHTML = originalText;
                        saveBtn.style.backgroundColor = ""; 
                        saveBtn.disabled = false;
                    }, 1500);
                }, 800);
            }
        });
    }
}

// Security Form Action
function setupSecurityFormLogic() {
    const updatePassBtn = document.getElementById('btn-update-password');
    const updatePassText = document.getElementById('save-pass-text');

    if (updatePassBtn) {
        updatePassBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFieldErrors();
            let isFormValid = true;

            const currentPass = document.getElementById('prof-current-pass');
            const newPass = document.getElementById('prof-new-pass');
            const confirmPass = document.getElementById('prof-confirm-pass');

            if (currentPass.value.trim() === "") {
                triggerFieldError('prof-current-pass', 'msg-current-pass');
                isFormValid = false;
            }

            if (!REGEX_RULES.strongPassword.test(newPass.value)) {
                triggerFieldError('prof-new-pass', 'msg-new-pass');
                isFormValid = false;
            }

            if (newPass.value !== confirmPass.value || confirmPass.value === "") {
                triggerFieldError('prof-confirm-pass', 'msg-confirm-pass');
                isFormValid = false;
            }

            if (!isFormValid) return;

            const originalText = updatePassText.innerText;
            updatePassText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Verifying...`;
            updatePassBtn.disabled = true;

            setTimeout(() => {
                updatePassText.innerHTML = "Password Updated";
                updatePassBtn.style.backgroundColor = "#10B981"; 
                
                currentPass.value = "";
                newPass.value = "";
                confirmPass.value = "";

                setTimeout(() => {
                    updatePassText.innerHTML = originalText;
                    updatePassBtn.style.backgroundColor = "var(--primary-dark)"; 
                    updatePassBtn.disabled = false;
                }, 1500);
            }, 800);
        });
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