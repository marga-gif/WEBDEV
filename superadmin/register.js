const registerForm = document.getElementById('register-form');
const backButton = document.querySelector('.btn-back-to-login');
const btnGoToLogin = document.getElementById('btn-go-to-login');
const toast = document.getElementById('toast');

// Back button to SuperAdmin Login
if (backButton) {
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'login.html';
  });
}

const API_BASE = window.API_BASE || `${window.location.origin}/api`;

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.style.backgroundColor = type === 'error' ? '#dc2626' : '#111827';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function redirectToLogin() {
  window.location.href = '../admin/auth/index.html';
}

function collectFormData() {
  return {
    firstName: document.getElementById('reg-firstname').value.trim(),
    middleName: document.getElementById('reg-middlename').value.trim(),
    lastName: document.getElementById('reg-lastname').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    passwordConfirm: document.getElementById('reg-password-confirm').value,
    portal: 'superadmin',
    portalToken: document.getElementById('reg-admin-token').value.trim(),
  };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(data) {
  if (!data.firstName || !data.lastName || !data.email || !data.password || !data.passwordConfirm || !data.portalToken) {
    showToast('Please complete all required fields.', 'error');
    return false;
  }

  if (!emailRegex.test(data.email)) {
    showToast('Please enter a valid email address.', 'error');
    return false;
  }

  if (data.password !== data.passwordConfirm) {
    showToast('Passwords do not match.', 'error');
    return false;
  }

  if (data.password.length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return false;
  }

  return true;
}

async function createSuperAdminAccount(data) {
  try {
    const response = await fetch(`${API_BASE}/auth/register/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        adminToken: data.portalToken,
        portal: data.portal,
      }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw new Error(responseBody.error || responseBody.message || 'Registration failed.');
    }

    return responseBody;
  } catch (error) {
    throw new Error(error.message || 'Unable to register.');
  }
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = collectFormData();
  if (!validateRegistration(data)) return;

  try {
    const result = await createSuperAdminAccount(data);
    showToast(result.message || 'Registration successful! Please log in.');
    setTimeout(redirectToLogin, 1500);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

btnBackToLogin.addEventListener('click', redirectToLogin);
btnGoToLogin.addEventListener('click', redirectToLogin);

const passwordToggleButtons = document.querySelectorAll('.btn-toggle-password');
passwordToggleButtons.forEach(button => {
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
