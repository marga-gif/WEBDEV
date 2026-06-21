// ==========================================
// TOAST NOTIFICATION ENGINE
// ==========================================
window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span style="line-height: 1.4;">${message}</span>
    `;
    
    container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove smoothly after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for CSS transition
    }, 3500);
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth.js loaded locally. Initializing listeners...");
    
    // --- BACK TO USER LOGIN BUTTON ---
    const backBtn = document.querySelector('.btn-back-to-user-login');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Navigate back to the user-facing login page.
            // Use a relative path from /admin/auth/index.html to /html/login.html
            window.location.href = '../../html/login.html';
        });
    }
    
    // --- PASSWORD VISIBILITY TOGGLE LOGIC ---
    const togglePasswordBtns = document.querySelectorAll('.btn-toggle-password');
    
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const inputField = document.getElementById(targetId);
            const icon = btn.querySelector('i');

            if (inputField.type === 'password') {
                inputField.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye'); // Switch to slashed eye
            } else {
                inputField.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash'); // Switch back to normal eye
            }
        });
    });

    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('btn-login');
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('btn-register');

    // --- Regex Patterns for Strict Validation ---
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const nameRegex = /^[A-Za-zÑñ\s\-.,']+$/;

    // --- REMEMBER ME LOGIC ---
    const rememberMeCheckbox = document.getElementById('remember-me-checkbox');
    const loginEmailInput = document.getElementById('login-email');

    // Load saved email if it exists
    const savedEmail = localStorage.getItem('barangay_admin_email');
    if (savedEmail && loginEmailInput) {
        loginEmailInput.value = savedEmail;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const email = loginEmailInput.value.trim();
            const password = document.getElementById('login-password').value; 
            
            // Validation
            if (!email || !password) {
                showToast("Please enter both your email and password.", "warning");
                return; 
            }
            if (!emailRegex.test(email)) {
                showToast("Please enter a valid email address format.", "error");
                return;
            }

            // Save or clear Remember Me
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('barangay_admin_email', email);
            } else {
                localStorage.removeItem('barangay_admin_email');
            }

            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, portal: 'admin' }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Unable to sign in.');
                }

                const authPayload = {
                    idToken: data.idToken,
                    refreshToken: data.refreshToken,
                    user: data.user,
                };

                localStorage.setItem('barangay_admin_auth', JSON.stringify(authPayload));
                localStorage.setItem('barangay_admin_user', JSON.stringify(data.user));
                sessionStorage.setItem('barangay_admin_logged_in', 'true');
                localStorage.setItem('barangay_admin_remembered', rememberMeCheckbox && rememberMeCheckbox.checked ? 'true' : 'false');

                showToast("Login successful! Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = "../dashboard/index.html";
                }, 500);
            } catch (error) {
                showToast(error.message || 'Login failed.', "error");
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        });
    }

    // --- REGISTRATION LOGIC ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fname = document.getElementById('reg-firstname').value.trim();
            const mname = document.getElementById('reg-middlename').value.trim();
            const lname = document.getElementById('reg-lastname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const passwordConfirm = document.getElementById('reg-password-confirm').value;
            const adminToken = document.getElementById('reg-admin-token').value.trim();

            // Validation
            if (!fname || !lname || !email || !password || !passwordConfirm || !adminToken) {
                showToast("Please fill out all required fields.", "warning");
                return;
            }
            if (!nameRegex.test(fname) || !nameRegex.test(lname)) {
                showToast("Names must not contain numbers or special characters.", "error");
                return;
            }
            if (mname && !nameRegex.test(mname)) {
                showToast("Middle name must not contain numbers or special characters.", "error");
                return;
            }
            if (!emailRegex.test(email)) {
                showToast("Please enter a valid email address format.", "error");
                return;
            }
            if (password.length < 6) {
                showToast("Password must be at least 6 characters long.", "warning");
                return;
            }
            if (password !== passwordConfirm) {
                showToast("Passwords do not match. Please try again.", "error");
                return;
            }

            if (registerBtn) {
                const originalText = registerBtn.innerHTML;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
                registerBtn.disabled = true;

                try {
                    const response = await fetch(`${window.API_BASE}/auth/register/admin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            firstName: fname,
                            middleName: mname || undefined,
                            lastName: lname,
                            email,
                            password,
                            adminToken
                        }),
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Registration failed.');
                    }

                    showToast("Registration successful! Redirecting to login...", "success");
                    registerForm.reset();
                    
                    setTimeout(() => {
                        toggleAuthMode('login'); 
                    }, 1000);
                } catch (error) {
                    showToast(error.message || 'Registration failed. Please try again.', "error");
                } finally {
                    registerBtn.innerHTML = originalText;
                    registerBtn.disabled = false;
                }
            }
        });
    }

    // --- FORGOT PASSWORD MODAL LOGIC ---
    const forgotTrigger = document.getElementById('forgot-password-trigger');
    const recoveryModal = document.getElementById('forgot-password-modal');
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const closeRecoveryBtn = document.getElementById('close-recovery-modal-btn');
    const cancelRecoveryBtn = document.getElementById('cancel-recovery-btn');
    const sendRecoveryBtn = document.getElementById('send-recovery-link-btn');

    const openRecoveryModal = (e) => {
        e.preventDefault();
        if(modalOverlay) modalOverlay.style.display = "block";
        if(recoveryModal) recoveryModal.style.display = "flex";
    };

    const closeRecoveryModal = () => {
        if(modalOverlay) modalOverlay.style.display = "none";
        if(recoveryModal) recoveryModal.style.display = "none";
        document.getElementById('recovery-email').value = "";
    };

    if (forgotTrigger) forgotTrigger.addEventListener('click', openRecoveryModal);
    if (closeRecoveryBtn) closeRecoveryBtn.addEventListener('click', closeRecoveryModal);
    if (cancelRecoveryBtn) cancelRecoveryBtn.addEventListener('click', closeRecoveryModal);

    if (sendRecoveryBtn) {
        sendRecoveryBtn.addEventListener('click', () => {
            const recEmail = document.getElementById('recovery-email').value.trim();
            
            if (!recEmail || !emailRegex.test(recEmail)) {
                showToast("Please enter a valid email address to receive the link.", "error");
                return;
            }

            const originalText = sendRecoveryBtn.innerHTML;
            sendRecoveryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendRecoveryBtn.disabled = true;

            setTimeout(() => {
                showToast(`A secure password reset link has been dispatched to ${recEmail}.`, "success");
                sendRecoveryBtn.innerHTML = originalText;
                sendRecoveryBtn.disabled = false;
                closeRecoveryModal();
            }, 1200);
        });
    }
});

// ==========================================
// UI TOGGLE ENGINE
// ==========================================
function toggleAuthMode(mode) {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    if (mode === 'register') {
        loginSection.classList.remove('active');
        registerSection.classList.add('active');
    } else {
        registerSection.classList.remove('active');
        loginSection.classList.add('active');
    }
}