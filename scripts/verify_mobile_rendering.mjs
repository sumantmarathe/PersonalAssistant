import http from 'node:http';
import fs from 'node:fs';

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

async function run() {
  console.log('Connecting to Chrome on port 9222...');
  const targets = await getTargets(9222);
  const page = targets.find(t => t.url && t.url.includes('8085'));
  if (!page) throw new Error('8085 target not found');

  const { ws, send } = await connectCDP(page.webSocketDebuggerUrl);

  // Set device emulation to mobile phone: 390 x 844, scale 1.0, mobile = true
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  // Reload to apply media query and new styles
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1200));

  // Populate sample data so user sees active state
  await send('Runtime.evaluate', {
    expression: `(async () => {
      // Simulate signed in state visual
      const signedInBox = document.getElementById('auth-signed-in');
      const signedOutBox = document.getElementById('auth-signed-out');
      const nameEl = document.getElementById('user-display-name');
      if (signedInBox && signedOutBox) {
        signedOutBox.style.display = 'none';
        signedInBox.style.display = 'flex';
        if (nameEl) nameEl.textContent = 'Sumant Marathe';
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 400));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('docs/audits/mobile_verified_390px.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Saved mobile screenshot to docs/audits/mobile_verified_390px.png');

  ws.close();
}

run().catch(console.error);
