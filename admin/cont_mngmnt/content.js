document.addEventListener('DOMContentLoaded', () => {
    // Inject mobile slide-out class override to match the Citizens module menu logic
    const responsiveStyleOverride = document.createElement('style');
    responsiveStyleOverride.innerHTML = `
        @media screen and (max-width: 768px) {
            .sidebar.mobile-visible {
                transform: translateX(0) !important;
                box-shadow: 10px 0 30px rgba(0,0,0,0.25);
            }
        }
    `;
    document.head.appendChild(responsiveStyleOverride);

    if (!checkAdminAuth()) return;
    setupMobileMenuToggle();
    setupAccordion();
    setupLivePreviewAndCounters();
    setupDateInjection();
    setupInteractiveActions();
    populateAdminName();
    setupLogoutButton();
});

// ==========================================
// 1. MOBILE RESPONSIVE HAMBURGER CONTROLLER 
// ==========================================
function setupMobileMenuToggle() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');
    
    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-visible');
        });

        // Clicking outside the sidebar automatically hides it
        document.addEventListener('click', (e) => {
            if (sidebarMenu.classList.contains('mobile-visible') && !sidebarMenu.contains(e.target) && e.target !== burgerBtn) {
                sidebarMenu.classList.remove('mobile-visible');
            }
        });
    }
}

// ==========================================
// 2. REAL-TIME INPUT PARSER & LIVE VIEWPORT
// ==========================================
function setupLivePreviewAndCounters() {
    const editorTitle = document.getElementById('editor-title');
    const editorContent = document.getElementById('editor-content');
    
    const previewTitle = document.getElementById('preview-title');
    const previewBody = document.getElementById('preview-body');
    
    const titleCounter = document.getElementById('title-counter');
    const wordCounter = document.getElementById('content-word-count');

    // Live Title Synchronization
    if (editorTitle) {
        editorTitle.addEventListener('input', (e) => {
            const currentText = e.target.value;
            
            if (titleCounter) {
                titleCounter.textContent = `${currentText.length}/100`;
            }
            
            if (previewTitle) {
                if (currentText.trim() === '') {
                    previewTitle.textContent = "Announcement Title";
                    previewTitle.classList.add('placeholder-text-italic');
                } else {
                    previewTitle.textContent = currentText;
                    previewTitle.classList.remove('placeholder-text-italic');
                }
            }
        });
    }

    // Live Content & Metrics Analyzer
    if (editorContent) {
        editorContent.addEventListener('input', (e) => {
            const currentText = e.target.value;
            
            // Calculate structural character boundaries and parse word groups
            const characterCount = currentText.length;
            const cleanedText = currentText.trim();
            const wordCount = cleanedText === '' ? 0 : cleanedText.split(/\s+/).length;
            
            if (wordCounter) {
                wordCounter.textContent = `Words: ${wordCount} | Characters: ${characterCount}`;
            }
            
            if (previewBody) {
                if (cleanedText === '') {
                    previewBody.textContent = "The content of your announcement will appear here as you type.";
                    previewBody.classList.add('placeholder-text-italic');
                } else {
                    previewBody.textContent = currentText;
                    previewBody.classList.remove('placeholder-text-italic');
                }
            }
        });
    }
}

