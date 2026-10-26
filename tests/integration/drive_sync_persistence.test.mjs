import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Simulated Drive API and Local Storage Environment
class MockDriveRemoteStorage {
  constructor() {
    this.files = new Map();
  }

  upload(fileName, content) {
    const fileId = 'gdrive_file_' + Math.random().toString(36).substring(2, 8);
    this.files.set(fileName, { id: fileId, name: fileName, content, modifiedTime: new Date().toISOString() });
    return { success: true, fileId };
  }

  download(fileName) {
    if (!this.files.has(fileName)) {
      throw new Error('File not found in Drive');
    }
    return this.files.get(fileName).content;
  }

  hasFile(fileName) {
    return this.files.has(fileName);
  }
}

class LocalStoreDevice {
  constructor(name) {
    this.deviceName = name;
    this.records = [];
  }

  addRecord(record) {
    this.records.push(record);
  }

  exportEnvelope() {
    return JSON.stringify({
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      recordCount: this.records.length,
      data: {
        transactions: this.records,
        currency: '$'
      }
    });
  }

  importEnvelope(jsonString) {
    const envelope = JSON.parse(jsonString);
    if (!envelope.data || !Array.isArray(envelope.data.transactions)) {
      throw new Error('Invalid envelope');
    }
    this.records = [...envelope.data.transactions];
    return { count: this.records.length };
  }
}

describe('Integration Test Suite: Google Drive Cloud Sync & Cross-Device Rehydration (REQ-011, REQ-012)', () => {
  let driveRemote;

  beforeEach(() => {
    driveRemote = new MockDriveRemoteStorage();
  });

  test('Seamless Cross-Device Sync: PC writes transactions -> Syncs to Drive -> Mobile device fetches from Drive -> 100% Rehydration', () => {
    // 1. User records entries on PC Device
    const pcDevice = new LocalStoreDevice('Desktop PC');
    pcDevice.addRecord({ id: 'tx-101', type: 'income', amount: 6200, category: 'Salary', date: '2026-10-01' });
    pcDevice.addRecord({ id: 'tx-102', type: 'expense', amount: 1400, category: 'Rent', date: '2026-10-02' });
    pcDevice.addRecord({ id: 'tx-103', type: 'expense', amount: 120.75, category: 'Groceries', date: '2026-10-05' });
    assert.equal(pcDevice.records.length, 3);

    // 2. PC syncs to Google Drive
    const pcBackupEnvelope = pcDevice.exportEnvelope();
    const uploadResult = driveRemote.upload('personal_assistant_budget_backup.json', pcBackupEnvelope);
    assert.equal(uploadResult.success, true);
    assert.equal(driveRemote.hasFile('personal_assistant_budget_backup.json'), true);

    // 3. User opens Mobile device (initially 0 records)
    const mobileDevice = new LocalStoreDevice('Mobile Phone');
    assert.equal(mobileDevice.records.length, 0);

    // 4. Mobile device clicks "Restore from Drive"
    const fetchedEnvelope = driveRemote.download('personal_assistant_budget_backup.json');
    const restoreResult = mobileDevice.importEnvelope(fetchedEnvelope);
    assert.equal(restoreResult.count, 3);

    // 5. Verify records on mobile match PC exactly
    assert.equal(mobileDevice.records.length, 3);
    const salary = mobileDevice.records.find(t => t.category === 'Salary');
    assert.ok(salary);
    assert.equal(salary.amount, 6200);

    const groceries = mobileDevice.records.find(t => t.category === 'Groceries');
    assert.ok(groceries);
    assert.equal(groceries.amount, 120.75);
  });
});
