const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

let _db = null;
function setDb(db) { _db = db; }

function httpPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { ...headers, 'Content-Length': Buffer.byteLength(body) },
      timeout:  10000,
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', d => { data += d });
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function triggerWebhook(event, data) {
  if (!_db) return;
  try {
    const hooks = await _db.all(
      `SELECT * FROM webhook_configs WHERE is_active = 1 AND events LIKE ?`,
      `%"${event}"%`
    );
    if (hooks.length === 0) return;

    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

    for (const hook of hooks) {
      const headers = { 'Content-Type': 'application/json', 'X-CRM-Event': event, 'User-Agent': 'CRM-Pro/1.0' };
      if (hook.secret) {
        headers['X-CRM-Signature'] = 'sha256=' + crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');
      }

      let responseStatus = null, responseBody = null, errorMsg = null;
      try {
        const res = await httpPost(hook.url, payload, headers);
        responseStatus = res.status;
        responseBody = res.body;
      } catch (err) {
        errorMsg = err.message?.slice(0, 255);
      }

      await _db.run(
        'INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body, error) VALUES (?, ?, ?, ?, ?, ?)',
        hook.id, event, payload, responseStatus, responseBody, errorMsg
      ).catch(() => {});
    }
  } catch (err) {
    console.error('Webhook trigger error:', err);
  }
}

module.exports = { setDb, triggerWebhook };
