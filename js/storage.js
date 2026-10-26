/**
 * StorageService - 100% Local-First Persistent Repository
 * Supports IndexedDB with automatic LocalStorage fallback.
 * Strictly zero network calls or external data transmission.
 */
class StorageService {
  constructor() {
    this.dbName = 'PersonalAssistantDB';
    this.dbVersion = 1;
    this.storeName = 'transactions';
    this.db = null;
    this.fallbackKey = 'pa_budget_transactions_v1';
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
   * Exports an encrypted or standard backup envelope JSON
   * @returns {Promise<string>} JSON string
   */
  async exportBackup() {
    const transactions = await this.getAllTransactions();
    const envelope = {
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      recordCount: transactions.length,
      data: {
        transactions: transactions,
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
}

// Export singleton instance to window for global modular access
window.storageService = new StorageService();
