// tests/integration/analytics_and_multi_account.test.mjs
// Integration Test Suite: Multi-Account Management & Expense Analytics Statistics

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../../js/storage.js';
import { StatementParser } from '../../js/statementParser.js';

function filterTransactionsByDateAndAccount(transactions, startDate, endDate, accountId = 'all') {
  return transactions.filter(t => {
    if (accountId && accountId !== 'all') {
      if (t.accountId !== accountId) return false;
    }
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });
}

function calculateExpenseStats(transactions, startDate, endDate) {
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap = {};
  const dayMap = {};
  const expenseList = [];

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'expense') {
      totalExpense += amt;
      expenseList.push(t);
      categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
      dayMap[t.date] = (dayMap[t.date] || 0) + amt;
    } else if (t.type === 'income') {
      totalIncome += amt;
    }
  }

  totalExpense = Math.round(totalExpense * 100) / 100;
  totalIncome = Math.round(totalIncome * 100) / 100;
  const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;

  let peakDay = { date: null, amount: 0 };
  for (const [date, amt] of Object.entries(dayMap)) {
    if (amt > peakDay.amount) {
      peakDay = { date, amount: Math.round(amt * 100) / 100 };
    }
  }

  let dayCount = 1;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    dayCount = Math.max(1, diff);
  } else {
    dayCount = Math.max(1, Object.keys(dayMap).length);
  }
  const dailyAverage = Math.round((totalExpense / dayCount) * 10) / 10;

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      total: Math.round(amount * 100) / 100,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const topExpenses = [...expenseList]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  return {
    totalExpense,
    totalIncome,
    netSavings,
    savingsRate,
    peakDay,
    dailyAverage,
    categoryBreakdown,
    topExpenses
  };
}

describe('Integration Test Suite: Multi-Account Management & Storage Persistence', () => {
  let mockStorage;
  let storage;

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => { mockStorage[key] = String(val); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    storage = new StorageService();
  });

  test('Persists, retrieves, and updates multiple bank accounts', async () => {
    const sbiAccount = {
      id: 'acc_sbi_01',
      bankName: 'State Bank of India',
      accountNumber: '12345678901',
      ifscCode: 'SBIN0001234',
      accountType: 'savings',
      nickname: 'SBI Salary A/C',
      isDefault: true,
      createdAt: '2026-01-01T10:00:00.000Z'
    };

    const axisAccount = {
      id: 'acc_axis_02',
      bankName: 'Axis Bank',
      accountNumber: '918020012345678',
      ifscCode: 'UTIB0000045',
      accountType: 'current',
      nickname: 'Axis Business A/C',
      isDefault: false,
      createdAt: '2026-01-05T10:00:00.000Z'
    };

    await storage.saveAccount(sbiAccount);
    await storage.saveAccount(axisAccount);

    let accounts = await storage.getAllAccounts();
    assert.strictEqual(accounts.length, 2);
    assert.strictEqual(accounts.find(a => a.id === 'acc_sbi_01').bankName, 'State Bank of India');
    assert.strictEqual(accounts.find(a => a.id === 'acc_axis_02').bankName, 'Axis Bank');

    // Update Axis account nickname
    const updatedAxis = { ...axisAccount, nickname: 'Axis Primary Business' };
    await storage.saveAccount(updatedAxis);

    accounts = await storage.getAllAccounts();
    assert.strictEqual(accounts.length, 2);
    assert.strictEqual(accounts.find(a => a.id === 'acc_axis_02').nickname, 'Axis Primary Business');

    // Delete SBI account
    await storage.deleteAccount('acc_sbi_01');
    accounts = await storage.getAllAccounts();
    assert.strictEqual(accounts.length, 1);
    assert.strictEqual(accounts[0].id, 'acc_axis_02');
  });

  test('Backup and restore envelope preserves accounts and accountId mapping', async () => {
    const account = {
      id: 'acc_test_99',
      bankName: 'HDFC Bank',
      accountNumber: '50100012345678',
      ifscCode: 'HDFC0000060',
      accountType: 'savings',
      nickname: 'HDFC Savings',
      isDefault: true,
      createdAt: '2026-02-01T10:00:00.000Z'
    };
    await storage.saveAccount(account);

    const tx = {
      id: 'tx_acc_01',
      date: '2026-02-15',
      type: 'expense',
      amount: 4500,
      category: 'Utilities',
      description: 'Electricity Bill',
      accountId: 'acc_test_99',
      createdAt: '2026-02-15T10:00:00.000Z'
    };
    await storage.addTransaction(tx);

    const backupJson = await storage.exportBackup();
    const backupObj = JSON.parse(backupJson);

    assert.strictEqual(backupObj.version, '1.1.0');
    assert.ok(Array.isArray(backupObj.data.accounts));
    assert.strictEqual(backupObj.data.accounts.length, 1);
    assert.strictEqual(backupObj.data.accounts[0].id, 'acc_test_99');
    assert.strictEqual(backupObj.data.transactions[0].accountId, 'acc_test_99');

    // Clear storage and restore from backup
    mockStorage = {};
    const importRes = await storage.importBackup(backupJson);
    assert.strictEqual(importRes.success, true);
    assert.strictEqual(importRes.count, 1);

    const restoredAccounts = await storage.getAllAccounts();
    assert.strictEqual(restoredAccounts.length, 1);
    assert.strictEqual(restoredAccounts[0].bankName, 'HDFC Bank');

    const restoredTxs = await storage.getAllTransactions();
    assert.strictEqual(restoredTxs[0].accountId, 'acc_test_99');
  });
});

