// SIMULATED AUTHENTICATION STATE
const MOCK_AUTH_USER = {
    id: "adm_1",
    empId: "EMP-001",
    firstName: "Juan",
    middleName: "Macalintal",
    lastName: "Dela Cruz",
    suffix: "",
    dob: "1990-05-15",
    
    street: "Purok 2, Main Street, Barangay San Jose",
    city: "Antipolo",
    province: "Rizal",
    zip: "1870",

    email: "juan.delacruz@barangay.gov.ph",
    phone: "0917-111-2222",
    role: "Administrator", // Set directly to "Administrator" to match the image precisely
    avatarUrl: null 
};

// REGEX VALIDATION DICTIONARY
const REGEX_RULES = {
    namePart: /^[a-zA-ZÑñ\s\-']{2,60}$/, 
    suffixPart: /^[a-zA-Z\s.]+$/, 
    address: /^[a-zA-Z0-9Ññ\s\-.,&#()]+$/,
    cityProv: /^[a-zA-ZÑñ\s\-]+$/,
    zip: /^[0-9]{4}$/,
    phonePH: /^(?:09|\+639)\d{2}-?\d{3}-?\d{4}$/, 
    emailFormat: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/ 
};

const API_BASE = window.API_BASE || '';

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
    const adminUser = getAdminUser();
    const displayName = adminUser?.fullName || adminUser?.email || 'admin@barangay.gov.ph';
    const roleName = adminUser?.role || 'Administrator';

    const adminNameEl = document.getElementById(selector) || document.getElementById('nav-admin-name');
    if (adminNameEl) adminNameEl.textContent = displayName;
    const profileCardName = document.getElementById('card-admin-name');
    if (profileCardName) profileCardName.textContent = displayName;
    const adminRoleEl = document.getElementById('nav-admin-role') || document.getElementById('auth-admin-role');
    if (adminRoleEl) adminRoleEl.textContent = roleName;
}

async function loadProfileFromApi() {
    const token = ensureAdminAuth();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Failed to load profile');
        return await res.json();
    } catch (err) {
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
    checkFormCompleteness(); 
    checkPasswordCompleteness(); 
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
            if (sidebarMenu.classList.contains('mobile-visible') && !sidebarMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
                sidebarMenu.classList.remove('mobile-visible');
            }
        });
    }
}

function hydrateProfileInterface() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('barangay_admin_user') || 'null'); } catch (e) { stored = null; }

    const profileData = stored || MOCK_AUTH_USER;
    const displayName = profileData.fullName || profileData.email || `${profileData.firstName} ${profileData.lastName}`;
    
    document.getElementById('nav-admin-name').textContent = displayName;
    document.getElementById('card-admin-name').textContent = displayName;
    document.getElementById('card-role-badge').textContent = profileData.role || MOCK_AUTH_USER.role;

    document.getElementById('prof-emp-id').value = profileData.empId || MOCK_AUTH_USER.empId;
    document.getElementById('prof-role').value = profileData.role || MOCK_AUTH_USER.role;
    document.getElementById('prof-fname').value = profileData.firstName || '';
    document.getElementById('prof-mname').value = profileData.middleName || '';
    document.getElementById('prof-lname').value = profileData.lastName || '';
    document.getElementById('prof-suffix').value = profileData.suffix || '';
    document.getElementById('prof-dob').value = profileData.birthDate || profileData.dob || '';
    document.getElementById('prof-phone').value = profileData.mobile || profileData.phone || '';
    document.getElementById('prof-email').value = profileData.email || '';
    document.getElementById('prof-street').value = profileData.street || MOCK_AUTH_USER.street || '';
    document.getElementById('prof-city').value = profileData.city || MOCK_AUTH_USER.city || '';
    document.getElementById('prof-prov').value = profileData.province || MOCK_AUTH_USER.province || '';
    document.getElementById('prof-zip').value = profileData.zip || MOCK_AUTH_USER.zip || '';
}

function checkFormCompleteness() {
    const reqFields = document.querySelectorAll('.req-field');
    const saveBtn = document.getElementById('btn-save-profile');
    const saveBtnMobile = document.getElementById('btn-save-profile-mobile');
    
    let isComplete = true;
    reqFields.forEach(field => { if (field.value.trim() === '') isComplete = false; });
    
    if (saveBtn) saveBtn.disabled = !isComplete;
    if (saveBtnMobile) saveBtnMobile.disabled = !isComplete;
}

function checkPasswordCompleteness() {
    const reqPassFields = document.querySelectorAll('.req-pass');
    const updatePassBtn = document.getElementById('btn-update-password');
    const updatePassBtnMobile = document.getElementById('btn-update-password-mobile');
    
    let isComplete = true;
    reqPassFields.forEach(field => { if (field.value.trim() === '') isComplete = false; });
    
    if (updatePassBtn) updatePassBtn.disabled = !isComplete;
    if (updatePassBtnMobile) updatePassBtnMobile.disabled = !isComplete;
}

