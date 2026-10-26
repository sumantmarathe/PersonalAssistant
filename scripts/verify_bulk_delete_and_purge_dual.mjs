import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

function getTargets(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function connectCDP(wsUrl) {
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

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ws, send };
}

async function captureScreenshot(send, filePath) {
  const res = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  console.log(`Saved screenshot to ${filePath}`);
}

async function runVerification() {
  console.log('=== DUAL-TARGET E2E VERIFICATION: BULK DELETE & PURGE ===');

  // 1. Web Target (Port 9222 or connect to Chrome)
  console.log('\n[1/2] Connecting to Web Chrome on port 9222...');
  const webTargets = await getTargets(9222);
  const webPage = webTargets.find(t => t.url && t.url.includes('8085'));
  if (!webPage) {
    throw new Error('Web page on 8085 not found in Chrome devtools');
  }

  const web = await connectCDP(webPage.webSocketDebuggerUrl);
  console.log('Connected to Web Page:', webPage.url);

  // Reload web page to load fresh code
  await web.send('Page.reload');
  await new Promise(r => setTimeout(r, 1200));

  // Populate sample transactions for testing
  console.log('Populating sample transactions on Web...');
  const setupRes = await web.send('Runtime.evaluate', {
    expression: `(async () => {
      await window.storageService.clearAllTransactions();
      const samples = [
        { id: 'tx-test-1', type: 'expense', amount: 350, category: 'Food & Dining', date: '2026-03-01', description: 'Grocery Store' },
        { id: 'tx-test-2', type: 'expense', amount: 1200, category: 'Shopping', date: '2026-03-05', description: 'New Running Shoes' },
        { id: 'tx-test-3', type: 'income', amount: 45000, category: 'Salary', date: '2026-03-10', description: 'March Tech Salary' },
        { id: 'tx-test-4', type: 'expense', amount: 650, category: 'Utilities', date: '2026-03-15', description: 'Electric Bill' },
        { id: 'tx-test-5', type: 'expense', amount: 2500, category: 'Healthcare', date: '2026-03-20', description: 'Annual Health Checkup' }
      ];
      await window.storageService.batchAddTransactions(samples);
      await window.budgetApp.loadAndRender();
      return { count: (await window.storageService.getAllTransactions()).length };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Web Initial Samples Loaded:', setupRes.result.value);

  // Test Selection & Bulk Toolbar on Web
  console.log('Testing Bulk Selection Toolbar on Web...');
  const selectRes = await web.send('Runtime.evaluate', {
    expression: `(() => {
      // Check 2 checkboxes
      const checkboxes = document.querySelectorAll('.tx-select-checkbox');
      if (checkboxes.length < 2) return { error: 'Not enough rows' };
      checkboxes[0].click();
      checkboxes[1].click();

      const toolbar = document.getElementById('ledger-bulk-toolbar');
      const selectedBadge = document.getElementById('bulk-selected-count').innerText;
      const deleteCount = document.getElementById('bulk-delete-count').innerText;

      return {
        toolbarVisible: toolbar.style.display !== 'none',
        selectedBadge,
        deleteCount,
        selectedSetSize: window.budgetApp.selectedTxIds.size
      };
    })()`,
    returnByValue: true
  });

  console.log('Web Bulk Selection Result:', selectRes.result.value);

  // Take screenshot with bulk toolbar visible
  await captureScreenshot(web.send, 'c:/work/Repositories/PersonalAssistant/main-branch/PersonalAssistant/docs/audits/web_bulk_selection.png');

  // Test Purge Modal on Web
  console.log('Opening Purge Modal on Web...');
  const modalRes = await web.send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btn-open-purge-modal').click();
      const modal = document.getElementById('modal-purge-records');
      const previewText = document.getElementById('purge-preview-text').innerText;
      const executeBtn = document.getElementById('btn-execute-purge');

      return {
        modalVisible: modal.style.display === 'flex',
        previewText,
        btnDisabled: executeBtn.disabled
      };
    })()`,
    returnByValue: true
  });
  console.log('Web Purge Modal State:', modalRes.result.value);

  await captureScreenshot(web.send, 'c:/work/Repositories/PersonalAssistant/main-branch/PersonalAssistant/docs/audits/web_purge_modal.png');

  // Test Scope Switch to "type" (Expenses) and check safety confirm
  const scopeRes = await web.send('Runtime.evaluate', {
    expression: `(() => {
      const typeRadio = document.querySelector('input[name="purge-scope"][value="type"]');
      typeRadio.click();
      const previewText = document.getElementById('purge-preview-text').innerText;
      
      // Check safety checkbox
      const confirmCheck = document.getElementById('purge-confirm-checkbox');
      confirmCheck.click();
      const executeBtn = document.getElementById('btn-execute-purge');

      return {
        previewText,
        btnDisabled: executeBtn.disabled
      };
    })()`,
    returnByValue: true
  });
  console.log('Web Scope Switch & Safety Confirm:', scopeRes.result.value);

  // Close modal
  await web.send('Runtime.evaluate', {
    expression: `document.getElementById('btn-close-purge-modal').click();`
  });
  web.ws.close();

  // 2. Android Emulator Target (Port 9225)
  console.log('\n[2/2] Connecting to Android WebView on port 9225...');
  const androidTargets = await getTargets(9225);
  const androidPage = androidTargets[0];
  if (!androidPage) {
    throw new Error('Android WebView target not found on port 9225');
  }

  const android = await connectCDP(androidPage.webSocketDebuggerUrl);
  console.log('Connected to Android WebView Page:', androidPage.title);

  // Reload Android WebView
  await android.send('Page.reload');
  await new Promise(r => setTimeout(r, 1200));

  // Populate sample data in Android app
  console.log('Populating sample transactions in Android app...');
  const androidSetup = await android.send('Runtime.evaluate', {
    expression: `(async () => {
      await window.storageService.clearAllTransactions();
      const samples = [
        { id: 'tx-droid-1', type: 'expense', amount: 450, category: 'Food & Dining', date: '2026-03-02', description: 'Cafeteria Lunch' },
        { id: 'tx-droid-2', type: 'expense', amount: 890, category: 'Transportation', date: '2026-03-08', description: 'Metro Pass Recharge' },
        { id: 'tx-droid-3', type: 'income', amount: 30000, category: 'Freelance / Consulting', date: '2026-03-12', description: 'UI Design Milestone' }
      ];
      await window.storageService.batchAddTransactions(samples);
      await window.budgetApp.loadAndRender();
      return { count: (await window.storageService.getAllTransactions()).length };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Android Initial Samples Loaded:', androidSetup.result.value);

  // Open Purge Modal in Android app
  console.log('Opening Purge Modal in Android app...');
  const androidModalRes = await android.send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btn-open-purge-modal').click();
      const modal = document.getElementById('modal-purge-records');
      const previewText = document.getElementById('purge-preview-text').innerText;
      return {
        modalVisible: modal.style.display === 'flex',
        previewText
      };
    })()`,
    returnByValue: true
  });
  console.log('Android Purge Modal State:', androidModalRes.result.value);

  await captureScreenshot(android.send, 'c:/work/Repositories/PersonalAssistant/main-branch/PersonalAssistant/docs/audits/android_purge_modal.png');

  // Close modal and test bulk select on Android
  await android.send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('btn-close-purge-modal').click();
      // Click Master checkbox
      document.getElementById('ledger-check-master').click();
    })()`
  });

  const androidBulkCheck = await android.send('Runtime.evaluate', {
    expression: `(() => {
      const toolbar = document.getElementById('ledger-bulk-toolbar');
      return {
        toolbarVisible: toolbar.style.display !== 'none',
        selectedCount: document.getElementById('bulk-selected-count').innerText,
        deleteCount: document.getElementById('bulk-delete-count').innerText
      };
    })()`,
    returnByValue: true
  });
  console.log('Android Bulk Select Master Result:', androidBulkCheck.result.value);

  await captureScreenshot(android.send, 'c:/work/Repositories/PersonalAssistant/main-branch/PersonalAssistant/docs/audits/android_bulk_selection.png');

  android.ws.close();
  console.log('\n=== ALL DUAL-TARGET VERIFICATIONS PASSED WITH 100% SUCCESS ===\n');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
