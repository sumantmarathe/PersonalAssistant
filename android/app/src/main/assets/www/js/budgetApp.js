/**
 * BudgetApp - Sub-Application Controller for Budget & Expense Planner
 * Implements Consumer-Grade "Sign in with Google" with Seamless Background Cloud Sync
 */
class BudgetApp {
  constructor() {
    this.storage = window.storageService;
    this.driveService = window.googleDriveService;
    this.transactions = [];
    this.filterType = 'all';
    this.searchQuery = '';
    this.activeFormType = 'expense';
    this.parsedStatementTransactions = [];
    this.statementSortField = null;
    this.statementSortAsc = true;

    // Multi-Account & Analytics State
    this.accounts = [];
    this.activeAccountId = 'all';
    this.activeTab = 'tab-ledger';
    this.statsDateRange = 'all';
    this.statsStartDate = null;
    this.statsEndDate = null;

    this.categories = {
      expense: [
        'Food & Dining',
        'Rent & Housing',
        'Utilities',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Healthcare',
        'Education',
        'Other Expense'
      ],
      income: [
        'Salary',
        'Freelance / Consulting',
        'Investments & Dividends',
        'Rental Income',
        'Gift / Bonus',
        'Other Income'
      ]
    };
  }

  async init() {
    await this.storage.init();
    
    if (this.driveService) {
      await this.driveService.init();
      
      this.driveService.onAuthChange(async (isSignedIn, user) => {
        this.updateAuthUI(isSignedIn, user);
        if (isSignedIn) {
          await this.syncFromCloudOnLogin();
        }
      });

      this.driveService.onSyncStatusChange((status) => {
        this.updateSyncBadge(status);
      });

      // Initialize UI with any cached user
      const cachedUser = this.driveService.getUser();
      if (cachedUser) {
        this.updateAuthUI(true, cachedUser);
      }
    }

    this.bindEvents();
    this.populateCategoryOptions();
    this.setDefaultDate();
    await this.loadAccounts();
    await this.loadAndRender();
  }

