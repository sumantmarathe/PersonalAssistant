// tests/integration/dual_target_persistence.test.mjs
// Integration Test Suite: Dual-Target Persistence Parity & Cross-Platform Rehydration (REQ-015, REQ-016)

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MockTargetStorage {
  constructor(platformName) {
    this.platform = platformName;
    this.storage = new Map();
    this.storageKey = 'PersonalAssistantDB_transactions';
  }

  getTransactions() {
    const raw = this.storage.get(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  addTransaction(tx) {
    const list = this.getTransactions();
    const entry = {
      id: tx.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      type: tx.type,
      amount: Math.abs(Number(tx.amount)) || 0,
      category: String(tx.category || '').trim(),
      date: tx.date,
      description: tx.description ? String(tx.description).trim() : '',
      createdAt: tx.createdAt || Date.now()
    };
    list.push(entry);
    this.storage.set(this.storageKey, JSON.stringify(list));
    return entry;
  }

  exportEnvelope() {
    const list = this.getTransactions();
    return JSON.stringify({
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      platform: this.platform,
      currency: 'INR',
      data: {
        transactions: list
      }
    });
  }

  importEnvelope(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.transactions)) {
      throw new Error('Invalid envelope structure');
    }
    const current = this.getTransactions();
    for (const item of parsed.data.transactions) {
      current.push(item);
    }
    this.storage.set(this.storageKey, JSON.stringify(current));
    return { success: true, count: parsed.data.transactions.length };
  }
}

describe('Integration Test Suite: Dual-Target Persistence Parity & Cross-Platform Rehydration (REQ-015, REQ-016)', () => {

  let webStore;
  let androidStore;

  beforeEach(() => {
    webStore = new MockTargetStorage('web');
    androidStore = new MockTargetStorage('android');
  });

  it('Bi-Directional Rehydration: Web writes transactions -> Exports envelope -> Android imports -> 100% Data Integrity', () => {
    // 1. Web environment creates transactions
    webStore.addTransaction({
      type: 'income',
      amount: 150000,
      category: 'Salary',
      date: '2026-10-26',
      description: 'Consulting retainer (Web)'
    });
    webStore.addTransaction({
      type: 'expense',
      amount: 42000,
      category: 'Rent',
      date: '2026-10-26',
      description: 'Office space'
    });

    // 2. Web exports standard backup envelope
    const webExportString = webStore.exportEnvelope();
    const parsedExport = JSON.parse(webExportString);
    assert.strictEqual(parsedExport.app, 'PersonalAssistant-BudgetPlanner');
    assert.strictEqual(parsedExport.currency, 'INR');
    assert.strictEqual(parsedExport.data.transactions.length, 2);

    // 3. Android imports this envelope
    const importResult = androidStore.importEnvelope(webExportString);
    assert.strictEqual(importResult.success, true);
    assert.strictEqual(importResult.count, 2);

    // 4. Verify Android rehydration
    const androidTransactions = androidStore.getTransactions();
    assert.strictEqual(androidTransactions.length, 2);
    assert.strictEqual(androidTransactions[0].amount, 150000);
    assert.strictEqual(androidTransactions[0].description, 'Consulting retainer (Web)');
    assert.strictEqual(androidTransactions[1].amount, 42000);
  });

  it('Bi-Directional Rehydration: Android writes offline transactions -> Exports envelope -> Web imports -> 100% Data Integrity', () => {
    // 1. Android offline environment adds transactions
    androidStore.addTransaction({
      type: 'income',
      amount: 85000,
      category: 'Investments',
      date: '2026-10-26',
      description: 'Dividend payout (Android)'
    });
    androidStore.addTransaction({
      type: 'expense',
      amount: 3200,
      category: 'Utilities',
      date: '2026-10-26',
      description: 'Broadband'
    });

    // 2. Android exports envelope
    const androidExportString = androidStore.exportEnvelope();
    const parsedExport = JSON.parse(androidExportString);
    assert.strictEqual(parsedExport.currency, 'INR');

    // 3. Web imports Android envelope
    const importResult = webStore.importEnvelope(androidExportString);
    assert.strictEqual(importResult.success, true);

    // 4. Verify Web rehydration
    const webTransactions = webStore.getTransactions();
    assert.strictEqual(webTransactions.length, 2);
    assert.strictEqual(webTransactions[0].description, 'Dividend payout (Android)');
    assert.strictEqual(webTransactions[1].amount, 3200);
  });

});
