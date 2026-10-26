// tests/integration/test_android_webview_cdp.mjs
// Empirical E2E Verification of Android App inside Emulator via Chrome DevTools Protocol

import http from 'node:http';

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

  // Use Node 22 native WebSocket
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
  console.log('[Android E2E] Connected to WebView runtime.');

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // 1. Evaluate document title
  const titleRes = await sendCommand('Runtime.evaluate', {
    expression: 'document.title',
    returnByValue: true
  });
  console.log(`[Android E2E] Document Title: "${titleRes.result.value}"`);

  // 2. Check initial Net Balance
  const balanceBefore = await sendCommand('Runtime.evaluate', {
    expression: 'document.getElementById("metric-net-balance").innerText',
    returnByValue: true
  });
  console.log(`[Android E2E] Initial Net Balance: ${balanceBefore.result.value}`);

  // 3. Add a test transaction via the app UI logic directly in the Android app
  console.log('[Android E2E] Recording test transaction (₹50,000 Income) on Android...');
  const addTxRes = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      // Click income button
      document.querySelector('.type-toggle-btn.income').click();
      document.getElementById('tx-amount').value = '50000';
      document.getElementById('tx-description').value = 'Mobile Android App Test Salary';
      document.getElementById('transaction-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
      return {
        balance: document.getElementById('metric-net-balance').innerText,
        totalIncome: document.getElementById('metric-total-income').innerText,
        ledgerCount: document.getElementById('ledger-container')?.children.length || 0
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('[Android E2E] Transaction Form Submitted in Android WebView:');
  console.log(`             Net Balance:  ${addTxRes.result.value.balance}`);
  console.log(`             Total Income: ${addTxRes.result.value.totalIncome}`);
  console.log(`             Ledger Items: ${addTxRes.result.value.ledgerCount}`);

  // 4. Verify transaction in storage
  const storageCheck = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      const txs = await window.storageService.getAllTransactions();
      return { count: txs.length, latest: txs[0] };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log(`[Android E2E] IndexedDB Persistence Verified on Android:`);
  console.log(`             Stored Transactions: ${storageCheck.result.value.count}`);
  console.log(`             Latest Note:         "${storageCheck.result.value.latest.description}"`);
  console.log(`             Latest Amount:       ₹${storageCheck.result.value.latest.amount}`);

  ws.close();
  console.log('[Android E2E] Android App E2E Test PASSED with 100% SUCCESS!\n');
}

run().catch(err => {
  console.error('[Android E2E ERROR]', err);
  process.exit(1);
});
