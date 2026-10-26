import test from 'node:test';
import assert from 'node:assert/strict';
import { StatementParser } from '../../js/statementParser.js';

const parser = new StatementParser();

test('StatementParser: Date Normalization', () => {
  assert.equal(parser.parseDate('15/10/2026'), '2026-10-15', 'DD/MM/YYYY format');
  assert.equal(parser.parseDate('05-08-2025'), '2025-08-05', 'DD-MM-YYYY format');
  assert.equal(parser.parseDate('25-Jan-2026'), '2026-01-25', 'DD-MMM-YYYY format');
  assert.equal(parser.parseDate('12 Oct 2026'), '2026-10-12', 'DD MMM YYYY format');
  assert.equal(parser.parseDate('2026-10-18'), '2026-10-18', 'YYYY-MM-DD ISO format');
  assert.equal(parser.parseDate('01/04/26'), '2026-04-01', 'DD/MM/YY format');
});

test('StatementParser: Amount Parsing & Normalization', () => {
  assert.equal(parser.parseAmount('1,250.50'), 1250.5);
  assert.equal(parser.parseAmount('₹ 50,000.00'), 50000.0);
  assert.equal(parser.parseAmount('Rs. 1,00,000.00'), 100000.0);
  assert.equal(parser.parseAmount('450.00 Dr'), 450.0);
  assert.equal(parser.parseAmount('12,345.67 Cr'), 12345.67);
  assert.equal(parser.parseAmount(999.99), 999.99);
});

test('StatementParser: Smart Category Inference', () => {
  assert.equal(parser.suggestCategory('UPI-SWIGGY-BANGALORE', 'expense'), 'Food');
  assert.equal(parser.suggestCategory('ZOMATO ORDER #1234', 'expense'), 'Food');
  assert.equal(parser.suggestCategory('UBER TRIP HYDERABAD', 'expense'), 'Transportation');
  assert.equal(parser.suggestCategory('IOCL PETROL PUMP MUMBAI', 'expense'), 'Transportation');
  assert.equal(parser.suggestCategory('AMAZON PAY INDIA', 'expense'), 'Shopping');
  assert.equal(parser.suggestCategory('AIRTEL BROADBAND BILL', 'expense'), 'Utilities');
  assert.equal(parser.suggestCategory('OCTOBER SALARY CREDITED', 'income'), 'Salary');
  assert.equal(parser.suggestCategory('ZERODHA BROKING DIVIDEND', 'income'), 'Investment');
  assert.equal(parser.suggestCategory('MISC TRANSFER 98765', 'expense'), 'General');
});

test('StatementParser: Standard Bank CSV Parsing', () => {
  const sampleCSV = `Txn Date,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Closing Balance
15/10/2026,UPI-SWIGGY RESTAURANT,REF12345,450.00,,49550.00
16/10/2026,SALARY TECH CORP,REF12346,,85000.00,134550.00
18/10/2026,UBER RIDE CITY,REF12347,320.50,,134229.50
`;

  const parsed = parser.parseCSV(sampleCSV);
  assert.equal(parsed.length, 3, 'Must extract 3 transactions');

  // Transaction 1: Swiggy
  assert.equal(parsed[0].date, '2026-10-15');
  assert.equal(parsed[0].amount, 450.0);
  assert.equal(parsed[0].type, 'expense');
  assert.equal(parsed[0].category, 'Food');

  // Transaction 2: Salary
  assert.equal(parsed[1].date, '2026-10-16');
  assert.equal(parsed[1].amount, 85000.0);
  assert.equal(parsed[1].type, 'income');
  assert.equal(parsed[1].category, 'Salary');

  // Transaction 3: Uber
  assert.equal(parsed[2].date, '2026-10-18');
  assert.equal(parsed[2].amount, 320.5);
  assert.equal(parsed[2].type, 'expense');
  assert.equal(parsed[2].category, 'Transportation');
});

test('StatementParser: CSV with Quoted Commas & Multi-line Narrations', () => {
  const complexCSV = `"Date","Description","Debit","Credit"
"2026-10-20","Amazon Retail, Electronics order #999","1,499.00",""
"2026-10-21","Dividend from TCS, Infosys","","3,250.00"
`;

  const parsed = parser.parseCSV(complexCSV);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].description, 'Amazon Retail, Electronics order #999');
  assert.equal(parsed[0].amount, 1499.0);
  assert.equal(parsed[0].type, 'expense');
  assert.equal(parsed[0].category, 'Shopping');

  assert.equal(parsed[1].amount, 3250.0);
  assert.equal(parsed[1].type, 'income');
  assert.equal(parsed[1].category, 'Investment');
});

test('StatementParser: Duplicate Transaction Detection', () => {
  const existingLedger = [
    { id: 'tx-1', date: '2026-10-15', amount: 450.0, description: 'UPI-SWIGGY RESTAURANT', type: 'expense' }
  ];

  const incomingCandidates = [
    { date: '2026-10-15', amount: 450.0, description: 'UPI-SWIGGY RESTAURANT', type: 'expense' },
    { date: '2026-10-16', amount: 1200.0, description: 'BESCOM ELECTRICITY', type: 'expense' }
  ];

  const evaluated = parser.flagDuplicates(incomingCandidates, existingLedger);
  assert.equal(evaluated.length, 2);

  // First is duplicate
  assert.equal(evaluated[0].isDuplicate, true, 'First entry must be flagged as duplicate');
  assert.equal(evaluated[0].selected, false, 'Duplicate entry must be unselected by default');

  // Second is unique
  assert.equal(evaluated[1].isDuplicate, false, 'Second entry must be unique');
  assert.equal(evaluated[1].selected, true, 'Unique entry must be selected by default');
});