describe('Integration Test Suite: Statement Account Auto-Detection & Mapping', () => {
  test('Extracts account number and IFSC from CSV and matches existing account', () => {
    const csvContent = `Bank Statement - Axis Bank
Account Number: 918020012345678
IFSC Code: UTIB0000045
Date,Narration,Withdrawal,Deposit,Balance
2026-03-01,AMAZON INDIA,2499.00,,50000.00
2026-03-05,SALARY MARCH,,85000.00,135000.00`;

    const parser = new StatementParser();
    const result = parser.parseCSV(csvContent);
    assert.strictEqual(result.metadata.bankName, 'Axis Bank');
    assert.strictEqual(result.metadata.ifscCode, 'UTIB0000045');
    assert.strictEqual(result.metadata.accountNumber, '918020012345678');
    assert.strictEqual(result.length, 2);
  });
});

describe('Integration Test Suite: Filter & Expense Analytics Calculations', () => {
  const dataset = [
    { id: '1', date: '2026-01-10', type: 'income', amount: 90000, category: 'Salary', description: 'Monthly Salary', accountId: 'acc_sbi' },
    { id: '2', date: '2026-01-12', type: 'expense', amount: 25000, category: 'Housing', description: 'House Rent', accountId: 'acc_sbi' },
    { id: '3', date: '2026-01-15', type: 'expense', amount: 6500, category: 'Food & Dining', description: 'Grocery Store', accountId: 'acc_axis' },
    { id: '4', date: '2026-01-20', type: 'expense', amount: 3500, category: 'Transportation', description: 'Fuel & Uber', accountId: 'acc_sbi' },
    { id: '5', date: '2026-01-20', type: 'expense', amount: 8000, category: 'Food & Dining', description: 'Family Dinner & Swiggy', accountId: 'acc_axis' },
    { id: '6', date: '2026-02-05', type: 'expense', amount: 15000, category: 'Healthcare', description: 'Dental Clinic', accountId: 'acc_axis' }
  ];

  test('Filters dataset concurrently by date range and account', () => {
    // January only, all accounts
    const janAll = filterTransactionsByDateAndAccount(dataset, '2026-01-01', '2026-01-31', 'all');
    assert.strictEqual(janAll.length, 5);

    // January only, SBI account only
    const janSbi = filterTransactionsByDateAndAccount(dataset, '2026-01-01', '2026-01-31', 'acc_sbi');
    assert.strictEqual(janSbi.length, 3);
    assert.ok(janSbi.every(tx => tx.accountId === 'acc_sbi'));

    // January only, Axis account only
    const janAxis = filterTransactionsByDateAndAccount(dataset, '2026-01-01', '2026-01-31', 'acc_axis');
    assert.strictEqual(janAxis.length, 2);
    assert.ok(janAxis.every(tx => tx.accountId === 'acc_axis'));
  });

  test('Calculates full statistics metrics accurately for January', () => {
    const janTransactions = filterTransactionsByDateAndAccount(dataset, '2026-01-01', '2026-01-31', 'all');
    const stats = calculateExpenseStats(janTransactions, '2026-01-01', '2026-01-31');

    // Total income: 90000
    // Total expenses: 25000 + 6500 + 3500 + 8000 = 43000
    assert.strictEqual(stats.totalIncome, 90000);
    assert.strictEqual(stats.totalExpense, 43000);
    assert.strictEqual(stats.netSavings, 47000);
    // Savings rate: 47000 / 90000 * 100 = 52.22%
    assert.strictEqual(stats.savingsRate, 52.2);

    // Peak spending day: 2026-01-12 (25000) vs 2026-01-20 (3500 + 8000 = 11500)
    assert.strictEqual(stats.peakDay.date, '2026-01-12');
    assert.strictEqual(stats.peakDay.amount, 25000);

    // Daily average spend across 31 days: 43000 / 31 = 1387.1
    assert.strictEqual(stats.dailyAverage, 1387.1);

    // Top 5 largest expenses:
    assert.strictEqual(stats.topExpenses.length, 4);
    assert.strictEqual(stats.topExpenses[0].amount, 25000);
    assert.strictEqual(stats.topExpenses[0].category, 'Housing');
    assert.strictEqual(stats.topExpenses[1].amount, 8000);
    assert.strictEqual(stats.topExpenses[1].category, 'Food & Dining');

    // Category breakdown:
    // Housing: 25000 (58.1%)
    // Food & Dining: 14500 (33.7%)
    // Transportation: 3500 (8.1%)
    assert.strictEqual(stats.categoryBreakdown.length, 3);
    assert.strictEqual(stats.categoryBreakdown[0].category, 'Housing');
    assert.strictEqual(stats.categoryBreakdown[0].total, 25000);
    assert.strictEqual(stats.categoryBreakdown[0].percentage, 58.1);
    assert.strictEqual(stats.categoryBreakdown[1].category, 'Food & Dining');
    assert.strictEqual(stats.categoryBreakdown[1].total, 14500);
    assert.strictEqual(stats.categoryBreakdown[1].percentage, 33.7);
  });
});
