import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

async function getDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9225/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          if (list && list[0] && list[0].webSocketDebuggerUrl) {
            resolve(list[0].webSocketDebuggerUrl);
          } else {
            reject(new Error('No webview target found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('[Android E2E] Connecting to Android WebView DevTools...');
  const wsUrl = await getDebuggerUrl();
  console.log(`[Android E2E] Target WebSocket: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);
  console.log('[Android E2E] Connected to Android WebView runtime.');

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // 1. Open modal and inject sample statement data
  const injectRes = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('modal-import-statement');
      modal.style.display = 'flex';
      window.budgetApp.parsedStatementTransactions = [
        { date: '2026-10-15', description: 'Swiggy Food Delivery', type: 'expense', category: 'Food & Dining', amount: 450.0, selected: true },
        { date: '2026-10-10', description: 'Tech Corp Salary Credit', type: 'income', category: 'Salary', amount: 85000.0, selected: true },
        { date: '2026-10-18', description: 'Uber City Cab', type: 'expense', category: 'Transportation', amount: 320.5, selected: true },
        { date: '2026-10-12', description: 'Amazon Online Electronics', type: 'expense', category: 'Shopping', amount: 1499.0, selected: true }
      ];
      window.budgetApp.renderStatementPreview();
      return { rowCount: window.budgetApp.parsedStatementTransactions.length };
    })()`,
    returnByValue: true
  });
  console.log('[Android E2E] Initial render result:', injectRes.result.value);

  // 2. Sort by Amount Ascending
  const sortAmountAsc = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      window.budgetApp.handleStatementSort('amount');
      const amounts = window.budgetApp.parsedStatementTransactions.map(t => t.amount);
      const icon = document.querySelector('th[data-sort="amount"] .sort-icon').textContent;
      const aria = document.querySelector('th[data-sort="amount"]').getAttribute('aria-sort');
      return { amounts, icon, aria };
    })()`,
    returnByValue: true
  });
  console.log('[Android E2E] Sort Amount Asc:', sortAmountAsc.result.value);
  if (sortAmountAsc.result.value.amounts[0] !== 320.5 || sortAmountAsc.result.value.amounts[3] !== 85000) {
    throw new Error('Sort amount asc failed: ' + JSON.stringify(sortAmountAsc.result.value));
  }

  // 3. Sort by Amount Descending
  const sortAmountDesc = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      window.budgetApp.handleStatementSort('amount');
      const amounts = window.budgetApp.parsedStatementTransactions.map(t => t.amount);
      const icon = document.querySelector('th[data-sort="amount"] .sort-icon').textContent;
      const aria = document.querySelector('th[data-sort="amount"]').getAttribute('aria-sort');
      return { amounts, icon, aria };
    })()`,
    returnByValue: true
  });
  console.log('[Android E2E] Sort Amount Desc:', sortAmountDesc.result.value);
  if (sortAmountDesc.result.value.amounts[0] !== 85000 || sortAmountDesc.result.value.amounts[3] !== 320.5) {
    throw new Error('Sort amount desc failed: ' + JSON.stringify(sortAmountDesc.result.value));
  }

  // 4. Sort by Date Ascending
  const sortDateAsc = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      window.budgetApp.handleStatementSort('date');
      const dates = window.budgetApp.parsedStatementTransactions.map(t => t.date);
      const icon = document.querySelector('th[data-sort="date"] .sort-icon').textContent;
      return { dates, icon };
    })()`,
    returnByValue: true
  });
  console.log('[Android E2E] Sort Date Asc:', sortDateAsc.result.value);
  if (sortDateAsc.result.value.dates[0] !== '2026-10-10' || sortDateAsc.result.value.dates[3] !== '2026-10-18') {
    throw new Error('Sort date asc failed: ' + JSON.stringify(sortDateAsc.result.value));
  }

  // 5. Capture screenshot
  const screenshotRes = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const outPath = path.resolve('C:/Users/user/.gemini/antigravity-ide/brain/10539596-9ce1-4ecf-9445-d7f76e1a1631/statement_sorted_android_screenshot.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log(`[Android E2E] Screenshot saved to: ${outPath}`);

  ws.close();
  console.log('[Android E2E] Verification PASSED 100%!');
}

run().catch(err => {
  console.error('[Android E2E Error]:', err);
  process.exit(1);
});
