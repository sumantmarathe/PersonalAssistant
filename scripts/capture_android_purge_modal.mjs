import http from 'node:http';
import fs from 'node:fs';

http.get('http://localhost:9225/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const list = JSON.parse(data);
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    ws.onopen = async () => {
      let id = 1;
      const send = (m, p = {}) => new Promise(r => {
        const reqId = id++;
        const handler = (ev) => {
          const d = JSON.parse(ev.data);
          if (d.id === reqId) {
            ws.removeEventListener('message', handler);
            r(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
      });

      // Open purge modal
      await send('Runtime.evaluate', {
        expression: `(() => {
          document.getElementById('btn-open-purge-modal').click();
        })()`
      });

      await new Promise(r => setTimeout(r, 600));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('docs/audits/android_purge_modal_open.png', Buffer.from(shot.data, 'base64'));
      console.log('Android purge modal screenshot saved');
      ws.close();
    };
  });
});
