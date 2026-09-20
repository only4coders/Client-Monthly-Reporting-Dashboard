const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE_NAME = 'reporting_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSession(secret) {
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${expires}.${sign(expires, secret)}`;
}

function isAuthenticated(req, secret) {
  if (!secret) return false;
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(v => v.trim().split('=')));
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(signature, sign(expires, secret));
}

function loginPage(error = false, setupMissing = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard Login</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 15% 10%,#5146b8 0,transparent 32%),#12152e;font-family:Arial,sans-serif;color:#17203a}.box{width:min(92vw,430px);background:#fff;border-radius:22px;padding:38px;box-shadow:0 30px 80px #090b1d88}.mark{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#8f83ff,#5e4de4);display:grid;place-items:center;color:#fff;font-weight:800;margin-bottom:24px}.eyebrow{color:#6a5ce7;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:27px;margin:9px 0 8px}p{color:#738097;line-height:1.55;margin:0 0 25px}label{display:block;font-size:13px;font-weight:700;margin-bottom:8px}input{width:100%;font-size:16px;padding:14px;border:1px solid #dfe3ec;border-radius:11px;outline:none}input:focus{border-color:#6a5ce7;box-shadow:0 0 0 4px #6a5ce71a}button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:11px;background:#6657e8;color:#fff;font-size:15px;font-weight:800;cursor:pointer}.error{background:#fff0f2;color:#bd3450;padding:11px;border-radius:9px;font-size:13px;margin-bottom:16px}.foot{font-size:12px;color:#929bad;text-align:center;margin-top:22px}
  </style></head><body><main class="box"><div class="mark">360</div><div class="eyebrow">Private reporting portal</div><h1>Welcome back</h1><p>Enter the dashboard password to view client performance reports.</p>${setupMissing ? '<div class="error">Dashboard password has not been configured on the server.</div>' : ''}${error ? '<div class="error">Incorrect password. Please try again.</div>' : ''}<form method="post" action="/login"><label for="password">Dashboard password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Open dashboard</button></form><div class="foot">Protected client reporting</div></main></body></html>`;
}

function bodyFrom(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) reject(new Error('Request too large')); });
    req.on('end', () => resolve(new URLSearchParams(body)));
    req.on('error', reject);
  });
}

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/data.js': ['data.js', 'application/javascript; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml']
};

module.exports = async function handler(req, res) {
  const secret = process.env.DASHBOARD_PASSWORD;
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/logout') {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    const form = await bodyFrom(req);
    if (secret && safeEqual(form.get('password') || '', secret)) {
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=${createSession(secret)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`);
      res.writeHead(303, { Location: '/' });
      return res.end();
    }
    res.statusCode = 401;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(loginPage(true, !secret));
  }

  if (!isAuthenticated(req, secret)) {
    res.statusCode = 401;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(loginPage(false, !secret));
  }

  const requested = files[url.pathname];
  if (!requested) { res.statusCode = 404; return res.end('Not found'); }
  const [file, contentType] = requested;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', file.endsWith('.html') || file === 'data.js' ? 'no-store' : 'private, max-age=3600');
  return res.end(fs.readFileSync(path.join(process.cwd(), file)));
};
