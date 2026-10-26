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

function filterTransactionsByDateAndAccount(transactions, { rangeType = 'all', startDate = null, endDate = null, accountId = 'all' }) {
  return transactions.filter((tx) => {
    // 1. Account filter
    if (accountId && accountId !== 'all' && tx.accountId !== accountId) {
      return false;
    }

    // 2. Date filter
    if (rangeType === 'all' && !startDate && !endDate) {
      return true;
    }

    if (!tx.date) return false;

    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;

    return true;
  });
}

function calculateExpenseStats(transactions, startDate = null, endDate = null) {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};
  const categoryCounts = {};
  const dailyExpenses = {};
  const monthlyTotals = {};
  const expensesList = [];

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    const date = tx.date || '';
    const month = date.substring(0, 7);

    if (tx.type === 'income') {
      totalIncome += amt;
      if (month) {
        monthlyTotals[month] = monthlyTotals[month] || { income: 0, expense: 0 };
        monthlyTotals[month].income += amt;
      }
    } else if (tx.type === 'expense') {
      totalExpense += amt;
      expensesList.push(tx);

      // Category breakdown
      const cat = tx.category || 'General';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Daily peak & trend
      if (date) {
        dailyExpenses[date] = (dailyExpenses[date] || 0) + amt;
        if (month) {
          monthlyTotals[month] = monthlyTotals[month] || { income: 0, expense: 0 };
          monthlyTotals[month].expense += amt;
        }
      }
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;

  // Calculate day span for daily average
  let daySpan = 1;
  if (startDate && endDate) {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    daySpan = diff;
  } else if (Object.keys(dailyExpenses).length > 0) {
    const dates = Object.keys(dailyExpenses).sort();
    const d1 = new Date(dates[0]);
    const d2 = new Date(dates[dates.length - 1]);
    daySpan = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  }
  const dailyAverageSpend = Math.round((totalExpense / daySpan) * 100) / 100;

  // Peak Spending Day
  let peakDay = { date: 'N/A', amount: 0 };
  for (const [day, amt] of Object.entries(dailyExpenses)) {
    if (amt > peakDay.amount) {
      peakDay = { date: day, amount: Math.round(amt * 100) / 100 };
    }
  }

  // Category Breakdown sorted descending
  const categoryBreakdown = Object.keys(categoryTotals).map((cat) => {
    const amt = Math.round(categoryTotals[cat] * 100) / 100;
    const count = categoryCounts[cat] || 0;
    const percentage = totalExpense > 0 ? Math.round((amt / totalExpense) * 1000) / 10 : 0;
    return { category: cat, amount: amt, count, percentage };
  }).sort((a, b) => b.amount - a.amount);

  // Top 5 Largest Expenses
  expensesList.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const top5Expenses = expensesList.slice(0, 5);

  // Time trend: monthly if > 31 days or day-by-day if <= 31 days
  let timeTrend = [];
  if (daySpan > 31) {
    timeTrend = Object.keys(monthlyTotals).sort().map(m => ({
      period: m,
      income: Math.round(monthlyTotals[m].income * 100) / 100,
      expense: Math.round(monthlyTotals[m].expense * 100) / 100
    }));
  } else {
    timeTrend = Object.keys(dailyExpenses).sort().map(d => ({
      period: d,
      income: 0,
      expense: Math.round(dailyExpenses[d] * 100) / 100
    }));
  }

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    daySpan,
    dailyAverageSpend,
    peakSpendingDay: peakDay,
    categoryBreakdown,
    top5Expenses,
    timeTrend
  };
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

