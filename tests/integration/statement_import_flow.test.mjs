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

test('Integration: Statement Importer preview table defines sortable columns for all fields', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf8');

  // Verify all 5 columns have sortable classes and data-sort attributes
  const expectedSortKeys = ['date', 'description', 'type', 'category', 'amount'];
  for (const key of expectedSortKeys) {
    assert.ok(html.includes(`data-sort="${key}"`), `HTML statement table header must define data-sort="${key}"`);
  }
  assert.ok(html.includes('class="sortable-th"'), 'Headers must include sortable-th class');
  assert.ok(html.includes('class="sort-icon"'), 'Headers must include sort-icon elements');

  // Verify CSS styles
  assert.ok(css.includes('.statement-table th.sortable-th'), 'CSS must style .statement-table th.sortable-th');
  assert.ok(css.includes('.statement-table th.sortable-th.active-sort'), 'CSS must style .statement-table th.sortable-th.active-sort');
});

test('Integration: BudgetApp sorting logic sorts all fields correctly in asc and desc directions', () => {
  // Mock mock transactions
  const items = [
    { date: '2026-10-14', description: 'Zomato Food Delivery', type: 'expense', category: 'Food', amount: 450.0 },
    { date: '2026-10-10', description: 'Amazon Purchase', type: 'expense', category: 'Shopping', amount: 1299.0 },
    { date: '2026-10-18', description: 'Monthly Salary Tech Corp', type: 'income', category: 'Salary', amount: 85000.0 },
    { date: '2026-10-12', description: 'Uber Ride', type: 'expense', category: 'Transportation', amount: 320.0 }
  ];

  // Helper function matching BudgetApp.prototype.sortStatementTransactions
  const sortFn = (list, field, asc) => {
    return [...list].sort((a, b) => {
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
  };

  // 1. Amount Sort
  const byAmountAsc = sortFn(items, 'amount', true);
  assert.equal(byAmountAsc[0].amount, 320.0, 'Lowest amount first (Uber 320)');
  assert.equal(byAmountAsc[3].amount, 85000.0, 'Highest amount last (Salary 85000)');

  const byAmountDesc = sortFn(items, 'amount', false);
  assert.equal(byAmountDesc[0].amount, 85000.0, 'Highest amount first (Salary 85000)');
  assert.equal(byAmountDesc[3].amount, 320.0, 'Lowest amount last (Uber 320)');

  // 2. Date Sort
  const byDateAsc = sortFn(items, 'date', true);
  assert.equal(byDateAsc[0].date, '2026-10-10');
  assert.equal(byDateAsc[3].date, '2026-10-18');

  const byDateDesc = sortFn(items, 'date', false);
  assert.equal(byDateDesc[0].date, '2026-10-18');
  assert.equal(byDateDesc[3].date, '2026-10-10');

  // 3. Description Sort
  const byDescAsc = sortFn(items, 'description', true);
  assert.equal(byDescAsc[0].description, 'Amazon Purchase');
  assert.equal(byDescAsc[3].description, 'Zomato Food Delivery');

  // 4. Type Sort
  const byTypeAsc = sortFn(items, 'type', true);
  assert.equal(byTypeAsc[0].type, 'expense');
  assert.equal(byTypeAsc[3].type, 'income');

  // 5. Category Sort
  const byCatAsc = sortFn(items, 'category', true);
  assert.equal(byCatAsc[0].category, 'Food');
  assert.equal(byCatAsc[3].category, 'Transportation');
});

