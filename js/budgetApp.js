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
  }

  resetStatementModal() {
    this.parsedStatementTransactions = [];
    const uploadZone = document.getElementById('statement-upload-zone');
    const loadingSection = document.getElementById('statement-loading');
    const reviewSection = document.getElementById('statement-review-section');
    const fileInput = document.getElementById('statement-file-input');
    const btnCommit = document.getElementById('btn-commit-statement');

    if (uploadZone) uploadZone.style.display = 'block';
    if (loadingSection) loadingSection.style.display = 'none';
    if (reviewSection) reviewSection.style.display = 'none';
    if (fileInput) fileInput.value = '';
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
      const toSave = selected.map((t) => ({
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        type: t.type,
        amount: t.amount,
        category: t.category || 'General',
        date: t.date,
        description: t.description || 'Bank Statement Import',
        createdAt: Date.now()
      }));

      await this.storage.batchAddTransactions(toSave);
      await this.loadAndRender();

      // Trigger background sync to Google Drive
      this.syncToCloudBackground();

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
    this.renderSummaryMetrics();
    this.renderLedger();
  }

  renderSummaryMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of this.transactions) {
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
      const matchesType = this.filterType === 'all' || tx.type === this.filterType;
      const matchesSearch = !this.searchQuery ||
        tx.category.toLowerCase().includes(this.searchQuery) ||
        (tx.description && tx.description.toLowerCase().includes(this.searchQuery));
      return matchesType && matchesSearch;
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

      return `
        <div class="transaction-item" data-id="${tx.id}">
          <div class="tx-left">
            <div class="tx-icon-badge ${badgeClass}">${icon}</div>
            <div class="tx-info">
              <div class="tx-category">${this.escapeHtml(tx.category)}</div>
              <div class="tx-meta">
                <span>📅 ${tx.date}</span>
                ${tx.description ? `<span>• ${this.escapeHtml(tx.description)}</span>` : ''}
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
      description: descInput.value.trim()
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
}

window.budgetApp = new BudgetApp();