function evaluatePasswordStrength(password) {
    const meter = document.getElementById('password-strength-meter');
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    if (password.length === 0) { meter.style.display = 'none'; return; }
    meter.style.display = 'block';
    let score = 0;
    if (password.length > 7) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    fill.className = 'strength-fill';
    switch (score) {
        case 1: case 2: fill.classList.add('strength-weak'); text.textContent = 'Weak'; text.style.color = '#EF4444'; break;
        case 3: fill.classList.add('strength-fair'); text.textContent = 'Fair'; text.style.color = '#F59E0B'; break;
        case 4: fill.classList.add(password.length >= 10 ? 'strength-verystrong' : 'strength-strong'); text.textContent = password.length >= 10 ? 'Very Strong' : 'Strong'; text.style.color = password.length >= 10 ? '#10B981' : '#3B82F6'; break;
    }
}

function setupRealTimeValidation() {
    const inputs = document.querySelectorAll('input.val-input');
    inputs.forEach(input => {
        // Validation format execution and trimming on blur
        input.addEventListener('blur', (e) => {
            const val = e.target.value.trim();
            e.target.value = val; 
            
            if (e.target.classList.contains('req-field') || e.target.classList.contains('req-pass')) {
                if (!val) triggerFieldError(e.target.id, `msg-${e.target.id}`);
            }
        });
        
        input.addEventListener('input', (e) => {
            e.target.classList.remove('input-error');
            const msgObj = document.getElementById(`msg-${e.target.id}`);
            if (msgObj) msgObj.classList.remove('show');
            if (e.target.classList.contains('req-field')) checkFormCompleteness();
            if (e.target.classList.contains('req-pass')) checkPasswordCompleteness();
            if (e.target.id === 'prof-new-pass') evaluatePasswordStrength(e.target.value);
            if (e.target.id === 'prof-phone') {
                let val = e.target.value.replace(/\D/g, ''); 
                if (val.length > 4 && val.length <= 7) val = val.slice(0, 4) + '-' + val.slice(4);
                else if (val.length > 7) val = val.slice(0, 4) + '-' + val.slice(4, 7) + '-' + val.slice(7, 11);
                e.target.value = val;
            }
            
            const globalMsg = document.getElementById('global-profile-msg');
            if (globalMsg) globalMsg.classList.remove('show');
        });
    });
}

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
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
                    errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> JPEG/PNG only.`;
                    errorMsg.classList.add('show');
                    fileInput.value = "";
                    return;
                }
                if (file.size > 2 * 1024 * 1024) { 
                    errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> File too large. Max 2MB.`;
                    errorMsg.classList.add('show');
                    fileInput.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(event) {
                    const placeholder = document.getElementById('avatar-placeholder');
                    const imgPreview = document.getElementById('avatar-image-preview');
                    const footerIcon = document.getElementById('footer-icon');
                    const footerAvatar = document.getElementById('footer-avatar');

                    placeholder.style.display = 'none';
                    imgPreview.src = event.target.result;
                    imgPreview.style.display = 'block';

                    footerIcon.style.display = 'none';
                    footerAvatar.src = event.target.result;
                    footerAvatar.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

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

function triggerFieldError(inputId, msgId) {
    const inputEl = document.getElementById(inputId);
    const msgEl = document.getElementById(msgId);
    if(inputEl) inputEl.classList.add('input-error');
    if(msgEl) msgEl.classList.add('show');
}

function clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));
    
    const globalMsg = document.getElementById('global-profile-msg');
    if (globalMsg) globalMsg.classList.remove('show');
}

