import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Pure logic functions extracted for unit verification
function calculateMetrics(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpense += amt;
    }
  }

  // Round to 2 decimal places to avoid standard IEEE 754 float drift
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;

  return { totalIncome, totalExpense, netBalance };
}

function filterTransactions(transactions, filterType, searchQuery) {
  const query = (searchQuery || '').toLowerCase().trim();
  return transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesSearch = !query ||
      (tx.category && tx.category.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });
}

function validateBackupEnvelope(jsonString) {
  try {
    const envelope = JSON.parse(jsonString);
    if (!envelope || typeof envelope !== 'object') {
      return { valid: false, error: 'Envelope must be an object' };
    }
    if (envelope.app !== 'PersonalAssistant-BudgetPlanner') {
      return { valid: false, error: 'Invalid app header' };
    }
    if (!envelope.data || !Array.isArray(envelope.data.transactions)) {
      return { valid: false, error: 'Missing transactions array' };
    }
    return { valid: true, transactions: envelope.data.transactions };
  } catch (e) {
    return { valid: false, error: 'Malformed JSON' };
  }
}

describe('Unit Test Suite: Budget Planner Financial Calculations (REQ-002, REQ-004)', () => {
  test('Calculates balance accurately with basic income and expenses', () => {
    const txs = [
      { id: '1', type: 'income', amount: 5000 },
      { id: '2', type: 'expense', amount: 1200 },
      { id: '3', type: 'expense', amount: 350.50 }
    ];
    const metrics = calculateMetrics(txs);
    assert.equal(metrics.totalIncome, 5000);
    assert.equal(metrics.totalExpense, 1550.50);
    assert.equal(metrics.netBalance, 3449.50);
  });

  test('Handles floating-point decimal additions without precision artifacts', () => {
    const txs = [
      { id: '1', type: 'expense', amount: 0.1 },
      { id: '2', type: 'expense', amount: 0.2 },
      { id: '3', type: 'income', amount: 1.0 }
    ];
    const metrics = calculateMetrics(txs);
    assert.equal(metrics.totalExpense, 0.3);
    assert.equal(metrics.netBalance, 0.7);
  });

  test('Calculates negative net balance when expenses exceed income', () => {
    const txs = [
      { id: '1', type: 'income', amount: 100 },
      { id: '2', type: 'expense', amount: 250 }
    ];
    const metrics = calculateMetrics(txs);
    assert.equal(metrics.netBalance, -150);
  });

  test('Returns zero metrics for empty transaction list', () => {
    const metrics = calculateMetrics([]);
    assert.equal(metrics.totalIncome, 0);
    assert.equal(metrics.totalExpense, 0);
    assert.equal(metrics.netBalance, 0);
  });
});

describe('Unit Test Suite: Ledger Filtering & Search (REQ-005)', () => {
  const sampleData = [
    { id: '1', type: 'income', category: 'Salary', description: 'Tech Corp Monthly' },
    { id: '2', type: 'expense', category: 'Food & Dining', description: 'Trader Joes' },
    { id: '3', type: 'expense', category: 'Utilities', description: 'Electric bill' },
    { id: '4', type: 'income', category: 'Freelance', description: 'Website design' }
  ];

  test('Filters ledger by type "income"', () => {
    const filtered = filterTransactions(sampleData, 'income', '');
    assert.equal(filtered.length, 2);
    assert.equal(filtered.every(t => t.type === 'income'), true);
  });

  test('Filters ledger by type "expense"', () => {
    const filtered = filterTransactions(sampleData, 'expense', '');
    assert.equal(filtered.length, 2);
    assert.equal(filtered.every(t => t.type === 'expense'), true);
  });

  test('Searches by keyword in description or category case-insensitively', () => {
    const searchFood = filterTransactions(sampleData, 'all', 'trader');
    assert.equal(searchFood.length, 1);
    assert.equal(searchFood[0].id, '2');

    const searchSalary = filterTransactions(sampleData, 'all', 'salary');
    assert.equal(searchSalary.length, 1);
    assert.equal(searchSalary[0].id, '1');
  });

  test('Returns empty array when search query matches nothing', () => {
    const filtered = filterTransactions(sampleData, 'all', 'cryptocurrency');
    assert.equal(filtered.length, 0);
  });
});

describe('Unit Test Suite: Backup Envelope Validation (REQ-007)', () => {
  test('Validates a correctly formatted backup envelope', () => {
    const validJson = JSON.stringify({
      app: 'PersonalAssistant-BudgetPlanner',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      recordCount: 1,
      data: {
        transactions: [{ id: '1', type: 'income', amount: 500, category: 'Salary', date: '2026-10-26' }],
        currency: '$'
      }
    });

    const result = validateBackupEnvelope(validJson);
    assert.equal(result.valid, true);
    assert.equal(result.transactions.length, 1);
  });

  test('Rejects malformed JSON strings gracefully', () => {
    const corruptJson = '{ "app": "PersonalAssistant", ';
    const result = validateBackupEnvelope(corruptJson);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'Malformed JSON');
  });

  test('Rejects JSON with wrong application header', () => {
    const wrongAppJson = JSON.stringify({
      app: 'MaliciousApp',
      data: { transactions: [] }
    });
    const result = validateBackupEnvelope(wrongAppJson);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'Invalid app header');
  });
});
