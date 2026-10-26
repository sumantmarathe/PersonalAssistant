import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { StatementParser } from '../../js/statementParser.js';

const rootDir = path.resolve();

test('Integration: PDF.js Vendor Assets Bundled for 100% Offline Availability', () => {
  const pdfJsPath = path.join(rootDir, 'js', 'vendor', 'pdf.min.js');
  const pdfWorkerPath = path.join(rootDir, 'js', 'vendor', 'pdf.worker.min.js');

  assert.ok(fs.existsSync(pdfJsPath), 'pdf.min.js must exist in js/vendor/');
  assert.ok(fs.existsSync(pdfWorkerPath), 'pdf.worker.min.js must exist in js/vendor/');

  const jsSize = fs.statSync(pdfJsPath).size;
  const workerSize = fs.statSync(pdfWorkerPath).size;

  assert.ok(jsSize > 100 * 1024, `pdf.min.js must be a valid bundle (>100KB), found: ${jsSize} bytes`);
  assert.ok(workerSize > 500 * 1024, `pdf.worker.min.js must be a valid bundle (>500KB), found: ${workerSize} bytes`);
});

test('Integration: End-to-End Bank Statement Import & Storage Batch Pipeline', async () => {
  const parser = new StatementParser();

  const hdfcBankCSV = `Date,Narration,Chq/Ref No,Value Date,Withdrawal Amt,Deposit Amt,Closing Balance
10/10/2026,UPI/ZOMATO/BANGALORE/0129,0001,10/10/2026,620.00,,99380.00
11/10/2026,SALARY CREDIT OCT 2026,0002,11/10/2026,,120000.00,219380.00
12/10/2026,FASTAG TOLL PLAZA,0003,12/10/2026,180.00,,219200.00
13/10/2026,ZERODHA BROKING LTD DIVIDEND,0004,13/10/2026,,4500.00,223700.00
14/10/2026,BESCOM BANGALORE ELECTRICITY,0005,14/10/2026,2150.00,,221550.00
`;

  // 1. Parse CSV
  const parsed = parser.parseCSV(hdfcBankCSV);
  assert.equal(parsed.length, 5, 'Must extract exactly 5 transactions');

  // 2. Validate categories inferred
  const categories = parsed.map(t => t.category);
  assert.deepEqual(categories, ['Food', 'Salary', 'Transportation', 'Investment', 'Utilities']);

  // 3. Test Duplicate flagging against a mock existing transaction
  const existingLedger = [
    { id: 'tx-001', date: '2026-10-10', amount: 620.0, description: 'UPI/ZOMATO/BANGALORE/0129', type: 'expense' }
  ];

  const flagged = parser.flagDuplicates(parsed, existingLedger);
  assert.equal(flagged[0].isDuplicate, true, 'First item must be flagged as duplicate');
  assert.equal(flagged[0].selected, false, 'Duplicate must be unchecked by default');
  assert.equal(flagged[1].selected, true, 'Non-duplicate must be checked by default');

  // 4. Batch commit simulation
  const selectedEntries = flagged.filter(t => t.selected);
  assert.equal(selectedEntries.length, 4, '4 non-duplicates selected for commit');

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of selectedEntries) {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  assert.equal(totalIncome, 124500.0);
  assert.equal(totalExpense, 2330.0);
  assert.equal(totalIncome - totalExpense, 122170.0);
});

test('Integration: Statement Importer auto-sync linkage calls valid BudgetApp method', () => {
  const budgetAppContent = fs.readFileSync(path.join(rootDir, 'js', 'budgetApp.js'), 'utf8');

  // Verify commitStatementImport does not invoke the non-existent syncToCloudBackground
  assert.ok(!budgetAppContent.includes('syncToCloudBackground'), 'Must not reference undefined syncToCloudBackground method');
  assert.ok(budgetAppContent.includes('this.triggerAutoSync()'), 'Must invoke valid triggerAutoSync method');
});
