// scripts/e2e_cdp_verification.mjs
// Empirical End-to-End Verification of Web and Android Targets via Chrome DevTools Protocol

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(rootDir, 'artifacts_screenshots');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.pending.has(data.id)) {
          const { resolve: res, reject: rej } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`CDP Eval Error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(artifactsDir, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[Screenshot] Saved ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function verifyTarget(name, wsUrl) {
  console.log(`\n======================================================`);
  console.log(` Verifying Target: ${name}`);
  console.log(` WebSocket URL:   ${wsUrl}`);
  console.log(`======================================================\n`);

  const client = new CDPClient(wsUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // 1. Reload page
  console.log('[1/7] Reloading page...');
  await client.send('Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  // Wait for budgetApp and accounts array initialization
  await client.eval(`
    new Promise((resolve) => {
      const check = () => {
        if (window.budgetApp && Array.isArray(window.budgetApp.accounts)) {
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);

  // 2. Initial state verification
  console.log('[2/7] Verifying loaded accounts and initial ledger view...');
  const initInfo = await client.eval(`({
    activeTab: window.budgetApp ? window.budgetApp.activeTab : null,
    accountCount: (window.budgetApp && window.budgetApp.accounts) ? window.budgetApp.accounts.length : 0,
    accounts: (window.budgetApp && window.budgetApp.accounts) ? window.budgetApp.accounts.map(a => a.bankName) : []
  })`);
  console.log('      Init State:', JSON.stringify(initInfo));

  await client.screenshot(`${name}_01_ledger_initial.png`);

  // 3. Switch to Bank Accounts Tab
  console.log('[3/7] Switching to Accounts Tab (#tab-btn-accounts)...');
  await client.eval(`document.getElementById('tab-btn-accounts').click()`);
  await new Promise(r => setTimeout(r, 600));

  const accountsTabActive = await client.eval(`({
    tabBtnActive: document.getElementById('tab-btn-accounts').classList.contains('active'),
    viewDisplay: document.getElementById('tab-accounts-view').style.display,
    cardCount: document.querySelectorAll('#accounts-cards-grid .account-card').length
  })`);
  console.log('      Accounts Tab State:', JSON.stringify(accountsTabActive));
  await client.screenshot(`${name}_02_accounts_view.png`);

  // 4. Add a new Bank Account (Axis Bank)
  console.log('[4/7] Opening Add Account modal and creating Axis Bank account...');
  await client.eval(`
    document.getElementById('btn-open-add-account').click();
    document.getElementById('acc-bank-select').value = 'Axis Bank';
    document.getElementById('acc-number').value = '918020012345678';
    document.getElementById('acc-ifsc').value = 'UTIB0000045';
    document.getElementById('acc-type').value = 'current';
    document.getElementById('acc-nickname').value = 'Business Operating A/C';
  `);
  await new Promise(r => setTimeout(r, 400));
  await client.screenshot(`${name}_03_add_account_modal.png`);

  // Click Save
  await client.eval(`document.getElementById('btn-save-account').click()`);
  await new Promise(r => setTimeout(r, 800));

  const afterAdd = await client.eval(`({
    totalAccounts: window.budgetApp.accounts.length,
    accountNames: window.budgetApp.accounts.map(a => a.bankName),
    renderedCards: document.querySelectorAll('#accounts-cards-grid .account-card').length
  })`);
  console.log('      Accounts after addition:', JSON.stringify(afterAdd));
  await client.screenshot(`${name}_04_accounts_with_axis.png`);

  // 5. Add a couple transactions assigned to different accounts
  console.log('[5/7] Adding sample transactions to Axis and SBI accounts...');
  await client.eval(`
    document.getElementById('tab-btn-ledger').click();
  `);
  await new Promise(r => setTimeout(r, 400));

  // Add Income to SBI
  await client.eval(`
    (async () => {
      const sbiAcc = window.budgetApp.accounts.find(a => a.bankName.includes('State Bank') || a.isDefault);
      const axisAcc = window.budgetApp.accounts.find(a => a.bankName.includes('Axis'));
      
      await window.budgetApp.storage.addTransaction({
        id: 'tx_demo_salary',
        date: '2026-10-05',
        type: 'income',
        amount: 85000,
        category: 'Salary',
        description: 'Tech Consulting Remittance',
        accountId: sbiAcc.id,
        createdAt: Date.now()
      });

      await window.budgetApp.storage.addTransaction({
        id: 'tx_demo_rent',
        date: '2026-10-07',
        type: 'expense',
        amount: 22000,
        category: 'Housing',
        description: 'Office Studio Rent',
        accountId: axisAcc ? axisAcc.id : sbiAcc.id,
        createdAt: Date.now()
      });

      await window.budgetApp.storage.addTransaction({
        id: 'tx_demo_equipment',
        date: '2026-10-12',
        type: 'expense',
        amount: 14500,
        category: 'Shopping',
        description: '4K Display Monitor',
        accountId: axisAcc ? axisAcc.id : sbiAcc.id,
        createdAt: Date.now()
      });

      await window.budgetApp.storage.addTransaction({
        id: 'tx_demo_dining',
        date: '2026-10-18',
        type: 'expense',
        amount: 3200,
        category: 'Food',
        description: 'Client Dinner Swiggy',
        accountId: sbiAcc.id,
        createdAt: Date.now()
      });

      await window.budgetApp.loadAndRender();
    })()
  `);
  await new Promise(r => setTimeout(r, 800));
  await client.screenshot(`${name}_05_ledger_with_accounts.png`);

  // 6. Switch to Analytics & Stats Tab
  console.log('[6/7] Testing Analytics & Stats tab metrics, trend, and presets...');
  await client.eval(`document.getElementById('tab-btn-stats').click()`);
  await new Promise(r => setTimeout(r, 600));

  // Click 'This Month' preset
  await client.eval(`
    (() => {
      const monthBtn = Array.from(document.querySelectorAll('.stats-preset-btn')).find(b => b.dataset.range === 'this_month');
      if (monthBtn) monthBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const statsInfo = await client.eval(`({
    totalExpense: document.getElementById('stat-val-expense').textContent,
    totalIncome: document.getElementById('stat-val-income').textContent,
    netSavings: document.getElementById('stat-val-savings').textContent,
    savingsRate: document.getElementById('stat-val-savings-rate').textContent,
    dailyAvg: document.getElementById('stat-val-daily-avg').textContent,
    peakAmount: document.getElementById('stat-val-peak-amount').textContent,
    peakDate: document.getElementById('stat-val-peak-date').textContent,
    topExpensesCount: document.querySelectorAll('#stats-top-expenses .top-expense-row').length,
    catBreakdownCount: document.querySelectorAll('#stats-category-list .category-breakdown-item').length
  })`);
  console.log('      Analytics Metrics (This Month):', JSON.stringify(statsInfo));
  await client.screenshot(`${name}_06_analytics_this_month.png`);

  // Test 'All Time' preset
  console.log('[7/7] Testing All Time preset and account filter...');
  await client.eval(`
    (() => {
      const allBtn = Array.from(document.querySelectorAll('.stats-preset-btn')).find(b => b.dataset.range === 'all');
      if (allBtn) allBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  await client.screenshot(`${name}_07_analytics_all_time.png`);

  client.close();
  console.log(`\n Target ${name} verification completed successfully!\n`);
}

async function main() {
  // 1. Get Desktop Web target
  const webTargets = await fetch('http://localhost:9222/json/list').then(r => r.json());
  const webTarget = webTargets.find(t => t.url.includes('localhost:8085') && t.type === 'page');
  if (webTarget) {
    await verifyTarget('Web_Desktop', webTarget.webSocketDebuggerUrl);
  } else {
    console.error('Desktop web target not found on port 9222');
  }

  // 2. Get Android WebView target
  try {
    const androidTargets = await fetch('http://localhost:9225/json/list').then(r => r.json());
    const androidTarget = androidTargets.find(t => t.type === 'page');
    if (androidTarget) {
      await verifyTarget('Android_WebView', androidTarget.webSocketDebuggerUrl);
    } else {
      console.warn('Android target not found on port 9225');
    }
  } catch (err) {
    console.warn('Android DevTools not reachable on port 9225:', err.message);
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
