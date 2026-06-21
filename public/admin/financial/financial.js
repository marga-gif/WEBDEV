// FOR DEMO PURPOSES
let totalQuarterlyAllottedBudget = 1000000.00; // ₱1,000,000 baseline allotment reference

// REVISION: Added payoutTime to mock data structure
let mockPayoutBatches = [
    {
        batchId: "BATCH-2026-Q2-01",
        title: "June 2026 Social Pension",
        payoutDate: "2026-06-15",
        payoutTime: "09:00",
        status: "Upcoming",
        roster: [
            { seniorId: "SC-2026-0841", name: "JUAN DELA CRUZ", amount: 3000, purok: "Purok 1", status: "Approved" },
            { seniorId: "SC-2026-1102", name: "ELENA SANTOS", amount: 3000, purok: "Purok 3", status: "Approved" },
            { seniorId: "SC-2026-0522", name: "TOMAS AQUINO", amount: 3000, purok: "Purok 2", status: "Pending Review" }
        ]
    },
    {
        batchId: "BATCH-2026-Q2-02",
        title: "May 2026 Backlog Payout",
        payoutDate: "2026-05-20",
        payoutTime: "13:30",
        status: "Completed",
        roster: [
            { seniorId: "SC-2026-0915", name: "CLARA REYES", amount: 3000, purok: "Purok 4", status: "Disbursed" },
            { seniorId: "SC-2026-0344", name: "PEDRO ALMANZOR", amount: 3000, purok: "Purok 1", status: "Disbursed" }
        ]
    }
];

let selectedBatchIndex = 0; 
let currentBatchFilter = "All"; 

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenuBurger();
    setupRealTimeValidation();
    setupBatchOperations();
    setupRosterSelectionMechanics();
    setupExportersAndRedirects();

    refreshFinancialMetrics();
    renderBatchListColumn();
    loadSelectedBatchRoster();
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

