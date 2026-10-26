/**
 * StorageService - 100% Local-First Persistent Repository
 * Supports IndexedDB with automatic LocalStorage fallback.
 * Strictly zero network calls or external data transmission.
 */
class StorageService {
  constructor() {
    this.dbName = 'PersonalAssistantDB';
    this.dbVersion = 2;
    this.storeName = 'transactions';
    this.accountsStoreName = 'accounts';
    this.db = null;
    this.fallbackKey = 'pa_budget_transactions_v1';
    this.accountsFallbackKey = 'pa_budget_accounts_v1';
    this.isIndexedDBSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Initializes the storage database connection
   */
  async init() {
    if (!this.isIndexedDBSupported) {
      console.warn('StorageService: IndexedDB not available, using LocalStorage fallback.');
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('category', 'category', { unique: false });
            store.createIndex('accountId', 'accountId', { unique: false });
          }
          if (!db.objectStoreNames.contains(this.accountsStoreName)) {
            const accStore = db.createObjectStore(this.accountsStoreName, { keyPath: 'id' });
            accStore.createIndex('bankName', 'bankName', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(true);
        };

        request.onerror = (event) => {
          console.error('StorageService: IndexedDB open failed, falling back to LocalStorage', event.target.error);
          this.db = null;
          resolve(false);
        };
      } catch (err) {
        console.error('StorageService: IndexedDB initialization threw error', err);
        this.db = null;
        resolve(false);
      }
    });
  }

  /**
   * Retrieves all stored transactions
   * @returns {Promise<Array>}
   */
  async getAllTransactions() {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readonly');
          const store = tx.objectStore(this.storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            const items = request.result || [];
            // Sort descending by date, then createdAt
            items.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
            resolve(items);
          };

          request.onerror = () => {
            resolve(this._getLocalStorageFallback());
          };
        } catch (e) {
          resolve(this._getLocalStorageFallback());
        }
      });
    }

    return this._getLocalStorageFallback();
  }

  /**
   * Adds a new transaction to the database
   * @param {Object} transaction
   */
  async addTransaction(transaction) {
    if (!transaction.id) {
      transaction.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    if (!transaction.createdAt) {
      transaction.createdAt = Date.now();
    }

    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          const store = tx.objectStore(this.storeName);
          const request = store.add(transaction);

          request.onsuccess = () => resolve(transaction);
          request.onerror = (e) => {
            console.error('IndexedDB add error, saving to fallback', e);
            this._saveLocalStorageFallback(transaction);
            resolve(transaction);
          };
        } catch (e) {
          this._saveLocalStorageFallback(transaction);
          resolve(transaction);
        }
      });
    }

    this._saveLocalStorageFallback(transaction);
    return transaction;
  }

  /**
   * Adds multiple transactions to the database in a batch
   * @param {Array<Object>} transactions
   * @returns {Promise<Array<Object>>}
   */
  async batchAddTransactions(transactions) {
    if (!transactions || transactions.length === 0) return [];

    const prepared = transactions.map((t) => {
      const copy = { ...t };
      if (!copy.id) {
        copy.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      }
      if (!copy.createdAt) {
        copy.createdAt = Date.now();
      }
      return copy;
    });

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          const store = tx.objectStore(this.storeName);
          for (const item of prepared) {
            store.put(item);
          }
          tx.oncomplete = () => resolve(prepared);
          tx.onerror = () => {
            for (const item of prepared) {
              this._saveLocalStorageFallback(item);
            }
            resolve(prepared);
          };
        } catch (e) {
          for (const item of prepared) {
            this._saveLocalStorageFallback(item);
          }
          resolve(prepared);
        }
      });
    }

    for (const item of prepared) {
      this._saveLocalStorageFallback(item);
    }
    return prepared;
  }

  /**
   * Deletes a transaction by ID
   * @param {string} id
   */
  async deleteTransaction(id) {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          const store = tx.objectStore(this.storeName);
          const request = store.delete(id);

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            this._deleteLocalStorageFallback(id);
            resolve(true);
          };
        } catch (e) {
          this._deleteLocalStorageFallback(id);
          resolve(true);
        }
      });
    }

    this._deleteLocalStorageFallback(id);
    return true;
  }

  /**
   * Deletes multiple transactions by ID array in a single batch
   * @param {Array<string>} ids
   * @returns {Promise<number>} count of deleted transactions
   */
  async deleteTransactionsBatch(ids) {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          const store = tx.objectStore(this.storeName);
          for (const id of idSet) {
            store.delete(id);
          }
          tx.oncomplete = () => resolve(idSet.size);
          tx.onerror = () => {
            this._deleteBatchLocalStorageFallback(idSet);
            resolve(idSet.size);
          };
        } catch (e) {
          this._deleteBatchLocalStorageFallback(idSet);
          resolve(idSet.size);
        }
      });
    }

    this._deleteBatchLocalStorageFallback(idSet);
    return idSet.size;
  }

  /**
   * Clears all transactions while preserving registered bank accounts
   * @returns {Promise<boolean>}
   */
  async clearAllTransactions() {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.storeName], 'readwrite');
          const store = tx.objectStore(this.storeName);
          const request = store.clear();
          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            this._clearTransactionsLocalStorageFallback();
            resolve(true);
          };
        } catch (e) {
          this._clearTransactionsLocalStorageFallback();
          resolve(true);
        }
      });
    }

    this._clearTransactionsLocalStorageFallback();
    return true;
  }

  /**
   * Purges transactions matching given filter criteria
   * @param {Object} filter { accountId, startDate, endDate, type }
   * @returns {Promise<number>} number of deleted records
   */
  async purgeTransactions(filter = {}) {
    const all = await this.getAllTransactions();
    const toDelete = all.filter((t) => {
      if (filter.accountId && filter.accountId !== 'all') {
        if (filter.accountId === 'unassigned') {
          if (t.accountId) return false;
        } else if (t.accountId !== filter.accountId) {
          return false;
        }
      }
      if (filter.type && filter.type !== 'all' && t.type !== filter.type) {
        return false;
      }
      if (filter.startDate && t.date < filter.startDate) {
        return false;
      }
      if (filter.endDate && t.date > filter.endDate) {
        return false;
      }
      return true;
    });

    const ids = toDelete.map((t) => t.id);
    await this.deleteTransactionsBatch(ids);
    return ids.length;
  }

  /**
   * Exports an encrypted or standard backup envelope JSON
   * @returns {Promise<string>} JSON string
   */
  async exportBackup() {
    const transactions = await this.getAllTransactions();
    const accounts = await this.getAllAccounts();
    const envelope = {
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      recordCount: transactions.length,
      data: {
        transactions: transactions,
        accounts: accounts,
        currency: '₹'
      }
    };
    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Imports and restores a backup envelope JSON string
   * @param {string} jsonString
   * @returns {Promise<{success: boolean, count: number, message: string}>}
   */
  async importBackup(jsonString) {
    try {
      const envelope = JSON.parse(jsonString);

      if (!envelope || !envelope.data || !Array.isArray(envelope.data.transactions)) {
        throw new Error('Invalid backup file structure: missing data.transactions array.');
      }

      if (envelope.data.accounts && Array.isArray(envelope.data.accounts)) {
        for (const acc of envelope.data.accounts) {
          if (acc && acc.id && acc.bankName) {
            await this.saveAccount(acc);
          }
        }
      }

      const importedList = envelope.data.transactions;
      let validCount = 0;

      for (const item of importedList) {
        if (item && item.type && item.amount !== undefined && item.category && item.date) {
          // Normalize item
          const cleanItem = {
            id: item.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            type: item.type === 'income' ? 'income' : 'expense',
            amount: Math.abs(parseFloat(item.amount)) || 0,
            category: String(item.category).trim(),
            date: item.date,
            description: item.description ? String(item.description).trim() : '',
            accountId: item.accountId || null,
            createdAt: item.createdAt || Date.now()
          };
          await this.addTransaction(cleanItem);
          validCount++;
        }
      }

      return {
        success: true,
        count: validCount,
        message: `Successfully imported ${validCount} transactions.`
      };
    } catch (err) {
      console.error('Import failed:', err);
      return {
        success: false,
        count: 0,
        message: 'Import failed: ' + (err.message || 'Corrupt JSON file.')
      };
    }
  }

  /**
   * Retrieves all registered bank accounts
   * @returns {Promise<Array>}
   */
  async getAllAccounts() {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.accountsStoreName], 'readonly');
          const store = tx.objectStore(this.accountsStoreName);
          const request = store.getAll();

          request.onsuccess = () => {
            const items = request.result || [];
            items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(items);
          };

          request.onerror = () => {
            resolve(this._getAccountsLocalStorageFallback());
          };
        } catch (e) {
          resolve(this._getAccountsLocalStorageFallback());
        }
      });
    }

    return this._getAccountsLocalStorageFallback();
  }

  /**
   * Saves or updates an account
   * @param {Object} account
   * @returns {Promise<Object>}
   */
  async saveAccount(account) {
    if (!account.id) {
      account.id = 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }
    if (!account.createdAt) {
      account.createdAt = Date.now();
    }

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.accountsStoreName], 'readwrite');
          const store = tx.objectStore(this.accountsStoreName);
          const request = store.put(account);

          request.onsuccess = () => resolve(account);
          request.onerror = () => {
            this._saveAccountsLocalStorageFallback(account);
            resolve(account);
          };
        } catch (e) {
          this._saveAccountsLocalStorageFallback(account);
          resolve(account);
        }
      });
    }

    this._saveAccountsLocalStorageFallback(account);
    return account;
  }

  /**
   * Deletes an account by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteAccount(id) {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([this.accountsStoreName], 'readwrite');
          const store = tx.objectStore(this.accountsStoreName);
          const request = store.delete(id);

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            this._deleteAccountLocalStorageFallback(id);
            resolve(true);
          };
        } catch (e) {
          this._deleteAccountLocalStorageFallback(id);
          resolve(true);
        }
      });
    }

    this._deleteAccountLocalStorageFallback(id);
    return true;
  }

  // --- LocalStorage Fallback Helpers ---

  _getLocalStorageFallback() {
    try {
      const raw = localStorage.getItem(this.fallbackKey);
      const items = raw ? JSON.parse(raw) : [];
      items.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
      return items;
    } catch (e) {
      return [];
    }
  }

  _saveLocalStorageFallback(transaction) {
    try {
      const items = this._getLocalStorageFallback();
      // If already exists, replace, else append
      const idx = items.findIndex((t) => t.id === transaction.id);
      if (idx >= 0) {
        items[idx] = transaction;
      } else {
        items.push(transaction);
      }
      localStorage.setItem(this.fallbackKey, JSON.stringify(items));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }

  _deleteLocalStorageFallback(id) {
    try {
      const items = this._getLocalStorageFallback();
      const filtered = items.filter((t) => t.id !== id);
      localStorage.setItem(this.fallbackKey, JSON.stringify(filtered));
    } catch (e) {
      console.error('LocalStorage delete error', e);
    }
  }

  _deleteBatchLocalStorageFallback(idSet) {
    try {
      const set = idSet instanceof Set ? idSet : new Set(idSet);
      const items = this._getLocalStorageFallback();
      const filtered = items.filter((t) => !set.has(t.id));
      localStorage.setItem(this.fallbackKey, JSON.stringify(filtered));
    } catch (e) {
      console.error('LocalStorage batch delete error', e);
    }
  }

  _clearTransactionsLocalStorageFallback() {
    try {
      localStorage.removeItem(this.fallbackKey);
    } catch (e) {
      console.error('LocalStorage clear error', e);
    }
  }

  _getAccountsLocalStorageFallback() {
    try {
      const raw = localStorage.getItem(this.accountsFallbackKey);
      const items = raw ? JSON.parse(raw) : [];
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return items;
    } catch (e) {
      return [];
    }
  }

  _saveAccountsLocalStorageFallback(account) {
    try {
      const items = this._getAccountsLocalStorageFallback();
      const idx = items.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        items[idx] = account;
      } else {
        items.push(account);
      }
      localStorage.setItem(this.accountsFallbackKey, JSON.stringify(items));
    } catch (e) {
      console.error('LocalStorage account write error', e);
    }
  }

  _deleteAccountLocalStorageFallback(id) {
    try {
      const items = this._getAccountsLocalStorageFallback();
      const filtered = items.filter((a) => a.id !== id);
      localStorage.setItem(this.accountsFallbackKey, JSON.stringify(filtered));
    } catch (e) {
      console.error('LocalStorage account delete error', e);
    }
  }
}

// Export singleton instance to window for global modular access
if (typeof window !== 'undefined') {
  window.storageService = new StorageService();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageService };
}