// ==========================================
// 3. INTERACTIVE PUSH SMS, PUBLISH & DRAFT
// ==========================================
function setupInteractiveActions() {
    const pushSmsToggle = document.getElementById('push-sms-toggle');
    const infoBanner = document.getElementById('sms-info-banner');
    const bannerText = document.getElementById('banner-text');
    const bannerIcon = document.getElementById('banner-icon');
    
    const btnDraft = document.getElementById('btn-save-draft');
    const btnPublish = document.getElementById('btn-publish');
    const saveStatusBadge = document.getElementById('save-status');

    // Dynamic banner response to toggle position
    if (pushSmsToggle && infoBanner) {
        pushSmsToggle.addEventListener('change', () => {
            if (pushSmsToggle.checked) {
                infoBanner.style.backgroundColor = "#FEF3C7"; 
                infoBanner.style.borderColor = "#F59E0B";
                if (bannerIcon) {
                    bannerIcon.className = "fas fa-exclamation-triangle";
                    bannerIcon.style.color = "#D97706";
                }
                if (bannerText) {
                    bannerText.textContent = "CRITICAL ALERT MODE ENABLED: Publishing will broadcast this announcement as an immediate SMS alert to all listed citizens.";
                    bannerText.style.color = "#92400E";
                }
            } else {
                infoBanner.style.backgroundColor = "#EFF6FF"; 
                infoBanner.style.borderColor = "#BFDBFE";
                if (bannerIcon) {
                    bannerIcon.className = "fas fa-info-circle";
                    bannerIcon.style.color = "#2563EB";
                }
                if (bannerText) {
                    bannerText.textContent = "Enable \"Push as SMS Alert\" to send this announcement as an SMS notification to all registered senior citizens.";
                    bannerText.style.color = "#1E3A8A";
                }
            }
        });
    }

    // Save Draft Simulation
    if (btnDraft && saveStatusBadge) {
        btnDraft.addEventListener('click', (e) => {
            e.preventDefault();
            
            saveStatusBadge.style.display = "inline-flex";
            saveStatusBadge.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Auto-saving draft changes...`;
            
            setTimeout(() => {
                saveStatusBadge.innerHTML = `<i class="fas fa-check-circle"></i> Saved just now`;
                setTimeout(() => {
                    saveStatusBadge.style.display = "none";
                }, 3000);
            }, 1000);
        });
    }

    // Publish Action handling verification bounds
    if (btnPublish) {
        btnPublish.addEventListener('click', (e) => {
            e.preventDefault();
            
            const titleField = document.getElementById('editor-title');
            const contentField = document.getElementById('editor-content');
            const smsActive = pushSmsToggle ? pushSmsToggle.checked : false;

            const titleValue = titleField ? titleField.value.trim() : '';
            const contentValue = contentField ? contentField.value.trim() : '';

            if (!titleValue || !contentValue) {
                alert("Action Blocked: Both announcement title and layout body contents are required to execute standard publication broadcasts.");
                return;
            }

            // Display alert response depending on the toggle setting
            if (smsActive) {
                alert(`Broadcast Confirmed!\n\n1. Announcement successfully updated in portal feeds.\n2. SMS dispatch logs queued for all active recipients.`);
            } else {
                alert("Broadcast Confirmed! Announcement successfully deployed to online view portals.");
            }

            // Clean form components gracefully upon deployment
            if (titleField) titleField.value = '';
            if (contentField) contentField.value = '';
            
            // Dispatch input notifications to reset preview components to placeholder state
            if (titleField) titleField.dispatchEvent(new Event('input'));
            if (contentField) contentField.dispatchEvent(new Event('input'));
            
            if (pushSmsToggle && pushSmsToggle.checked) {
                pushSmsToggle.checked = false;
                pushSmsToggle.dispatchEvent(new Event('change'));
            }
        });
    }
}

// ==========================================
// 4. ACCORDION CANVAS CONTROLLER
// ==========================================
function setupAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', function() {
            const item = this.parentElement;
            const body = this.nextElementSibling;
            
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                body.style.display = 'none';
            } else {
                item.classList.add('active');
                body.style.display = 'block';
            }
        });
    });
}

// ==========================================
// LOGOUT Navigation
// ==========================================
function setupDateInjection() {
    const previewDate = document.getElementById('preview-date');
    if (previewDate) {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
        previewDate.textContent = now.toLocaleDateString('en-US', options);
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('barangay_admin_logged_in');
            localStorage.removeItem('barangay_admin_remembered');
            localStorage.removeItem('barangay_admin_auth');
            localStorage.removeItem('barangay_admin_user');
            window.location.href = "../auth/index.html";
        });
    }
}

function getAdminUser() {
    try {
        return JSON.parse(localStorage.getItem('barangay_admin_user') || 'null') || null;
    } catch (error) {
        console.warn('Failed to parse stored admin user', error);
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
