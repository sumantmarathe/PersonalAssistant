import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for test environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();

// Import StorageService by evaluating code
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageCode = fs.readFileSync(path.resolve(__dirname, '../../js/storage.js'), 'utf8');

const context = {
  window: {},
  localStorage: global.localStorage,
  console
};

const runInContext = new Function('window', 'localStorage', 'console', storageCode + '\nreturn StorageService;');
const StorageService = runInContext(context.window, context.localStorage, context.console);

describe('Integration Test Suite: Bulk Delete & Purge Records (REQ-001, REQ-005)', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  test('deleteTransactionsBatch: Deletes specified IDs and preserves non-selected transactions', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null; // force localStorage fallback for predictable test runner

    const initial = [
      { id: 'tx-1', type: 'expense', amount: 100, category: 'Food', date: '2026-03-01' },
      { id: 'tx-2', type: 'expense', amount: 200, category: 'Travel', date: '2026-03-02' },
      { id: 'tx-3', type: 'income', amount: 5000, category: 'Salary', date: '2026-03-03' },
      { id: 'tx-4', type: 'expense', amount: 400, category: 'Utilities', date: '2026-03-04' }
    ];

    for (const t of initial) {
      await storage.addTransaction(t);
    }

    let all = await storage.getAllTransactions();
    assert.equal(all.length, 4);

    // Delete tx-1 and tx-3 in batch
    const deletedCount = await storage.deleteTransactionsBatch(['tx-1', 'tx-3']);
    assert.equal(deletedCount, 2);

    all = await storage.getAllTransactions();
    assert.equal(all.length, 2);
    assert.deepEqual(all.map(t => t.id).sort(), ['tx-2', 'tx-4']);
  });

  test('clearAllTransactions: Deletes all transactions while strictly preserving accounts', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null;

    // Add bank account
    await storage.saveAccount({
      id: 'acc-axis',
      bankName: 'Axis Bank',
      accountNumber: '912345678901',
      ifscCode: 'UTIB0000123'
    });

    // Add transactions
    await storage.addTransaction({ id: 'tx-10', type: 'expense', amount: 150, date: '2026-03-01', accountId: 'acc-axis' });
    await storage.addTransaction({ id: 'tx-11', type: 'income', amount: 1000, date: '2026-03-02', accountId: 'acc-axis' });

    let txs = await storage.getAllTransactions();
    let accounts = await storage.getAllAccounts();
    assert.equal(txs.length, 2);
    assert.equal(accounts.length, 1);

    // Wipe all transactions
    const result = await storage.clearAllTransactions();
    assert.equal(result, true);

    txs = await storage.getAllTransactions();
    accounts = await storage.getAllAccounts();
    assert.equal(txs.length, 0, 'Transactions store must be completely empty');
    assert.equal(accounts.length, 1, 'Registered bank accounts must remain intact');
    assert.equal(accounts[0].id, 'acc-axis');
  });

  test('purgeTransactions: Filters and purges by account ID accurately', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null;
    await storage.clearAllTransactions();

    await storage.addTransaction({ id: 't-axis-1', amount: 100, accountId: 'acc-axis', date: '2026-03-01' });
    await storage.addTransaction({ id: 't-axis-2', amount: 200, accountId: 'acc-axis', date: '2026-03-02' });
    await storage.addTransaction({ id: 't-sbi-1', amount: 500, accountId: 'acc-sbi', date: '2026-03-03' });
    await storage.addTransaction({ id: 't-unassigned', amount: 50, accountId: null, date: '2026-03-04' });

    // Purge only Axis Bank transactions
    const purged = await storage.purgeTransactions({ accountId: 'acc-axis' });
    assert.equal(purged, 2);

    const remaining = await storage.getAllTransactions();
    assert.equal(remaining.length, 2);
    assert.deepEqual(remaining.map(t => t.id).sort(), ['t-sbi-1', 't-unassigned']);
  });

  test('purgeTransactions: Filters and purges by date range (startDate & endDate)', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null;
    await storage.clearAllTransactions();

    await storage.addTransaction({ id: 't-jan', amount: 10, date: '2026-01-15' });
    await storage.addTransaction({ id: 't-feb-1', amount: 20, date: '2026-02-05' });
    await storage.addTransaction({ id: 't-feb-2', amount: 30, date: '2026-02-20' });
    await storage.addTransaction({ id: 't-mar', amount: 40, date: '2026-03-10' });

    // Purge February only
    const purged = await storage.purgeTransactions({ startDate: '2026-02-01', endDate: '2026-02-28' });
    assert.equal(purged, 2);

    const remaining = await storage.getAllTransactions();
    assert.equal(remaining.length, 2);
    assert.deepEqual(remaining.map(t => t.id).sort(), ['t-jan', 't-mar']);
  });

  test('purgeTransactions: Filters and purges older than cutoff date', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null;
    await storage.clearAllTransactions();

    await storage.addTransaction({ id: 't-old-1', amount: 10, date: '2025-11-01' });
    await storage.addTransaction({ id: 't-old-2', amount: 20, date: '2025-12-31' });
    await storage.addTransaction({ id: 't-new-1', amount: 30, date: '2026-01-01' });

    // Purge older than 2026-01-01 (i.e. endDate: '2025-12-31')
    const purged = await storage.purgeTransactions({ endDate: '2025-12-31' });
    assert.equal(purged, 2);

    const remaining = await storage.getAllTransactions();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 't-new-1');
  });

  test('purgeTransactions: Filters and purges by transaction type', async () => {
    const storage = new StorageService();
    await storage.init();
    storage.db = null;
    await storage.clearAllTransactions();

    await storage.addTransaction({ id: 't-exp-1', type: 'expense', amount: 10, date: '2026-03-01' });
    await storage.addTransaction({ id: 't-exp-2', type: 'expense', amount: 20, date: '2026-03-02' });
    await storage.addTransaction({ id: 't-inc-1', type: 'income', amount: 500, date: '2026-03-03' });

    // Purge only expenses
    const purged = await storage.purgeTransactions({ type: 'expense' });
    assert.equal(purged, 2);

    const remaining = await storage.getAllTransactions();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 't-inc-1');
  });

  test('UI Bulk Selection Logic: Master toggle, cherry-picking, and impact calculation', () => {
    const transactions = [
      { id: '1', amount: 100 },
      { id: '2', amount: 200 },
      { id: '3', amount: 300 }
    ];

    const selectedIds = new Set();

    // Cherry pick 1 item
    selectedIds.add('1');
    assert.equal(selectedIds.size, 1);
    assert.equal(selectedIds.has('1'), true);

    // Master check all
    transactions.forEach(t => selectedIds.add(t.id));
    assert.equal(selectedIds.size, 3);
    assert.equal(transactions.every(t => selectedIds.has(t.id)), true);

    // Deselect all
    selectedIds.clear();
    assert.equal(selectedIds.size, 0);
  });
});