function setupProfileFormLogic() {
    const saveBtn = document.getElementById("btn-save-profile");
    const saveBtnMobile = document.getElementById("btn-save-profile-mobile");
    const saveBtnText = document.getElementById("save-btn-text");
    const globalMsg = document.getElementById("global-profile-msg");

    const executeProfileUpdate = async (e) => {
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
        
        const street = document.getElementById('prof-street').value.trim();
        const city = document.getElementById('prof-city').value.trim();
        const prov = document.getElementById('prof-prov').value.trim();
        const zip = document.getElementById('prof-zip').value.trim();

        if (!fName || !REGEX_RULES.namePart.test(fName)) { triggerFieldError('prof-fname', 'msg-prof-fname'); isFormValid = false; }
        if (mName && !REGEX_RULES.namePart.test(mName)) { triggerFieldError('prof-mname', 'msg-prof-mname'); isFormValid = false; }
        if (!lName || !REGEX_RULES.namePart.test(lName)) { triggerFieldError('prof-lname', 'msg-prof-lname'); isFormValid = false; }
        if (suffix && !REGEX_RULES.suffixPart.test(suffix)) { triggerFieldError('prof-suffix', 'msg-prof-suffix'); isFormValid = false; }

        if (!validateAgeIsOver18(dob)) { triggerFieldError('prof-dob', 'msg-prof-dob'); isFormValid = false; }
        if (!REGEX_RULES.phonePH.test(phone)) { triggerFieldError('prof-phone', 'msg-prof-phone'); isFormValid = false; }
        if (!REGEX_RULES.emailFormat.test(email)) { triggerFieldError('prof-email', 'msg-prof-email'); isFormValid = false; }
        
        if (!street || !REGEX_RULES.address.test(street)) { triggerFieldError('prof-street', 'msg-prof-street'); isFormValid = false; }
        if (!city || !REGEX_RULES.cityProv.test(city)) { triggerFieldError('prof-city', 'msg-prof-city'); isFormValid = false; }
        if (!prov || !REGEX_RULES.cityProv.test(prov)) { triggerFieldError('prof-prov', 'msg-prof-prov'); isFormValid = false; }
        if (!zip || !REGEX_RULES.zip.test(zip)) { triggerFieldError('prof-zip', 'msg-prof-zip'); isFormValid = false; }

        if (!isFormValid) {
            if (globalMsg) {
                globalMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Profile Update Aborted: Please correct the highlighted errors below.`;
                globalMsg.className = 'validation-msg show text-danger';
                setTimeout(() => globalMsg.classList.remove('show'), 4000);
            }
            return;
        }

        const originalText = saveBtnText.innerText;
        
        // Double Submit Lock
        saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Updating...`;
        saveBtn.disabled = true;
        if (saveBtnMobile) {
            saveBtnMobile.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Wait...`;
            saveBtnMobile.disabled = true;
        }

        setTimeout(() => {
            saveBtnText.innerHTML = "Profile Updated";
            saveBtn.style.backgroundColor = "#10B981"; 
            if(saveBtnMobile) {
                saveBtnMobile.innerHTML = `<i class="far fa-save"></i> Updated`;
                saveBtnMobile.style.backgroundColor = "#10B981";
            }

            setTimeout(() => {
                saveBtnText.innerHTML = originalText;
                saveBtn.style.backgroundColor = ""; 
                saveBtn.disabled = false;
                
                if(saveBtnMobile) {
                    saveBtnMobile.innerHTML = `<i class="far fa-save"></i> Update`;
                    saveBtnMobile.style.backgroundColor = ""; 
                    saveBtnMobile.disabled = false;
                }
                checkFormCompleteness();
            }, 1500);
        }, 800);
    };

    if(saveBtn) saveBtn.addEventListener("click", executeProfileUpdate);
    if(saveBtnMobile) saveBtnMobile.addEventListener("click", executeProfileUpdate);
}

function setupSecurityFormLogic() {
    const updatePassBtn = document.getElementById('btn-update-password');
    const updatePassBtnMobile = document.getElementById('btn-update-password-mobile');
    const updatePassText = document.getElementById('save-pass-text');

    const executePasswordUpdate = (e) => {
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
        
        // Double Submit Lock
        updatePassText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
        updatePassBtn.disabled = true;
        if(updatePassBtnMobile) {
            updatePassBtnMobile.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Wait...`;
            updatePassBtnMobile.disabled = true;
        }

        setTimeout(() => {
            updatePassText.innerHTML = "Password Updated";
            updatePassBtn.style.backgroundColor = "#10B981"; 
            if(updatePassBtnMobile) {
                updatePassBtnMobile.innerHTML = `<i class="fas fa-key"></i> Updated`;
                updatePassBtnMobile.style.backgroundColor = "#10B981";
            }
            
            currentPass.value = "";
            newPass.value = "";
            confirmPass.value = "";
            document.getElementById('password-strength-meter').style.display = 'none';

            setTimeout(() => {
                updatePassText.innerHTML = originalText;
                updatePassBtn.style.backgroundColor = "var(--primary-dark)"; 
                updatePassBtn.disabled = false;

                if(updatePassBtnMobile) {
                    updatePassBtnMobile.innerHTML = `<i class="fas fa-key"></i> Pass`;
                    updatePassBtnMobile.style.backgroundColor = "var(--primary-dark)";
                    updatePassBtnMobile.disabled = false;
                }
                checkPasswordCompleteness();
            }, 1500);
        }, 800);
    };

    if(updatePassBtn) updatePassBtn.addEventListener('click', executePasswordUpdate);
    if(updatePassBtnMobile) updatePassBtnMobile.addEventListener('click', executePasswordUpdate);
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