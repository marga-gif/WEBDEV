// FOR DEMO PURPOSES
let totalQuarterlyAllottedBudget = 1000000.00; // ₱1,000,000 baseline allotment reference

let mockPayoutBatches = [
    {
        batchId: "BATCH-2026-Q2-01",
        title: "June 2026 Social Pension",
        payoutDate: "2026-06-15",
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
    setupBatchOperations();
    setupRosterSelectionMechanics();
    setupExportersAndRedirects();

    // Initial sequence
    refreshFinancialMetrics();
    renderBatchListColumn();
    loadSelectedBatchRoster();
});

// BURGER OVERLAY
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

// METRICS LOGIC
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

// BATCH OPERATIONS
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
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size:13px;">No batches match the current filter.</div>`;
        return;
    }

    filteredBatches.forEach((item) => {
        const batch = item.batch;
        const idx = item.originalIndex;
        
        let totalBatchAmount = batch.roster.reduce((sum, rItem) => sum + rItem.amount, 0);
        let activeClass = (idx === selectedBatchIndex) ? "active" : "";
        let statusColor = batch.status === "Completed" ? "var(--text-muted)" : "var(--primary-green-bright)";

        const cardHTML = `
            <div class="batch-card ${activeClass}" onclick="window.selectActiveBatchCard(${idx})">
                <div class="batch-header-row">
                    <h4>${batch.title}</h4>
                    <span style="font-size: 11px; font-weight:700; color:${statusColor}; text-transform:uppercase;">${batch.status}</span>
                </div>
                <div class="batch-info-details-row">
                    <div>
                        <p><i class="far fa-id-card"></i> ${batch.batchId}</p>
                        <p><i class="far fa-calendar-alt"></i> ${batch.payoutDate}</p>
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
    const filterBatchesBtn = document.getElementById('btn-filter-batches');
    const filterLabel = document.getElementById('batch-filter-label');

    // Modal Specific Selectors
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modal = document.getElementById('add-batch-modal');
    const closeBtnX = document.getElementById('close-batch-modal-btn');
    const cancelBtn = document.getElementById('cancel-batch-modal-btn');
    const saveBtn = document.getElementById('save-batch-btn');

    // Open Modal
    if (newBatchBtn && modal) {
        newBatchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (modalOverlay) modalOverlay.style.display = "block";
            modal.style.display = "flex";
        });
    }

    const hideAndResetModal = () => {
        if (modalOverlay) modalOverlay.style.display = "none";
        if (modal) modal.style.display = "none";
        document.getElementById('new-batch-title').value = "";
        document.getElementById('new-batch-date').value = "";
        document.getElementById('new-batch-count').value = "";
        document.getElementById('new-batch-amount').value = "";
    };

    if (closeBtnX) closeBtnX.addEventListener('click', hideAndResetModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideAndResetModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const titleInput = document.getElementById('new-batch-title');
            const dateInput = document.getElementById('new-batch-date');
            const countInput = document.getElementById('new-batch-count');
            const amountInput = document.getElementById('new-batch-amount');

            const title = titleInput.value.trim();
            const date = dateInput.value;
            const count = parseInt(countInput.value);
            const amount = parseFloat(amountInput.value);

            // 1. Title Validation
            const textRegex = /^[A-Za-z0-9Ññ\s\-\.,'&()]+$/;
            if (!title || title.length < 5) {
                alert("Action Blocked: Batch Title must be at least 5 characters long.");
                titleInput.focus();
                return;
            }
            if (!textRegex.test(title)) {
                alert("Action Blocked: Batch Title contains invalid special characters.");
                titleInput.focus();
                return;
            }

            // 2. Date Chronology Validation
            if (!date) {
                alert("Action Blocked: Payout Date is required.");
                dateInput.focus();
                return;
            }
            const systemCurrentDateStr = new Date().toISOString().split('T')[0]; 
            if (date < systemCurrentDateStr) {
                alert("Action Blocked: Cannot schedule a new upcoming payout batch in the past.");
                dateInput.focus();
                return;
            }

            // 3. Beneficiary Data Logic Validation
            if (!count || isNaN(count) || count < 1 || count > 10000) {
                alert("Action Blocked: Please enter a valid number of beneficiaries (between 1 and 10,000).");
                countInput.focus();
                return;
            }

            if (!amount || isNaN(amount) || amount <= 0) {
                alert("Action Blocked: Please enter a valid total allocated amount greater than zero.");
                amountInput.focus();
                return;
            }

            // Data Population Engine
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
            hideAndResetModal();
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

// ROSTER CHECKBOX CONTROLS
function loadSelectedBatchRoster(searchString = "") {
    const tbody = document.getElementById('roster-table-body');
    const titleEl = document.getElementById('selected-batch-title');
    const badgeStatus = document.getElementById('selected-batch-status');
    const exportBtn = document.getElementById('btn-export-batch');

    const metaDate = document.getElementById('meta-date');
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
    if (metaAmount) metaAmount.textContent = "₱" + totalAmount.toLocaleString();
    if (metaCount) metaCount.textContent = currentBatch.roster.length;

    tbody.innerHTML = '';
    let matchCount = 0;

    // Filter array securely using original global index mapping
    currentBatch.roster.forEach((item, originalIndex) => {
        if (searchString && !item.name.toLowerCase().includes(searchString) && !item.seniorId.toLowerCase().includes(searchString)) {
            return; // Skip if no match
        }
        matchCount++;

        let badgeClass = item.status === "Disbursed" ? "badge completed" : (item.status === "Approved" ? "badge processing" : "badge pending");
        
        // Checkboxes bind exclusively to original index position for bulletproof Marking
        let checkboxMarkup = item.status === "Disbursed" ? 
            `<input type="checkbox" disabled style="opacity:0.4;">` : 
            `<input type="checkbox" class="roster-item-checkbox" data-index="${originalIndex}">`;

        const rowHTML = `
            <tr>
                <td>${checkboxMarkup}</td>
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

    if (markPaidBtn) {
        markPaidBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const checkedBoxes = document.querySelectorAll('.roster-item-checkbox:checked');
            
            if (checkedBoxes.length === 0) {
                alert("Action Blocked: Please check one or more beneficiary row entries to authorize cash disbursements.");
                return;
            }

            if (!confirm(`Authorize structural pension disbursements for ${checkedBoxes.length} selected beneficiaries?`)) return;

            const currentBatch = mockPayoutBatches[selectedBatchIndex];
            
            // Loop updates relying securely on the mapped data-index
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
        });
    }
}

// EXPORTS
function setupExportersAndRedirects() {
    const globalReportBtn = document.getElementById('btn-generate-global-report');
    const batchExportBtn = document.getElementById('btn-export-batch');
    const logoutBtn = document.getElementById('logout-btn');

    if (globalReportBtn) {
        globalReportBtn.addEventListener('click', () => {
            let csvData = ["Batch ID,Batch Title,Senior ID,Name,Purok,Amount,Status,Payout Date"];
            
            mockPayoutBatches.forEach(b => {
                b.roster.forEach(c => {
                    csvData.push(`${b.batchId},"${b.title}",${c.seniorId},"${c.name}",${c.purok},${c.amount},"${c.status}",${b.payoutDate}`);
                });
            });

            triggerCSVBlobDownload(csvData.join("\n"), "Brgy_Global_Financial_Pension_Report.csv");
        });
    }

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