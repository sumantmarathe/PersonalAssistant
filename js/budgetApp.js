/**
 * BudgetApp - Sub-Application Controller for Budget & Expense Planner
 * Implements REQ-002 through REQ-008
 */
class BudgetApp {
  constructor() {
    this.storage = window.storageService;
    this.transactions = [];
    this.filterType = 'all';
    this.searchQuery = '';
    this.activeFormType = 'expense';

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
    this.bindEvents();
    this.populateCategoryOptions();
    this.setDefaultDate();
    await this.loadAndRender();
  }

  bindEvents() {
    // Type Toggle Buttons (Expense vs Income)
    const typeButtons = document.querySelectorAll('.type-toggle-btn');
    typeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
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

    // Export Backup
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportBackup());
    }

    // Import Backup Trigger
    const importBtn = document.getElementById('btn-import-trigger');
    const importFileInput = document.getElementById('import-file-input');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => this.handleImportBackup(e));
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

    // Filter by type & search
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
    this.showToast(`${this.activeFormType === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');

    // Reset inputs
    amountInput.value = '';
    descInput.value = '';
    this.setDefaultDate();

    await this.loadAndRender();
  }

  async handleDelete(id) {
    if (!id) return;
    await this.storage.deleteTransaction(id);
    this.showToast('Transaction removed.', 'success');
    await this.loadAndRender();
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
    this.showToast('Backup exported to local file!', 'success');
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
      } else {
        this.showToast(result.message, 'error');
      }
      e.target.value = ''; // Reset input
    };
    reader.onerror = () => {
      this.showToast('Failed to read the backup file.', 'error');
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  formatCurrency(amount) {
    return '$' + Math.abs(amount).toLocaleString('en-US', {
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

// Instantiate and expose globally
window.budgetApp = new BudgetApp();