// Format 24hr time to 12hr string
function format12HourTime(timeStr) {
    if(!timeStr) return "TBA";
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// REVISION: Advanced UI/UX Form Validation Handlers (Adds Icons & trims)
function triggerFieldError(inputId, msgId, customMsg = null) {
    const inputEl = document.getElementById(inputId);
    const msgEl = document.getElementById(msgId);
    if(inputEl) inputEl.classList.add('input-error');
    if(msgEl) {
        const textToDisplay = customMsg || msgEl.innerText.replace(/<[^>]*>?/gm, '');
        msgEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${textToDisplay}`;
        msgEl.classList.add('show');
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.classList.remove('show'));
}

function setupRealTimeValidation() {
    const inputs = document.querySelectorAll('.val-input');
    inputs.forEach(input => {
        // Clear visually on input
        input.addEventListener('input', (e) => {
            e.target.classList.remove('input-error');
            const msgObj = document.getElementById(`msg-${e.target.id.replace('new-', '')}`);
            if (msgObj) msgObj.classList.remove('show');
        });

        // Whitespace Trimming on Blur
        input.addEventListener('blur', (e) => {
            e.target.value = e.target.value.trim();
        });
    });
}

function refreshFinancialMetrics() {
    let globalDisbursed = 0;
    let upcomingPayoutDate = "-- / -- / ----";
    let upcomingBatchIdText = "Waiting for batch data...";

    mockPayoutBatches.forEach(batch => {
        batch.roster.forEach(citizen => {
            if (citizen.status === "Disbursed") {
                globalDisbursed += citizen.amount;
            }
        });
        
        if (batch.status === "Upcoming") {
            upcomingPayoutDate = batch.payoutDate;
            upcomingBatchIdText = `Active Batch: ${batch.batchId}`;
        }
    });

    let remainingBudget = totalQuarterlyAllottedBudget - globalDisbursed;

    const disbursedEl = document.getElementById('metric-disbursed');
    const budgetEl = document.getElementById('metric-budget');
    const payoutDateEl = document.getElementById('metric-next-payout');
    const batchIdEl = document.getElementById('metric-next-batch-id');

    if (disbursedEl) disbursedEl.textContent = "₱" + globalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (budgetEl) budgetEl.textContent = "₱" + remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (payoutDateEl) payoutDateEl.textContent = upcomingPayoutDate;
    if (batchIdEl) batchIdEl.textContent = upcomingBatchIdText;
}

function renderBatchListColumn() {
    const container = document.getElementById('batch-list-container');
    if (!container) return;

    container.innerHTML = '';

    const filteredBatches = mockPayoutBatches.map((batch, index) => ({ batch, originalIndex: index }))
        .filter(item => {
            if (currentBatchFilter === "All") return true;
            return item.batch.status.toLowerCase() === currentBatchFilter.toLowerCase();
        });

    if (filteredBatches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-muted); font-size:13px;"><i class="fas fa-folder-open fa-2x" style="display:block; opacity:0.3; margin-bottom:8px;"></i> No batches match the current filter.</div>`;
        return;
    }

    filteredBatches.forEach((item) => {
        const batch = item.batch;
        const idx = item.originalIndex;
        
        let totalBatchAmount = batch.roster.reduce((sum, rItem) => sum + rItem.amount, 0);
        let activeClass = (idx === selectedBatchIndex) ? "active" : "";
        let statusColor = batch.status === "Completed" ? "var(--text-muted)" : "var(--primary-green-bright)";
        let formattedTime = format12HourTime(batch.payoutTime);

        const cardHTML = `
            <div class="batch-card ${activeClass}" onclick="window.selectActiveBatchCard(${idx})">
                <div class="batch-header-row">
                    <h4>${batch.title}</h4>
                    <span style="font-size: 11px; font-weight:700; color:${statusColor}; text-transform:uppercase;">${batch.status}</span>
                </div>
                <div class="batch-info-details-row">
                    <div>
                        <p><i class="far fa-id-card"></i> ${batch.batchId}</p>
                        <p><i class="far fa-calendar-alt"></i> ${batch.payoutDate} ${batch.payoutTime ? 'at ' + formattedTime : ''}</p>
                    </div>
                    <div class="batch-amount-display-block">
                        <p>Total Cost</p>
                        <strong>₱${totalBatchAmount.toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

window.selectActiveBatchCard = function(index) {
    selectedBatchIndex = index;
    renderBatchListColumn();
    loadSelectedBatchRoster();
    const masterCheck = document.getElementById('header-master-checkbox');
    if(masterCheck) masterCheck.checked = false;
};

function setupBatchOperations() {
    const newBatchBtn = document.getElementById('btn-add-new-batch');
    const newBatchBtnMobile = document.getElementById('btn-add-new-batch-mobile');
    const filterBatchesBtn = document.getElementById('btn-filter-batches');
    const filterLabel = document.getElementById('batch-filter-label');

    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modal = document.getElementById('add-batch-modal');
    const closeBtnX = document.getElementById('close-batch-modal-btn');
    const cancelBtn = document.getElementById('cancel-batch-modal-btn');
    const saveBtn = document.getElementById('save-batch-btn');
    const saveBtnText = document.getElementById('save-batch-text');

    const openModalFlow = (e) => {
        e.preventDefault();
        clearFieldErrors();
        if (modalOverlay) modalOverlay.style.display = "block";
        if (modal) modal.style.display = "flex";
    };

    if (newBatchBtn) newBatchBtn.addEventListener('click', openModalFlow);
    if (newBatchBtnMobile) newBatchBtnMobile.addEventListener('click', openModalFlow);

    const hideAndResetModal = () => {
        if (modalOverlay) modalOverlay.style.display = "none";
        if (modal) modal.style.display = "none";
        clearFieldErrors();
        document.getElementById('new-batch-title').value = "";
        document.getElementById('new-batch-date').value = "";
        document.getElementById('new-batch-time').value = "";
        document.getElementById('new-batch-count').value = "";
        document.getElementById('new-batch-amount').value = "";
    };

    if (closeBtnX) closeBtnX.addEventListener('click', hideAndResetModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideAndResetModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFieldErrors();
            let isFormValid = true;
            
            const titleInput = document.getElementById('new-batch-title');
            const dateInput = document.getElementById('new-batch-date');
            const timeInput = document.getElementById('new-batch-time');
            const countInput = document.getElementById('new-batch-count');
            const amountInput = document.getElementById('new-batch-amount');

            const title = titleInput.value.trim();
            const date = dateInput.value;
            const time = timeInput.value;
            const count = parseInt(countInput.value);
            const amount = parseFloat(amountInput.value);

            // Calculate active budget constraints
            let globalDisbursed = 0;
            mockPayoutBatches.forEach(b => b.roster.forEach(c => { if(c.status === "Disbursed") globalDisbursed += c.amount; }));
            let currentRemainingBudget = totalQuarterlyAllottedBudget - globalDisbursed;

            // REVISION: Applied robust UI validation rules
            const textRegex = /^[A-Za-z0-9Ññ\s\-\.,'&()]+$/;
            
            if (!title || title.length < 5) {
                triggerFieldError('new-batch-title', 'msg-batch-title', "Batch Title must be at least 5 characters.");
                isFormValid = false;
            } else if (!textRegex.test(title)) {
                triggerFieldError('new-batch-title', 'msg-batch-title', "Invalid special characters detected.");
                isFormValid = false;
            }

            if (!date) {
                triggerFieldError('new-batch-date', 'msg-batch-date', "Payout Date is required.");
                isFormValid = false;
            } else {
                const systemCurrentDateStr = new Date().toISOString().split('T')[0]; 
                if (date < systemCurrentDateStr) {
                    triggerFieldError('new-batch-date', 'msg-batch-date', "Cannot schedule a new upcoming payout in the past.");
                    isFormValid = false;
                }
            }

            if (!time) {
                triggerFieldError('new-batch-time', 'msg-batch-time', "Time is required.");
                isFormValid = false;
            }

            if (!count || isNaN(count) || count < 1 || count > 10000) {
                triggerFieldError('new-batch-count', 'msg-batch-count', "Must be a number between 1 and 10,000.");
                isFormValid = false;
            }

            // REVISION: Limit Validation against Remaining Budget
            if (!amount || isNaN(amount) || amount <= 0) {
                triggerFieldError('new-batch-amount', 'msg-batch-amount', "Requires a valid amount.");
                isFormValid = false;
            } else if (amount > currentRemainingBudget) {
                triggerFieldError('new-batch-amount', 'msg-batch-amount', `Exceeds remaining budget of ₱${currentRemainingBudget.toLocaleString('en-US', {minimumFractionDigits: 2})}.`);
                isFormValid = false;
            }

            if (!isFormValid) return; // Block execution and display red borders

            // Process saving animation / Double Submit Locking
            const originalText = saveBtnText.innerText;
            saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
            saveBtn.disabled = true;

            setTimeout(() => {
                const amountPerPerson = amount / count;
                const dynamicRoster = [];
                for(let i = 0; i < count; i++) {
                    dynamicRoster.push({
                        seniorId: "SC-2026-" + Math.floor(1000 + Math.random() * 9000),
                        name: "NEW BENEFICIARY " + (i + 1),
                        amount: amountPerPerson,
                        purok: "Purok " + (Math.floor(Math.random() * 5) + 1),
                        status: "Approved"
                    });
                }

                const newBatchObj = {
                    batchId: "BATCH-2026-M-" + Math.floor(100 + Math.random() * 900),
                    title: title.toUpperCase(),
                    payoutDate: date,
                    payoutTime: time,
                    status: "Upcoming",
                    roster: dynamicRoster
                };

                mockPayoutBatches.unshift(newBatchObj);
                selectedBatchIndex = 0;
                currentBatchFilter = "All"; 
                if (filterLabel) filterLabel.textContent = currentBatchFilter;
                
                refreshFinancialMetrics();
                renderBatchListColumn();
                loadSelectedBatchRoster();
                
                saveBtnText.innerHTML = "Batch Created";
                setTimeout(() => {
                    saveBtnText.innerHTML = originalText;
                    saveBtn.disabled = false;
                    hideAndResetModal();
                }, 800);

            }, 800);
        });
    }

    if (filterBatchesBtn) {
        filterBatchesBtn.addEventListener('click', () => {
            if (currentBatchFilter === "All") currentBatchFilter = "Upcoming";
            else if (currentBatchFilter === "Upcoming") currentBatchFilter = "Completed";
            else currentBatchFilter = "All";
            
            if (filterLabel) filterLabel.textContent = currentBatchFilter;
            renderBatchListColumn();
        });
    }
}

function loadSelectedBatchRoster(searchString = "") {
    const tbody = document.getElementById('roster-table-body');
    const titleEl = document.getElementById('selected-batch-title');
    const badgeStatus = document.getElementById('selected-batch-status');
    const exportBtn = document.getElementById('btn-export-batch');

    const metaDate = document.getElementById('meta-date');
    const metaTime = document.getElementById('meta-time');
    const metaAmount = document.getElementById('meta-amount');
    const metaCount = document.getElementById('meta-count');

    if (!tbody) return;

    const currentBatch = mockPayoutBatches[selectedBatchIndex];
    if (!currentBatch) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No batches configured.</td></tr>`;
        if (exportBtn) exportBtn.disabled = true;
        return;
    }

    if (titleEl) titleEl.textContent = currentBatch.title;
    if (badgeStatus) {
        badgeStatus.textContent = currentBatch.status;
        badgeStatus.style.display = "inline-block";
        badgeStatus.className = `badge ${currentBatch.status === 'Completed' ? 'completed' : 'processing'}`;
    }
    if (exportBtn) exportBtn.disabled = false;

    let totalAmount = currentBatch.roster.reduce((sum, item) => sum + item.amount, 0);
    if (metaDate) metaDate.textContent = currentBatch.payoutDate;
    if (metaTime) metaTime.textContent = format12HourTime(currentBatch.payoutTime);
    if (metaAmount) metaAmount.textContent = "₱" + totalAmount.toLocaleString();
    if (metaCount) metaCount.textContent = currentBatch.roster.length;

    tbody.innerHTML = '';
    let matchCount = 0;

    currentBatch.roster.forEach((item, originalIndex) => {
        if (searchString && !item.name.toLowerCase().includes(searchString) && !item.seniorId.toLowerCase().includes(searchString)) {
            return; 
        }
        matchCount++;

        let badgeClass = item.status === "Disbursed" ? "badge completed" : (item.status === "Approved" ? "badge processing" : "badge pending");
        
        // REVISION: Applied custom-checkbox class to prevent white box distortion
        let checkboxMarkup = item.status === "Disbursed" ? 
            `<input type="checkbox" class="custom-checkbox" disabled style="opacity:0.4; cursor: not-allowed;">` : 
            `<input type="checkbox" class="roster-item-checkbox custom-checkbox" data-index="${originalIndex}">`;

        const rowHTML = `
            <tr>
                <td style="text-align: center;">${checkboxMarkup}</td>
                <td><strong>${item.seniorId}</strong></td>
                <td>${item.name}</td>
                <td>${item.purok}</td>
                <td>₱${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td><span class="${badgeClass}">${item.status}</span></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', rowHTML);
    });

    if (matchCount === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No records matched your search parameters.</td></tr>`;
    }
}

function setupRosterSelectionMechanics() {
    const searchInput = document.getElementById('search-citizen-in-batch');
    const masterCheckbox = document.getElementById('header-master-checkbox');
    const selectAllBtn = document.getElementById('btn-select-all-toggle');
    const markPaidBtn = document.getElementById('btn-mark-as-paid-action');
    
    // Modal Selectors
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const confirmModal = document.getElementById('mark-paid-confirm-modal');
    const confirmMsg = document.getElementById('mark-paid-modal-msg');
    const cancelModalBtn = document.getElementById('cancel-confirm-modal-btn');
    const closeXBtn = document.getElementById('close-confirm-modal-btn');
    const executePaidBtn = document.getElementById('execute-mark-paid-btn');
    const rosterActionMsg = document.getElementById('roster-action-msg');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadSelectedBatchRoster(e.target.value.toLowerCase().trim());
        });
    }

    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', (e) => {
            const rowCheckboxes = document.querySelectorAll('.roster-item-checkbox');
            rowCheckboxes.forEach(cb => {
                if(!cb.disabled) cb.checked = e.target.checked;
            });
        });
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const rowCheckboxes = document.querySelectorAll('.roster-item-checkbox');
            let totalAvailableToCheck = 0;
            let currentCheckedCount = 0;

            rowCheckboxes.forEach(cb => {
                if (!cb.disabled) {
                    totalAvailableToCheck++;
                    if(cb.checked) currentCheckedCount++;
                }
            });

            let targetState = (currentCheckedCount !== totalAvailableToCheck);
            rowCheckboxes.forEach(cb => { if(!cb.disabled) cb.checked = targetState; });
            if(masterCheckbox) masterCheckbox.checked = targetState;
        });
    }

    // Modal Control Functions
    const hideConfirmModal = () => {
        if(modalOverlay) modalOverlay.style.display = 'none';
        if(confirmModal) confirmModal.style.display = 'none';
    };

    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideConfirmModal);
    if (closeXBtn) closeXBtn.addEventListener('click', hideConfirmModal);

    // REVISION: Trigger Modal Instead of Alert/Confirm
    if (markPaidBtn) {
        markPaidBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const checkedBoxes = document.querySelectorAll('.roster-item-checkbox:checked');
            
            if (checkedBoxes.length === 0) {
                // Show inline error feedback instead of Alert
                if(rosterActionMsg) {
                    rosterActionMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Select beneficiaries first.`;
                    rosterActionMsg.classList.add('show');
                    setTimeout(() => rosterActionMsg.classList.remove('show'), 3000);
                }
                return;
            }

            if (confirmMsg) {
                confirmMsg.innerHTML = `Authorize structural pension disbursements for <strong>${checkedBoxes.length}</strong> selected beneficiaries?`;
            }
            
            if (modalOverlay) modalOverlay.style.display = 'block';
            if (confirmModal) confirmModal.style.display = 'flex';
        });
    }

    // Execute Confirmation / Double Submit Locking
    if (executePaidBtn) {
        executePaidBtn.addEventListener('click', () => {
            const originalHTML = executePaidBtn.innerHTML;
            executePaidBtn.disabled = true;
            executePaidBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                const checkedBoxes = document.querySelectorAll('.roster-item-checkbox:checked');
                const currentBatch = mockPayoutBatches[selectedBatchIndex];
                
                checkedBoxes.forEach(cb => {
                    let indexInBatchRoster = parseInt(cb.getAttribute('data-index'));
                    if (currentBatch && currentBatch.roster[indexInBatchRoster]) {
                        currentBatch.roster[indexInBatchRoster].status = "Disbursed";
                    }
                });

                let pendingItemsLeft = currentBatch.roster.some(c => c.status !== "Disbursed");
                if (!pendingItemsLeft) {
                    currentBatch.status = "Completed";
                }

                if(masterCheckbox) masterCheckbox.checked = false;
                
                refreshFinancialMetrics();
                renderBatchListColumn();
                loadSelectedBatchRoster();

                executePaidBtn.disabled = false;
                executePaidBtn.innerHTML = originalHTML;
                hideConfirmModal();
            }, 800);
        });
    }
}

function setupExportersAndRedirects() {
    const globalReportBtn = document.getElementById('btn-generate-global-report');
    const globalReportBtnMobile = document.getElementById('btn-generate-global-report-mobile');
    const batchExportBtn = document.getElementById('btn-export-batch');
    const logoutBtn = document.getElementById('logout-btn');

    const triggerGlobalExport = () => {
        let csvData = ["Batch ID,Batch Title,Senior ID,Name,Purok,Amount,Status,Payout Date"];
        
        mockPayoutBatches.forEach(b => {
            b.roster.forEach(c => {
                csvData.push(`${b.batchId},"${b.title}",${c.seniorId},"${c.name}",${c.purok},${c.amount},"${c.status}",${b.payoutDate}`);
            });
        });

        triggerCSVBlobDownload(csvData.join("\n"), "Brgy_Global_Financial_Pension_Report.csv");
    };

    if (globalReportBtn) globalReportBtn.addEventListener('click', triggerGlobalExport);
    if (globalReportBtnMobile) globalReportBtnMobile.addEventListener('click', triggerGlobalExport);

    if (batchExportBtn) {
        batchExportBtn.addEventListener('click', () => {
            const currentBatch = mockPayoutBatches[selectedBatchIndex];
            if(!currentBatch) return;

            let csvData = ["Senior ID,Beneficiary Name,Purok Area,Monthly Amount,Disbursement Status"];
            currentBatch.roster.forEach(c => {
                csvData.push(`${c.seniorId},"${c.name}",${c.purok},${c.amount},"${c.status}"`);
            });

            triggerCSVBlobDownload(csvData.join("\n"), `Roster_Export_${currentBatch.batchId}.csv`);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = "../auth/index.html";
        });
    }
}

function triggerCSVBlobDownload(csvContentString, filename) {
    const blob = new Blob([csvContentString], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const temporaryAnchorNode = document.createElement("a");
    
    temporaryAnchorNode.setAttribute("href", downloadUrl);
    temporaryAnchorNode.setAttribute("download", filename);
    document.body.appendChild(temporaryAnchorNode);
    
    temporaryAnchorNode.click();
    document.body.removeChild(temporaryAnchorNode);
    URL.revokeObjectURL(downloadUrl);
}