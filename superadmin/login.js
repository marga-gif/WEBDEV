const API_BASE = window.API_BASE || `${window.location.origin}/api`;
const loginForm = document.getElementById('superadmin-login-form');
const toastElement = document.getElementById('toast');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Back button to Admin Login
const backBtn = document.querySelector('.btn-back-to-user-login, .btn-back-to-admin-login');
if (backBtn) {
  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../admin/auth/index.html';
  });
}

function showToast(message, duration = 3200) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  window.clearTimeout(window.loginToastTimeout);
  window.loginToastTimeout = window.setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me-checkbox').checked;
  const loginButton = document.getElementById('btn-login');

  if (!email || !password) {
    showToast('Please enter both email and password.', 3200);
    return;
  }

  if (!emailRegex.test(email)) {
    showToast('Please enter a valid email address.', 3200);
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Signing in...';

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, portal: 'superadmin' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    const authPayload = {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };

    localStorage.setItem('barangay_supAd_auth', JSON.stringify(authPayload));
    localStorage.setItem('barangay_supAd_user', JSON.stringify(data.user));
    sessionStorage.setItem('barangay_supAd_logged_in', 'true');
    localStorage.setItem('barangay_supAd_remembered', rememberMe ? 'true' : 'false');

    showToast('Login successful! Redirecting...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 600);
  } catch (error) {
    showToast(error.message || 'Unable to sign in.');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Sign In';
  }
});

const toggleButtons = document.querySelectorAll('.btn-toggle-password');
if (toggleButtons.length) {
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        button.querySelector('i').classList.remove('fa-eye-slash');
        button.querySelector('i').classList.add('fa-eye');
      } else {
        input.type = 'password';
        button.querySelector('i').classList.remove('fa-eye');
        button.querySelector('i').classList.add('fa-eye-slash');
      }
    });
  });
}
