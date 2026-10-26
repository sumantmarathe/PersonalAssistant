import { fileURLToPath } from 'node:url';

const targets = await fetch('http://localhost:9222/json/list').then(r => r.json());
console.log('Targets:', targets.map(t => ({ id: t.id, title: t.title, url: t.url })));

const active = targets.find(t => t.id === 'E57821EE89B4265CC7A42A9AA2F9F355' || t.url.includes('localhost:8085'));
if (active) {
  const ws = new WebSocket(active.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `({
          url: location.href,
          hasToolbar: !!document.querySelector('.navigation-toolbar'),
          toolbarHtml: document.querySelector('.navigation-toolbar')?.outerHTML,
          tabs: Array.from(document.querySelectorAll('.app-tab-btn, .nav-tab')).map(b => b.textContent.trim().replace(/\\s+/g, ' '))
        })`,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (e) => {
    console.log('Page State:', JSON.parse(e.data).result.result.value);
    process.exit(0);
  };
} else {
  console.log('Target not found');
}
