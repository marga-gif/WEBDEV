// Shared API base URL for superadmin pages
if (window.location.hostname === 'localhost') {
    window.API_BASE = window.API_BASE || 'http://localhost:5000/api';
} else if (window.location.hostname === '127.0.0.1') {
    window.API_BASE = window.API_BASE || 'http://127.0.0.1:5000/api';
} else {
    window.API_BASE = window.API_BASE || 'https://webdev-r8m4.onrender.com/api';
}