describe('Unit Test Suite: Date & Multi-Account Filtering (Analytics & Accounts Feature)', () => {
  const dataset = [
    { id: '1', date: '2026-01-15', amount: 50000, type: 'income', category: 'Salary', accountId: 'acc_sbi' },
    { id: '2', date: '2026-05-10', amount: 1500, type: 'expense', category: 'Shopping', accountId: 'acc_axis' },
    { id: '3', date: '2026-10-12', amount: 450, type: 'expense', category: 'Food & Dining', accountId: 'acc_sbi' },
    { id: '4', date: '2026-10-15', amount: 320, type: 'expense', category: 'Transportation', accountId: 'acc_axis' },
    { id: '5', date: '2025-11-20', amount: 8000, type: 'expense', category: 'Rent', accountId: 'acc_sbi' }
  ];

  test('Filters by specific account ID accurately', () => {
    const sbiOnly = filterTransactionsByDateAndAccount(dataset, { accountId: 'acc_sbi' });
    assert.equal(sbiOnly.length, 3);
    assert.ok(sbiOnly.every(t => t.accountId === 'acc_sbi'));

    const axisOnly = filterTransactionsByDateAndAccount(dataset, { accountId: 'acc_axis' });
    assert.equal(axisOnly.length, 2);
    assert.ok(axisOnly.every(t => t.accountId === 'acc_axis'));
  });

  test('Filters by custom date range accurately', () => {
    const oct2026 = filterTransactionsByDateAndAccount(dataset, {
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });
    assert.equal(oct2026.length, 2);
    assert.deepEqual(oct2026.map(t => t.id), ['3', '4']);
  });

  test('Combines account filter and date range filter concurrently', () => {
    const filtered = filterTransactionsByDateAndAccount(dataset, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      accountId: 'acc_sbi'
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '3');
  });
});

describe('Unit Test Suite: Expense Analytics Statistics Calculations', () => {
  const transactions = [
    { id: 't1', date: '2026-10-01', type: 'income', amount: 100000, category: 'Salary' },
    { id: 't2', date: '2026-10-05', type: 'expense', amount: 25000, category: 'Housing' },
    { id: 't3', date: '2026-10-10', type: 'expense', amount: 3500, category: 'Food & Dining' },
    { id: 't4', date: '2026-10-10', type: 'expense', amount: 1500, category: 'Food & Dining' },
    { id: 't5', date: '2026-10-15', type: 'expense', amount: 12000, category: 'Shopping' },
    { id: 't6', date: '2026-10-20', type: 'expense', amount: 2000, category: 'Utilities' }
  ];

  test('Calculates total expenses, net savings, and savings rate percentage', () => {
    const stats = calculateExpenseStats(transactions, '2026-10-01', '2026-10-31');
    assert.equal(stats.totalIncome, 100000);
    assert.equal(stats.totalExpense, 44000);
    assert.equal(stats.netSavings, 56000);
    assert.equal(stats.savingsRate, 56.0); // 56%
  });

  test('Calculates peak spending day with grouped date amounts', () => {
    const stats = calculateExpenseStats(transactions, '2026-10-01', '2026-10-31');
    // On 2026-10-05, expense is 25000 (highest single day)
    assert.equal(stats.peakSpendingDay.date, '2026-10-05');
    assert.equal(stats.peakSpendingDay.amount, 25000);
  });

  test('Calculates daily average spend over the specified day span', () => {
    const stats = calculateExpenseStats(transactions, '2026-10-01', '2026-10-31');
    assert.equal(stats.daySpan, 31);
    // 44000 / 31 = 1419.35
    assert.equal(stats.dailyAverageSpend, 1419.35);
  });

  test('Produces ordered Category Breakdown with sums and percentages', () => {
    const stats = calculateExpenseStats(transactions, '2026-10-01', '2026-10-31');
    assert.equal(stats.categoryBreakdown.length, 4);
    assert.equal(stats.categoryBreakdown[0].category, 'Housing');
    assert.equal(stats.categoryBreakdown[0].amount, 25000);
    assert.equal(stats.categoryBreakdown[1].category, 'Shopping');
    assert.equal(stats.categoryBreakdown[1].amount, 12000);
    assert.equal(stats.categoryBreakdown[2].category, 'Food & Dining');
    assert.equal(stats.categoryBreakdown[2].amount, 5000);
    assert.equal(stats.categoryBreakdown[2].count, 2);
  });

  test('Identifies Top 5 Largest Single Expense Transactions', () => {
    const stats = calculateExpenseStats(transactions, '2026-10-01', '2026-10-31');
    assert.equal(stats.top5Expenses.length, 5);
    assert.equal(stats.top5Expenses[0].id, 't2');
    assert.equal(stats.top5Expenses[0].amount, 25000);
    assert.equal(stats.top5Expenses[1].id, 't5');
    assert.equal(stats.top5Expenses[1].amount, 12000);
  });
});