  bindEvents() {
    // Type Toggle Buttons (Expense vs Income)
    const typeButtons = document.querySelectorAll('.type-toggle-btn');
    typeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.setActiveFormType(type);
      });
    });

    // Form Submission
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Filter Buttons (All, Income, Expense)
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterType = btn.dataset.filter;
        this.renderLedger();
      });
    });

    // Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderLedger();
      });
    }

    // Google Sign-In & Sign-Out
    const btnSignIn = document.getElementById('btn-google-signin');
    if (btnSignIn) {
      btnSignIn.addEventListener('click', () => this.handleGoogleSignIn());
    }

    const btnSignOut = document.getElementById('btn-signout');
    if (btnSignOut) {
      btnSignOut.addEventListener('click', () => this.handleGoogleSignOut());
    }

    // Manual Local Backup (Optional Power-User features)
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportBackup());
    }

    const importBtn = document.getElementById('btn-import-trigger');
    const importFileInput = document.getElementById('import-file-input');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => this.handleImportBackup(e));
    }

    // Tab Navigation Buttons
    const tabBtns = document.querySelectorAll('.app-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Global Account Filter Dropdown
    const globalAccountFilter = document.getElementById('global-account-filter');
    if (globalAccountFilter) {
      globalAccountFilter.addEventListener('change', (e) => {
        this.activeAccountId = e.target.value;
        this.renderSummaryMetrics();
        this.renderLedger();
        if (this.activeTab === 'tab-stats') {
          this.renderStatsView();
        }
      });
    }

    // Stats Date Range Preset Buttons
    const statsPresetBtns = document.querySelectorAll('.stats-preset-btn');
    statsPresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        statsPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.statsDateRange = btn.dataset.range;
        const customPicker = document.getElementById('stats-custom-dates-picker');
        if (customPicker) {
          customPicker.style.display = this.statsDateRange === 'custom' ? 'block' : 'none';
        }
        if (this.statsDateRange !== 'custom') {
          this.renderStatsView();
        }
      });
    });

    // Custom Date Range Apply Button
    const btnApplyCustom = document.getElementById('btn-apply-custom-stats');
    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        const from = document.getElementById('stats-date-from').value;
        const to = document.getElementById('stats-date-to').value;
        if (from && to && from > to) {
          this.showToast('From date cannot be after To date', 'error');
          return;
        }
        this.statsStartDate = from || null;
        this.statsEndDate = to || null;
        this.renderStatsView();
      });
    }

    // Bank Account Modal Controls
    const btnOpenAddAccount = document.getElementById('btn-open-add-account');
    if (btnOpenAddAccount) {
      btnOpenAddAccount.addEventListener('click', () => this.openAccountModal());
    }

    const btnCloseAccModal = document.getElementById('btn-close-account-modal');
    const btnCancelAcc = document.getElementById('btn-cancel-account');
    if (btnCloseAccModal) btnCloseAccModal.addEventListener('click', () => this.closeAccountModal());
    if (btnCancelAcc) btnCancelAcc.addEventListener('click', () => this.closeAccountModal());

    const bankSelect = document.getElementById('acc-bank-select');
    const customBankGroup = document.getElementById('acc-custom-bank-group');
    if (bankSelect && customBankGroup) {
      bankSelect.addEventListener('change', (e) => {
        customBankGroup.style.display = e.target.value === 'Other' ? 'block' : 'none';
      });
    }

    const accountForm = document.getElementById('account-form');
    if (accountForm) {
      accountForm.addEventListener('submit', (e) => this.handleSaveAccount(e));
    }

    this.initStatementImporter();
  }

  initStatementImporter() {
    const btnTrigger = document.getElementById('btn-import-statement');
    const modal = document.getElementById('modal-import-statement');
    const btnClose = document.getElementById('btn-close-statement-modal');
    const btnCancel = document.getElementById('btn-cancel-statement');
    const uploadZone = document.getElementById('statement-upload-zone');
    const fileInput = document.getElementById('statement-file-input');
    const masterCheck = document.getElementById('stmt-check-master');
    const btnSelectAll = document.getElementById('btn-select-all-stmt');
    const btnDeselectAll = document.getElementById('btn-deselect-all-stmt');
    const btnCommit = document.getElementById('btn-commit-statement');

    if (!btnTrigger || !modal) return;

    const openModal = () => {
      this.resetStatementModal();
      modal.style.display = 'flex';
    };

    const closeModal = () => {
      modal.style.display = 'none';
      this.resetStatementModal();
    };

    btnTrigger.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Click on dropzone opens file dialog
    if (uploadZone && fileInput) {
      uploadZone.addEventListener('click', () => fileInput.click());

      // Drag and drop handlers
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });

      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
      });

      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleStatementFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleStatementFile(e.target.files[0]);
        }
      });
    }

    // Master checkbox toggle
    if (masterCheck) {
      masterCheck.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        this.parsedStatementTransactions.forEach((t) => (t.selected = isChecked));
        const rowChecks = document.querySelectorAll('.stmt-row-check');
        rowChecks.forEach((cb) => (cb.checked = isChecked));
        this.updateStatementSummary();
      });
    }

    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        this.parsedStatementTransactions.forEach((t) => (t.selected = true));
        if (masterCheck) masterCheck.checked = true;
        document.querySelectorAll('.stmt-row-check').forEach((cb) => (cb.checked = true));
        this.updateStatementSummary();
      });
    }

    if (btnDeselectAll) {
      btnDeselectAll.addEventListener('click', () => {
        this.parsedStatementTransactions.forEach((t) => (t.selected = false));
        if (masterCheck) masterCheck.checked = false;
        document.querySelectorAll('.stmt-row-check').forEach((cb) => (cb.checked = false));
        this.updateStatementSummary();
      });
    }

    if (btnCommit) {
      btnCommit.addEventListener('click', () => this.commitStatementImport());
    }

    // Header click and keyboard navigation for multi-field sorting
    const sortHeaders = modal.querySelectorAll('.sortable-th');
    sortHeaders.forEach((th) => {
      const triggerSort = () => {
        const field = th.dataset.sort;
        if (field) this.handleStatementSort(field);
      };
      th.addEventListener('click', triggerSort);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerSort();
        }
      });
    });
  }

  resetStatementModal() {
    this.parsedStatementTransactions = [];
    this.statementSortField = null;
    this.statementSortAsc = true;
    this.updateStatementSortUI();
    const uploadZone = document.getElementById('statement-upload-zone');
    const loadingSection = document.getElementById('statement-loading');
    const reviewSection = document.getElementById('statement-review-section');
    const fileInput = document.getElementById('statement-file-input');
    const btnCommit = document.getElementById('btn-commit-statement');

    if (uploadZone) uploadZone.style.display = 'block';
    if (loadingSection) loadingSection.style.display = 'none';
    if (reviewSection) reviewSection.style.display = 'none';
    if (fileInput) fileInput.value = '';
    const detectBadge = document.getElementById('stmt-detected-account-badge');
    if (detectBadge) detectBadge.style.display = 'none';
    const targetAccSelect = document.getElementById('stmt-account-target');
    if (targetAccSelect) targetAccSelect.value = '';
    if (btnCommit) {
      btnCommit.disabled = true;
      btnCommit.innerHTML = '<span>📥 Import Selected Entries</span>';
    }
  }

  async handleStatementFile(file) {
    if (!file) return;

    const uploadZone = document.getElementById('statement-upload-zone');
    const loadingSection = document.getElementById('statement-loading');
    const loadingText = document.getElementById('statement-loading-text');

    if (uploadZone) uploadZone.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'block';
    if (loadingText) loadingText.textContent = `Analyzing ${file.name} locally...`;

    try {
      let rawTransactions = [];
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        rawTransactions = await window.statementParser.parsePDF(arrayBuffer);
      } else {
        const text = await file.text();
        rawTransactions = window.statementParser.parseCSV(text);
      }

      if (!rawTransactions || rawTransactions.length === 0) {
        this.showToast('No valid transactions found in the statement. Please check file format.', 'error');
        this.resetStatementModal();
        return;
      }

      // Check duplicates against active ledger
      this.parsedStatementTransactions = window.statementParser.flagDuplicates(rawTransactions, this.transactions);
      this.statementSortField = null;
      this.statementSortAsc = true;

      // Auto-detect matching registered bank account if available
      const meta = rawTransactions.metadata;
      const targetAccSelect = document.getElementById('stmt-account-target');
      const detectBadge = document.getElementById('stmt-detected-account-badge');
      if (meta && this.accounts && this.accounts.length > 0) {
        let matched = null;
        if (meta.accountNumber) {
          const cleanMetaNum = String(meta.accountNumber).replace(/[^0-9]/g, '');
          matched = this.accounts.find(a => {
            const cleanAcc = (a.accountNumber || '').replace(/[^0-9]/g, '');
            return (cleanMetaNum && cleanAcc && (cleanAcc.includes(cleanMetaNum) || cleanMetaNum.includes(cleanAcc) || cleanAcc.endsWith(cleanMetaNum.slice(-4))));
          });
        }
        if (!matched && meta.ifscCode) {
          matched = this.accounts.find(a => (a.ifscCode || '').toUpperCase() === meta.ifscCode.toUpperCase());
        }
        if (!matched && meta.detectedBank) {
          matched = this.accounts.find(a => (a.bankName || '').toLowerCase().includes(meta.detectedBank.toLowerCase()));
        }
        if (matched && targetAccSelect) {
          targetAccSelect.value = matched.id;
          if (detectBadge) {
            detectBadge.textContent = `✨ Auto-detected: ${matched.bankName} (${this.maskAccountNumber(matched.accountNumber)})`;
            detectBadge.style.display = 'inline-block';
          }
        }
      }

      this.renderStatementPreview();
    } catch (err) {
      console.error('Statement parsing failed:', err);
      this.showToast('Error reading bank statement: ' + (err.message || 'Corrupt or unreadable file'), 'error');
      this.resetStatementModal();
    }
  }

  renderStatementPreview() {
    const loadingSection = document.getElementById('statement-loading');
    const reviewSection = document.getElementById('statement-review-section');
    const tbody = document.getElementById('statement-preview-tbody');
    const btnCommit = document.getElementById('btn-commit-statement');

    if (loadingSection) loadingSection.style.display = 'none';
    if (reviewSection) reviewSection.style.display = 'block';
    if (btnCommit) btnCommit.disabled = false;

    if (!tbody) return;
    tbody.innerHTML = '';

    const allCategories = [
      ...this.categories.expense,
      ...this.categories.income,
      'General'
    ];
    const uniqueCategories = Array.from(new Set(allCategories));

    this.parsedStatementTransactions.forEach((tx, idx) => {
      const tr = document.createElement('tr');
      if (tx.isDuplicate) {
        tr.className = 'is-duplicate';
      }

      const dupBadge = tx.isDuplicate ? '<span class="badge-duplicate">⚠️ Duplicate</span>' : '';
      const typeClass = tx.type === 'income' ? 'income' : 'expense';

      tr.innerHTML = `
        <td><input type="checkbox" class="stmt-row-check" data-idx="${idx}" ${tx.selected ? 'checked' : ''}></td>
        <td><code>${tx.date}</code></td>
        <td>
          <div style="font-weight: 500;">${this.escapeHtml(tx.description)}</div>
          ${dupBadge}
        </td>
        <td>
          <span class="table-type-badge ${typeClass}">${tx.type}</span>
        </td>
        <td>
          <select class="table-select-cat" data-idx="${idx}">
            ${uniqueCategories.map((cat) => `<option value="${cat}" ${cat.toLowerCase() === (tx.category || '').toLowerCase() ? 'selected' : ''}>${cat}</option>`).join('')}
          </select>
        </td>
        <td style="text-align: right; font-weight: 600; color: ${tx.type === 'income' ? 'var(--accent-green)' : 'var(--text-primary)'};">
          ${tx.type === 'income' ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Wire row checkbox listeners
    tbody.querySelectorAll('.stmt-row-check').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.parsedStatementTransactions[idx].selected = e.target.checked;
        this.updateStatementSummary();
      });
    });

    // Wire category select listeners
    tbody.querySelectorAll('.table-select-cat').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.parsedStatementTransactions[idx].category = e.target.value;
      });
    });

    this.updateStatementSummary();
    this.updateStatementSortUI();
  }

  handleStatementSort(field) {
    if (!this.parsedStatementTransactions || this.parsedStatementTransactions.length === 0) return;

    if (this.statementSortField === field) {
      this.statementSortAsc = !this.statementSortAsc;
    } else {
      this.statementSortField = field;
      this.statementSortAsc = true;
    }

    this.sortStatementTransactions(this.statementSortField, this.statementSortAsc);
    this.renderStatementPreview();
  }

  sortStatementTransactions(field, asc = true) {
    if (!this.parsedStatementTransactions) return;

    this.parsedStatementTransactions.sort((a, b) => {
      let comparison = 0;
      if (field === 'amount') {
        comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else if (field === 'date') {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        comparison = da - db;
      } else if (field === 'description') {
        comparison = (a.description || '').localeCompare(b.description || '', undefined, { sensitivity: 'base' });
      } else if (field === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '', undefined, { sensitivity: 'base' });
      } else if (field === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '', undefined, { sensitivity: 'base' });
      }
      return asc ? comparison : -comparison;
    });
  }

  updateStatementSortUI() {
    const headers = document.querySelectorAll('#statement-preview-table .sortable-th');
    headers.forEach((th) => {
      const icon = th.querySelector('.sort-icon');
      if (th.dataset.sort === this.statementSortField) {
        th.classList.add('active-sort');
        th.setAttribute('aria-sort', this.statementSortAsc ? 'ascending' : 'descending');
        if (icon) icon.textContent = this.statementSortAsc ? '▲' : '▼';
      } else {
        th.classList.remove('active-sort');
        th.removeAttribute('aria-sort');
        if (icon) icon.textContent = '↕';
      }
    });
  }

  updateStatementSummary() {
    const countEl = document.getElementById('stmt-count-selected');
    const incomeEl = document.getElementById('stmt-total-income');
    const expenseEl = document.getElementById('stmt-total-expense');
    const netEl = document.getElementById('stmt-net-impact');
    const btnCommit = document.getElementById('btn-commit-statement');

    const totalCount = this.parsedStatementTransactions.length;
    const selected = this.parsedStatementTransactions.filter((t) => t.selected);

    let totalIncome = 0;
    let totalExpense = 0;

    selected.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const netImpact = totalIncome - totalExpense;

    if (countEl) countEl.textContent = `${selected.length} / ${totalCount}`;
    if (incomeEl) incomeEl.textContent = `+₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (expenseEl) expenseEl.textContent = `-₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (netEl) {
      netEl.textContent = `${netImpact >= 0 ? '+' : '-'}₹${Math.abs(netImpact).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      netEl.style.color = netImpact >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    if (btnCommit) {
      btnCommit.disabled = selected.length === 0;
      btnCommit.innerHTML = `<span>📥 Import ${selected.length} Selected Entries</span>`;
    }
  }

  async commitStatementImport() {
    const selected = this.parsedStatementTransactions.filter((t) => t.selected);
    if (selected.length === 0) return;

    const btnCommit = document.getElementById('btn-commit-statement');
    if (btnCommit) {
      btnCommit.disabled = true;
      btnCommit.textContent = 'Importing entries...';
    }

    try {
      const targetAccountId = (document.getElementById('stmt-account-target') && document.getElementById('stmt-account-target').value) || null;
      const toSave = selected.map((t) => ({
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        type: t.type,
        amount: t.amount,
        category: t.category || 'General',
        date: t.date,
        description: t.description || 'Bank Statement Import',
        accountId: targetAccountId,
        createdAt: Date.now()
      }));

      await this.storage.batchAddTransactions(toSave);
      await this.loadAndRender();

      // Silently auto-sync to user's Google account if connected
      this.triggerAutoSync();

      // Close modal
      const modal = document.getElementById('modal-import-statement');
      if (modal) modal.style.display = 'none';
      this.resetStatementModal();

      this.showToast(`🎉 Successfully imported ${toSave.length} transactions from bank statement!`, 'success');
    } catch (err) {
      console.error('Failed to commit statement import:', err);
      this.showToast('Import failed: ' + err.message, 'error');
      if (btnCommit) {
        btnCommit.disabled = false;
        btnCommit.innerHTML = `<span>📥 Import Selected Entries</span>`;
      }
    }
  }

  updateAuthUI(isSignedIn, user) {
    const signedOutBox = document.getElementById('auth-signed-out');
    const signedInBox = document.getElementById('auth-signed-in');
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');

    if (isSignedIn && user) {
      if (signedOutBox) signedOutBox.style.display = 'none';
      if (signedInBox) signedInBox.style.display = 'flex';
      if (nameEl) nameEl.textContent = user.name || user.email || 'Google User';
      if (avatarEl) {
        if (user.picture) {
          avatarEl.innerHTML = `<img src="${user.picture}" alt="User Avatar" class="avatar-img" />`;
        } else {
          avatarEl.textContent = (user.name ? user.name[0] : 'U').toUpperCase();
        }
      }
    } else {
      if (signedOutBox) signedOutBox.style.display = 'flex';
      if (signedInBox) signedInBox.style.display = 'none';
    }
  }

  updateSyncBadge(status) {
    const badge = document.getElementById('cloud-sync-status');
    if (!badge) return;

    if (status === 'syncing') {
      badge.textContent = '🔄 Syncing...';
      badge.className = 'sync-status syncing';
    } else if (status === 'synced') {
      badge.textContent = '☁️ Synced';
      badge.className = 'sync-status synced';
    } else if (status === 'drive_api_disabled') {
      badge.textContent = '⚠️ Enable Drive API';
      badge.className = 'sync-status error';
      this.showToast('Please enable Google Drive API in your Google Cloud Console project.', 'error');
    } else if (status === 'quota_exceeded') {
      badge.textContent = '⚠️ Drive Full';
      badge.className = 'sync-status error';
      this.showToast('Your Google Drive storage is full. Budget is safely stored on this device.', 'error');
    } else if (status === 'error') {
      badge.textContent = '⚠️ Sync Paused';
      badge.className = 'sync-status error';
    }
  }

  async handleGoogleSignIn() {
    try {
      this.showToast('Signing in with Google...', 'success');
      const user = await this.driveService.signIn();
      this.showToast(`Welcome back, ${user.name || 'there'}!`, 'success');
    } catch (err) {
      console.error(err);
      this.showToast(err.message || 'Google Sign-In was cancelled.', 'error');
    }
  }

  async handleGoogleSignOut() {
    await this.driveService.signOut();
    this.showToast('Signed out. Your data remains stored locally on this device.', 'success');
  }

  async syncFromCloudOnLogin() {
    try {
      const cloudJson = await this.driveService.fetchCloudBackup();
      if (cloudJson) {
        const res = await this.storage.importBackup(cloudJson);
        if (res.success && res.count > 0) {
          this.showToast(`Restored ${res.count} transactions from your Google account.`, 'success');
          await this.loadAndRender();
        }
      }
    } catch (e) {
      console.warn('Initial cloud sync check:', e);
    }
  }

  async triggerAutoSync() {
    if (this.driveService && this.driveService.isConnected()) {
      const backupJson = await this.storage.exportBackup();
      await this.driveService.autoSync(backupJson);
    }
  }

  setDefaultDate() {
    const dateInput = document.getElementById('tx-date');
    if (dateInput && !dateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
  }

  setActiveFormType(type) {
    this.activeFormType = type;
    const typeButtons = document.querySelectorAll('.type-toggle-btn');
    typeButtons.forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      }
    });

    this.populateCategoryOptions();

    const submitBtn = document.getElementById('btn-submit-tx');
    if (submitBtn) {
      submitBtn.innerHTML = type === 'expense' 
        ? '<span>+ Add Expense</span>' 
        : '<span>+ Add Income</span>';
    }
  }

  populateCategoryOptions() {
    const categorySelect = document.getElementById('tx-category');
    if (!categorySelect) return;

    categorySelect.innerHTML = '';
    const list = this.categories[this.activeFormType] || [];
    list.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  async loadAndRender() {
    this.transactions = await this.storage.getAllTransactions();
    await this.loadAccounts();
    this.renderSummaryMetrics();
    this.renderLedger();
    if (this.activeTab === 'tab-stats') {
      this.renderStatsView();
    } else if (this.activeTab === 'tab-accounts') {
      this.renderAccountsView();
    }
  }

  renderSummaryMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;

    const txsToSum = this.activeAccountId && this.activeAccountId !== 'all'
      ? this.transactions.filter(t => t.accountId === this.activeAccountId)
      : this.transactions;

    for (const tx of txsToSum) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    }

    const netBalance = totalIncome - totalExpense;

    const balanceEl = document.getElementById('metric-net-balance');
    const incomeEl = document.getElementById('metric-total-income');
    const expenseEl = document.getElementById('metric-total-expense');

    if (balanceEl) {
      balanceEl.textContent = this.formatCurrency(netBalance);
      balanceEl.style.color = netBalance >= 0 ? 'var(--text-primary)' : 'var(--accent-red)';
    }
    if (incomeEl) {
      incomeEl.textContent = this.formatCurrency(totalIncome);
    }
    if (expenseEl) {
      expenseEl.textContent = this.formatCurrency(totalExpense);
    }
  }

  renderLedger() {
    const listContainer = document.getElementById('transaction-list');
    if (!listContainer) return;

    const filtered = this.transactions.filter((tx) => {
      const matchesAccount = !this.activeAccountId || this.activeAccountId === 'all' || tx.accountId === this.activeAccountId;
      const matchesType = this.filterType === 'all' || tx.type === this.filterType;
      const matchesSearch = !this.searchQuery ||
        tx.category.toLowerCase().includes(this.searchQuery) ||
        (tx.description && tx.description.toLowerCase().includes(this.searchQuery));
      return matchesAccount && matchesType && matchesSearch;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">No transactions found</div>
          <p>Start recording your incomes or expenses using the form.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map((tx) => {
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const icon = isIncome ? '📈' : '📉';
      const badgeClass = isIncome ? 'income' : 'expense';

      const acc = this.accounts.find(a => a.id === tx.accountId);
      const accBadge = acc ? `<span class="tx-account-badge">🏦 ${this.escapeHtml(acc.bankName)} (${this.escapeHtml(this.maskAccountNumber(acc.accountNumber))})</span>` : '';

      return `
        <div class="transaction-item" data-id="${tx.id}">
          <div class="tx-left">
            <div class="tx-icon-badge ${badgeClass}">${icon}</div>
            <div class="tx-info">
              <div class="tx-category">${this.escapeHtml(tx.category)}</div>
              <div class="tx-meta">
                <span>📅 ${tx.date}</span>
                ${tx.description ? `<span>• ${this.escapeHtml(tx.description)}</span>` : ''}
                ${accBadge}
              </div>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${badgeClass}">${sign}${this.formatCurrency(tx.amount)}</span>
            <button class="btn-delete" title="Delete record" onclick="window.budgetApp.handleDelete('${tx.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const amountInput = document.getElementById('tx-amount');
    const categoryInput = document.getElementById('tx-category');
    const dateInput = document.getElementById('tx-date');
    const descInput = document.getElementById('tx-description');
    const accountSelect = document.getElementById('tx-account');
    const selectedAccId = accountSelect ? accountSelect.value : null;

    const rawAmount = parseFloat(amountInput.value);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      this.showToast('Please enter a valid positive amount.', 'error');
      amountInput.focus();
      return;
    }

    const transaction = {
      type: this.activeFormType,
      amount: rawAmount,
      category: categoryInput.value,
      date: dateInput.value || new Date().toISOString().split('T')[0],
      description: descInput.value.trim(),
      accountId: selectedAccId || null
    };

    await this.storage.addTransaction(transaction);
    this.showToast(`${this.activeFormType === 'income' ? 'Income' : 'Expense'} recorded!`, 'success');

    amountInput.value = '';
    descInput.value = '';
    this.setDefaultDate();

    await this.loadAndRender();
    this.triggerAutoSync(); // Silently auto-sync to user's Google account
  }

  async handleDelete(id) {
    if (!id) return;
    await this.storage.deleteTransaction(id);
    this.showToast('Transaction removed.', 'success');
    await this.loadAndRender();
    this.triggerAutoSync(); // Silently auto-sync to user's Google account
  }

  async handleExportBackup() {
    const jsonString = await this.storage.exportBackup();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `personal-assistant-budget-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Backup saved to local file!', 'success');
  }

  async handleImportBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const result = await this.storage.importBackup(content);
      if (result.success) {
        this.showToast(result.message, 'success');
        await this.loadAndRender();
        this.triggerAutoSync();
      } else {
        this.showToast(result.message, 'error');
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      this.showToast('Failed to read the backup file.', 'error');
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3500);
  }

  // ==========================================================================
  // Multi-Account Management Methods
  // ==========================================================================

  maskAccountNumber(accNum) {
    if (!accNum) return '';
    const str = String(accNum).trim();
    if (str.length <= 4) return str;
    return '•••• ' + str.slice(-4);
  }

  async loadAccounts() {
    this.accounts = await this.storage.getAllAccounts();
    if (!this.accounts || this.accounts.length === 0) {
      const defaultAcc = {
        id: 'acc_' + Date.now(),
        bankName: 'State Bank of India',
        accountNumber: '12345678901',
        ifscCode: 'SBIN0001234',
        accountType: 'savings',
        nickname: 'Primary Salary Account',
        isDefault: true,
        createdAt: Date.now()
      };
      await this.storage.saveAccount(defaultAcc);
      this.accounts = [defaultAcc];
    }
    this.updateAccountDropdowns();
    const countEl = document.getElementById('tab-account-count');
    if (countEl) countEl.textContent = this.accounts.length;
  }

  updateAccountDropdowns() {
    // 1. Global Filter Dropdown
    const globalFilter = document.getElementById('global-account-filter');
    if (globalFilter) {
      const curVal = globalFilter.value || 'all';
      globalFilter.innerHTML = '<option value="all">🏦 All Accounts</option>' +
        this.accounts.map(a => `<option value="${a.id}" ${curVal === a.id ? 'selected' : ''}>🏦 ${this.escapeHtml(a.bankName)} (${this.escapeHtml(this.maskAccountNumber(a.accountNumber))})</option>`).join('');
    }

    // 2. Transaction Form Dropdown
    const txAccountSelect = document.getElementById('tx-account');
    if (txAccountSelect) {
      const defaultAcc = this.accounts.find(a => a.isDefault) || this.accounts[0];
      txAccountSelect.innerHTML = this.accounts.map(a => `
        <option value="${a.id}" ${defaultAcc && defaultAcc.id === a.id ? 'selected' : ''}>
          ${this.escapeHtml(a.bankName)} (${this.escapeHtml(this.maskAccountNumber(a.accountNumber))})
        </option>
      `).join('');
    }

    // 3. Statement Importer Target Dropdown
    const stmtAccountSelect = document.getElementById('stmt-account-target');
    if (stmtAccountSelect) {
      const defaultAcc = this.accounts.find(a => a.isDefault) || this.accounts[0];
      stmtAccountSelect.innerHTML = this.accounts.map(a => `
        <option value="${a.id}" ${defaultAcc && defaultAcc.id === a.id ? 'selected' : ''}>
          ${this.escapeHtml(a.bankName)} (${this.escapeHtml(this.maskAccountNumber(a.accountNumber))})
        </option>
      `).join('');
    }
  }

  renderAccountsView() {
    const grid = document.getElementById('accounts-cards-grid');
    if (!grid) return;

    if (!this.accounts || this.accounts.length === 0) {
      grid.innerHTML = '<div style="color: var(--text-muted); padding: 2rem; text-align: center; grid-column: 1 / -1;">No bank accounts registered. Click "+ Add Bank Account" above.</div>';
      return;
    }

    grid.innerHTML = this.accounts.map(acc => {
      let accIncome = 0;
      let accExpense = 0;
      this.transactions.forEach(t => {
        if (t.accountId === acc.id) {
          if (t.type === 'income') accIncome += Number(t.amount) || 0;
          else accExpense += Number(t.amount) || 0;
        }
      });
      const balance = accIncome - accExpense;
      const maskedNum = this.maskAccountNumber(acc.accountNumber);

      return `
        <div class="account-card" data-id="${acc.id}">
          <div class="account-card-header">
            <div class="account-bank-group">
              <div class="account-bank-icon">🏦</div>
              <div>
                <div class="account-bank-name">${this.escapeHtml(acc.bankName)}</div>
                ${acc.nickname ? `<div class="account-nickname-label">${this.escapeHtml(acc.nickname)}</div>` : ''}
              </div>
            </div>
            ${acc.isDefault ? '<span class="account-badge-default">⭐ Default</span>' : ''}
          </div>

          <div class="account-details-block">
            <div class="account-detail-row">
              <span class="account-detail-label">Account No:</span>
              <span class="account-detail-val" title="${this.escapeHtml(acc.accountNumber)}">${this.escapeHtml(maskedNum)}</span>
            </div>
            <div class="account-detail-row">
              <span class="account-detail-label">IFSC Code:</span>
              <span class="account-detail-val">${this.escapeHtml(acc.ifscCode || 'N/A')}</span>
            </div>
            <div class="account-detail-row">
              <span class="account-detail-label">Type:</span>
              <span class="account-detail-val" style="text-transform: capitalize;">${this.escapeHtml(acc.accountType || 'Savings')}</span>
            </div>
          </div>

          <div class="account-balance-section">
            <span class="account-bal-label">Calculated Balance</span>
            <span class="account-bal-amount" style="color: ${balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
              ${balance >= 0 ? '+' : '-'}${this.formatCurrency(balance)}
            </span>
          </div>

          <div class="account-actions-footer">
            ${!acc.isDefault ? `<button type="button" class="btn-text-subtle" onclick="window.budgetApp.handleSetDefaultAccount('${acc.id}')">Make Default</button><span>•</span>` : ''}
            <button type="button" class="btn-text-subtle" onclick="window.budgetApp.openAccountModalById('${acc.id}')">Edit</button>
            <span>•</span>
            <button type="button" class="btn-text-subtle text-danger" onclick="window.budgetApp.handleDeleteAccount('${acc.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  openAccountModal(account = null) {
    const modal = document.getElementById('modal-account-form');
    const titleEl = document.getElementById('account-modal-title');
    const idInput = document.getElementById('account-id-input');
    const bankSelect = document.getElementById('acc-bank-select');
    const customBankInput = document.getElementById('acc-custom-bank');
    const customGroup = document.getElementById('acc-custom-bank-group');
    const numInput = document.getElementById('acc-number');
    const ifscInput = document.getElementById('acc-ifsc');
    const typeSelect = document.getElementById('acc-type');
    const nickInput = document.getElementById('acc-nickname');
    const defaultCheck = document.getElementById('acc-default');

    if (!modal) return;

    if (account) {
      titleEl.textContent = 'Edit Bank Account';
      idInput.value = account.id;

      const knownBanks = ['State Bank of India', 'Axis Bank', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda'];
      if (knownBanks.includes(account.bankName)) {
        bankSelect.value = account.bankName;
        customGroup.style.display = 'none';
        customBankInput.value = '';
      } else {
        bankSelect.value = 'Other';
        customGroup.style.display = 'block';
        customBankInput.value = account.bankName || '';
      }

      numInput.value = account.accountNumber || '';
      ifscInput.value = account.ifscCode || '';
      typeSelect.value = account.accountType || 'savings';
      nickInput.value = account.nickname || '';
      defaultCheck.checked = !!account.isDefault;
    } else {
      titleEl.textContent = 'Add Bank Account';
      idInput.value = '';
      bankSelect.value = '';
      customGroup.style.display = 'none';
      customBankInput.value = '';
      numInput.value = '';
      ifscInput.value = '';
      typeSelect.value = 'savings';
      nickInput.value = '';
      defaultCheck.checked = this.accounts.length === 0;
    }

    modal.style.display = 'flex';
  }

  openAccountModalById(id) {
    const acc = this.accounts.find(a => a.id === id);
    if (acc) this.openAccountModal(acc);
  }

  closeAccountModal() {
    const modal = document.getElementById('modal-account-form');
    if (modal) modal.style.display = 'none';
  }

  async handleSaveAccount(e) {
    e.preventDefault();

    const idInput = document.getElementById('account-id-input');
    const bankSelect = document.getElementById('acc-bank-select');
    const customBankInput = document.getElementById('acc-custom-bank');
    const numInput = document.getElementById('acc-number');
    const ifscInput = document.getElementById('acc-ifsc');
    const typeSelect = document.getElementById('acc-type');
    const nickInput = document.getElementById('acc-nickname');
    const defaultCheck = document.getElementById('acc-default');

    let bankName = bankSelect.value;
    if (bankName === 'Other') {
      bankName = customBankInput.value.trim() || 'Other Bank';
    }

    const isDefault = defaultCheck.checked;
    const accountId = idInput.value || ('acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

    // If setting default, unset existing default
    if (isDefault) {
      for (const a of this.accounts) {
        if (a.id !== accountId && a.isDefault) {
          a.isDefault = false;
          await this.storage.saveAccount(a);
        }
      }
    }

    const account = {
      id: accountId,
      bankName,
      accountNumber: numInput.value.trim(),
      ifscCode: (ifscInput.value || '').trim().toUpperCase(),
      accountType: typeSelect.value,
      nickname: nickInput.value.trim(),
      isDefault: isDefault || this.accounts.length === 0,
      createdAt: Date.now()
    };

    await this.storage.saveAccount(account);
    this.closeAccountModal();
    this.showToast(`Account ${bankName} saved!`, 'success');

    await this.loadAccounts();
    this.renderAccountsView();
    this.triggerAutoSync();
  }

  async handleDeleteAccount(id) {
    if (!id) return;
    if (this.accounts.length <= 1) {
      this.showToast('You must keep at least one active bank account.', 'error');
      return;
    }

    const target = this.accounts.find(a => a.id === id);
    await this.storage.deleteAccount(id);
    this.showToast(`Account ${target ? target.bankName : ''} deleted.`, 'success');

    await this.loadAccounts();
    this.renderAccountsView();
    this.triggerAutoSync();
  }

  async handleSetDefaultAccount(id) {
    for (const a of this.accounts) {
      a.isDefault = (a.id === id);
      await this.storage.saveAccount(a);
    }
    await this.loadAccounts();
    this.renderAccountsView();
    this.showToast('Default bank account updated.', 'success');
  }

  // ==========================================================================
  // Tab Switching & Expense Analytics Methods
  // ==========================================================================

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.app-tab-btn, .app-nav .nav-tab[data-tab]').forEach((b) => {
      const isActive = b.dataset.tab === tabName;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.style.display = 'none';
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`${tabName}-view`);
    if (activePane) {
      activePane.style.display = 'block';
      activePane.classList.add('active');
    }

    if (tabName === 'tab-stats') {
      this.renderStatsView();
    } else if (tabName === 'tab-accounts') {
      this.renderAccountsView();
    } else if (tabName === 'tab-ledger') {
      this.renderSummaryMetrics();
      this.renderLedger();
    }
  }

  renderStatsView() {
    let startDate = null;
    let endDate = null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    if (this.statsDateRange === 'this_year') {
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
    } else if (this.statsDateRange === 'last_year') {
      startDate = `${currentYear - 1}-01-01`;
      endDate = `${currentYear - 1}-12-31`;
    } else if (this.statsDateRange === 'this_month') {
      const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      startDate = `${currentYear}-${currentMonth}-01`;
      endDate = `${currentYear}-${currentMonth}-${String(lastDay).padStart(2, '0')}`;
    } else if (this.statsDateRange === 'last_month') {
      const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(prevYear, prevMonthDate.getMonth() + 1, 0).getDate();
      startDate = `${prevYear}-${prevMonth}-01`;
      endDate = `${prevYear}-${prevMonth}-${String(lastDay).padStart(2, '0')}`;
    } else if (this.statsDateRange === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (this.statsDateRange === 'custom') {
      startDate = this.statsStartDate;
      endDate = this.statsEndDate;
    }

    // Filter transactions by active account and date window
    const filtered = this.transactions.filter((tx) => {
      if (this.activeAccountId && this.activeAccountId !== 'all' && tx.accountId !== this.activeAccountId) {
        return false;
      }
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });

    const stats = this.computeExpenseStatistics(filtered, startDate, endDate);

    // Update key metrics cards
    const expenseEl = document.getElementById('stat-val-expense');
    const incomeEl = document.getElementById('stat-val-income');
    const savingsEl = document.getElementById('stat-val-savings');
    const savingsRateEl = document.getElementById('stat-val-savings-rate');
    const dailyAvgEl = document.getElementById('stat-val-daily-avg');
    const daysSubEl = document.getElementById('stat-sub-days');
    const peakAmtEl = document.getElementById('stat-val-peak-amount');
    const peakDateEl = document.getElementById('stat-val-peak-date');
    const expenseSubEl = document.getElementById('stat-sub-expense');
    const incomeSubEl = document.getElementById('stat-sub-income');

    const expenseCount = filtered.filter(t => t.type === 'expense').length;
    const incomeCount = filtered.filter(t => t.type === 'income').length;

    if (expenseEl) expenseEl.textContent = this.formatCurrency(stats.totalExpense);
    if (expenseSubEl) expenseSubEl.textContent = `${expenseCount} transaction${expenseCount === 1 ? '' : 's'}`;
    if (incomeEl) incomeEl.textContent = this.formatCurrency(stats.totalIncome);
    if (incomeSubEl) incomeSubEl.textContent = `${incomeCount} transaction${incomeCount === 1 ? '' : 's'}`;

    if (savingsEl) {
      savingsEl.textContent = `${stats.netSavings >= 0 ? '+' : '-'}${this.formatCurrency(stats.netSavings)}`;
      savingsEl.style.color = stats.netSavings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    if (savingsRateEl) {
      savingsRateEl.textContent = `Savings Rate: ${stats.savingsRate}%`;
    }
    if (dailyAvgEl) dailyAvgEl.textContent = this.formatCurrency(stats.dailyAverageSpend);
    if (daysSubEl) daysSubEl.textContent = `Over ${stats.daySpan} day${stats.daySpan === 1 ? '' : 's'}`;

    if (peakAmtEl) peakAmtEl.textContent = stats.peakSpendingDay.amount > 0 ? this.formatCurrency(stats.peakSpendingDay.amount) : '₹0.00';
    if (peakDateEl) peakDateEl.textContent = stats.peakSpendingDay.date !== 'N/A' ? `📅 ${stats.peakSpendingDay.date}` : 'No expenses recorded';

    // Render trend chart, top 5 expenses, and category breakdown
    this.renderTrendChart(stats.timeTrend);
    this.renderTopExpenses(stats.top5Expenses);
    this.renderCategoryBreakdown(stats.categoryBreakdown, stats.totalExpense);
  }

  computeExpenseStatistics(transactions, startDate = null, endDate = null) {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const categoryCounts = {};
    const dailyExpenses = {};
    const monthlyTotals = {};
    const expensesList = [];

    for (const tx of transactions) {
      const amt = Number(tx.amount) || 0;
      const date = tx.date || '';
      const month = date.substring(0, 7);

      if (tx.type === 'income') {
        totalIncome += amt;
        if (month) {
          monthlyTotals[month] = monthlyTotals[month] || { income: 0, expense: 0 };
          monthlyTotals[month].income += amt;
        }
      } else if (tx.type === 'expense') {
        totalExpense += amt;
        expensesList.push(tx);

        const cat = tx.category || 'General';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        if (date) {
          dailyExpenses[date] = (dailyExpenses[date] || 0) + amt;
          if (month) {
            monthlyTotals[month] = monthlyTotals[month] || { income: 0, expense: 0 };
            monthlyTotals[month].expense += amt;
          }
        }
      }
    }

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;
    const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;

    let daySpan = 1;
    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      daySpan = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    } else if (Object.keys(dailyExpenses).length > 0) {
      const dates = Object.keys(dailyExpenses).sort();
      const d1 = new Date(dates[0]);
      const d2 = new Date(dates[dates.length - 1]);
      daySpan = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    }
    const dailyAverageSpend = Math.round((totalExpense / daySpan) * 100) / 100;

    let peakDay = { date: 'N/A', amount: 0 };
    for (const [day, amt] of Object.entries(dailyExpenses)) {
      if (amt > peakDay.amount) {
        peakDay = { date: day, amount: Math.round(amt * 100) / 100 };
      }
    }

    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => {
      const amt = Math.round(categoryTotals[cat] * 100) / 100;
      const count = categoryCounts[cat] || 0;
      const percentage = totalExpense > 0 ? Math.round((amt / totalExpense) * 1000) / 10 : 0;
      return { category: cat, amount: amt, count, percentage };
    }).sort((a, b) => b.amount - a.amount);

    expensesList.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    const top5Expenses = expensesList.slice(0, 5);

    let timeTrend = [];
    if (daySpan > 31) {
      timeTrend = Object.keys(monthlyTotals).sort().map(m => ({
        period: m,
        income: Math.round(monthlyTotals[m].income * 100) / 100,
        expense: Math.round(monthlyTotals[m].expense * 100) / 100
      }));
    } else {
      timeTrend = Object.keys(dailyExpenses).sort().map(d => ({
        period: d,
        income: 0,
        expense: Math.round(dailyExpenses[d] * 100) / 100
      }));
    }

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      daySpan,
      dailyAverageSpend,
      peakSpendingDay: peakDay,
      categoryBreakdown,
      top5Expenses,
      timeTrend
    };
  }

  renderTrendChart(timeTrend) {
    const container = document.getElementById('stats-trend-chart');
    const granEl = document.getElementById('stats-trend-granularity');
    if (!container) return;

    if (!timeTrend || timeTrend.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 2rem; text-align: center; width: 100%;">No spending records in this period.</div>';
      return;
    }

    if (granEl) {
      granEl.textContent = timeTrend.length > 0 && timeTrend[0].period.length === 7 ? 'Monthly' : 'Daily';
    }

    const maxVal = Math.max(...timeTrend.map(t => Math.max(t.expense, t.income, 1)));

    container.innerHTML = timeTrend.map(item => {
      const heightPercent = Math.min(100, Math.max(4, Math.round((item.expense / maxVal) * 100)));
      return `
        <div class="trend-bar-col">
          <div class="trend-tooltip">
            <strong>${item.period}</strong><br>
            Expense: ₹${item.expense.toLocaleString('en-IN')}<br>
            Income: ₹${item.income.toLocaleString('en-IN')}
          </div>
          <div class="trend-bar-fill" style="height: ${heightPercent}%;"></div>
          <div class="trend-bar-label">${item.period.length === 10 ? item.period.slice(5) : item.period}</div>
        </div>
      `;
    }).join('');
  }

  renderTopExpenses(topExpenses) {
    const container = document.getElementById('stats-top-expenses');
    if (!container) return;

    if (!topExpenses || topExpenses.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem; text-align: center;">No expenses recorded in this period.</div>';
      return;
    }

    container.innerHTML = topExpenses.map((t, idx) => {
      const acc = this.accounts.find(a => a.id === t.accountId);
      const accBadge = acc ? `<span>• 🏦 ${this.escapeHtml(acc.bankName)}</span>` : '';
      return `
        <div class="top-expense-row">
          <div class="top-expense-left">
            <div class="top-rank-badge rank-${idx + 1}">${idx + 1}</div>
            <div>
              <div class="top-expense-desc">${this.escapeHtml(t.description || t.category)}</div>
              <div class="top-expense-meta">
                <span>📅 ${t.date}</span>
                <span>• ${this.escapeHtml(t.category)}</span>
                ${accBadge}
              </div>
            </div>
          </div>
          <div class="top-expense-amount">
            -₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      `;
    }).join('');
  }

  renderCategoryBreakdown(categories, totalExpense) {
    const container = document.getElementById('stats-category-list');
    if (!container) return;

    if (!categories || categories.length === 0 || totalExpense === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem; text-align: center;">No category expenses recorded in this period.</div>';
      return;
    }

    container.innerHTML = categories.map(cat => {
      return `
        <div class="category-breakdown-item">
          <div class="cat-item-header">
            <div class="cat-item-name">
              <span>🏷️</span> ${this.escapeHtml(cat.category)}
            </div>
            <div class="cat-item-values">
              ₹${cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${cat.percentage}%)
            </div>
          </div>
          <div class="cat-progress-bg">
            <div class="cat-progress-fill" style="width: ${Math.min(100, Math.max(2, cat.percentage))}%;"></div>
          </div>
          <div class="cat-item-sub">
            <span>${cat.count} transaction${cat.count === 1 ? '' : 's'}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.budgetApp = new BudgetApp();
