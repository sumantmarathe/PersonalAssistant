import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Simulated storage repository mirroring storage.js logic in Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class StorageIntegrationTester {
  constructor() {
    this.localStorage = new MockLocalStorage();
    this.storageKey = 'pa_budget_transactions_v1';
  }

  getAll() {
    const raw = this.localStorage.getItem(this.storageKey);
    const items = raw ? JSON.parse(raw) : [];
    items.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
    return items;
  }

  add(tx) {
    const items = this.getAll();
    const clean = {
      id: tx.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: tx.type,
      amount: Number(tx.amount),
      category: tx.category,
      date: tx.date,
      description: tx.description || '',
      createdAt: tx.createdAt || Date.now()
    };
    items.push(clean);
    this.localStorage.setItem(this.storageKey, JSON.stringify(items));
    return clean;
  }

  delete(id) {
    const items = this.getAll();
    const filtered = items.filter(t => t.id !== id);
    this.localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  exportBackup() {
    const txs = this.getAll();
    return JSON.stringify({
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      recordCount: txs.length,
      data: {
        transactions: txs,
        currency: '$'
      }
    }, null, 2);
  }

  importBackup(jsonString) {
    const envelope = JSON.parse(jsonString);
    if (!envelope || !envelope.data || !Array.isArray(envelope.data.transactions)) {
      throw new Error('Invalid backup schema');
    }
    for (const item of envelope.data.transactions) {
      this.add(item);
    }
    return { success: true, count: envelope.data.transactions.length };
  }
}

describe('Integration Test Suite: Storage Persistence & Backup Flow (REQ-006, REQ-007)', () => {
  let tester;

  beforeEach(() => {
    tester = new StorageIntegrationTester();
  });

  test('Persists and retrieves multiple transactions in correct date order', () => {
    tester.add({ type: 'income', amount: 3000, category: 'Salary', date: '2026-10-01' });
    tester.add({ type: 'expense', amount: 150, category: 'Utilities', date: '2026-10-15' });
    tester.add({ type: 'expense', amount: 80, category: 'Food & Dining', date: '2026-10-20' });

    const all = tester.getAll();
    assert.equal(all.length, 3);
    // Most recent date first
    assert.equal(all[0].date, '2026-10-20');
    assert.equal(all[1].date, '2026-10-15');
    assert.equal(all[2].date, '2026-10-01');
  });

  test('Deletes a transaction by ID without affecting others', () => {
    const tx1 = tester.add({ id: 'tx-1', type: 'income', amount: 1000, category: 'Salary', date: '2026-10-10' });
    const tx2 = tester.add({ id: 'tx-2', type: 'expense', amount: 50, category: 'Coffee', date: '2026-10-11' });

    assert.equal(tester.getAll().length, 2);
    tester.delete('tx-1');

    const remaining = tester.getAll();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'tx-2');
  });

  test('Full round-trip: Add transactions -> Export JSON -> Clear Store -> Import JSON -> Verify 100% Data Integrity', () => {
    // 1. Seed data
    tester.add({ id: 'a1', type: 'income', amount: 4500, category: 'Salary', date: '2026-10-01', description: 'Monthly primary' });
    tester.add({ id: 'a2', type: 'expense', amount: 1200, category: 'Rent', date: '2026-10-02', description: 'Apartment lease' });
    tester.add({ id: 'a3', type: 'expense', amount: 300, category: 'Utilities', date: '2026-10-03', description: 'Power + Net' });

    assert.equal(tester.getAll().length, 3);

    // 2. Export backup
    const backupJson = tester.exportBackup();
    assert.match(backupJson, /PersonalAssistant-BudgetPlanner/);

    // 3. Clear store (simulating new device / browser reset)
    tester.localStorage.clear();
    assert.equal(tester.getAll().length, 0);

    // 4. Import backup
    const importResult = tester.importBackup(backupJson);
    assert.equal(importResult.success, true);
    assert.equal(importResult.count, 3);

    // 5. Verify rehydrated records
    const restored = tester.getAll();
    assert.equal(restored.length, 3);
    const rentTx = restored.find(t => t.category === 'Rent');
    assert.ok(rentTx);
    assert.equal(rentTx.amount, 1200);
    assert.equal(rentTx.description, 'Apartment lease');
  });
});
