import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const PORT = Number(process.env.PORT) || 1818;
const HOST = process.env.HOST || '0.0.0.0';
const API_CLIENT_COUNT_BASE = (
  process.env.API_CLIENT_COUNT_BASE ||
  process.env.API_BASE ||
  'http://10.13.222.10:5010'
).replace(/\/$/, '');
const API_MAC_OWNER_BASE = (
  process.env.API_MAC_OWNER_BASE ||
  'http://10.13.222.10:5001'
).replace(/\/$/, '');
const ALLOWED_PREFIXES = (process.env.ALLOWED_PREFIXES || '103.')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const API_QUERY = (process.env.API_QUERY || '').replace(/^\?/, '');
const ALLOW_LOCALHOST = (process.env.ALLOW_LOCALHOST || 'true');

const KAWASAN = new Set(['gatsu', 'ancol', 'pejaten']);
const SESSIONS = new Set(['pagi', 'siang']);
const CACHE_TTL_MS = 30_000;
const UPSTREAM_TIMEOUT_MS = 4_000;

const normalizeIp = (ip = '') => ip.replace(/^::ffff:/, '');

function isPrivateIp(ip) {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}

// Mengekstrak IP asli client bahkan jika berada di balik Cloudflare Tunnel atau Reverse Proxy
export function getClientIp(req) {
  // 1. Cloudflare Tunnel / Cloudflare Edge (selalu berisi client IP asli)
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) {
    const ip = String(cfIp).split(',')[0].trim();
    if (ip) return normalizeIp(ip);
  }

  // 2. Standard X-Forwarded-For (ambil IP pertama = client asli)
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const ip = String(xff).split(',')[0].trim();
    if (ip) return normalizeIp(ip);
  }

  // 3. Header X-Real-IP
  const xReal = req.headers?.['x-real-ip'];
  if (xReal) {
    const ip = String(xReal).split(',')[0].trim();
    if (ip) return normalizeIp(ip);
  }

  // 4. Socket IP langsung
  return normalizeIp(req.socket?.remoteAddress || '');
}

export function isAllowed(ip) {
  ip = normalizeIp(ip);

  // Izinkan semua IP jika wildcard (*) digunakan
  if (ALLOWED_PREFIXES.includes('*')) {
    return true;
  }

  // IP public yang diizinkan melalui konfigurasi (default: awalan 103. untuk BRIN)
  if (ALLOWED_PREFIXES.some((prefix) => ip.startsWith(prefix))) {
    return true;
  }

  // Izinkan localhost jika diaktifkan (untuk pengujian lokal / direct tunnel jika diizinkan)
  if (ALLOW_LOCALHOST === 'true' && (ip === '127.0.0.1' || ip === '::1')) {
    return true;
  }

  // Izinkan alamat privat intranet / Docker
  if (isPrivateIp(ip)) {
    return true;
  }

  return false;
}

const app = express();
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http: https: data:; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http: https: data: https://cloudflareinsights.com;"
  );
  next();
});
app.use(compression());

// Middleware pembatas jaringan KHUSUS untuk endpoint data API.
// File statis web (HTML, CSS, JS) TIDAK melewati middleware ini, sehingga tampilan web selalu terbuka untuk siapa pun.
export function requireAllowedNetwork(req, res, next) {
  const clientIp = getClientIp(req);
  if (isAllowed(clientIp)) {
    return next();
  }

  console.warn(`[API Blocked] Akses ditolak dari IP: ${clientIp} (${req.method} ${req.originalUrl})`);
  return res.status(403).json({
    status: 'error',
    code: 'FORBIDDEN_NETWORK',
    message: `Akses data hanya diizinkan dari jaringan internal atau VPN BRIN. IP Anda: ${clientIp || 'Tidak dikenal'}`,
    clientIp,
  });
}

// Endpoint konfigurasi runtime (tetap terbuka)
app.get('/api/config', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      clientCountBase: API_CLIENT_COUNT_BASE,
      macOwnerBase: API_MAC_OWNER_BASE,
    },
  });
});

// Proxy API dengan proteksi jaringan BRIN dan cache singkat
const cache = new Map();

app.get('/api/client-count/:kawasan/:session', requireAllowedNetwork, async (req, res) => {
  const { kawasan, session } = req.params;
  if (!KAWASAN.has(kawasan) || !SESSIONS.has(session)) {
    return res.status(404).json({ status: 'error', message: 'Endpoint tidak dikenal' });
  }

  const key = `${kawasan}/${session}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) {
    return res.type('json').send(hit.body);
  }

  try {
    const upstream = await fetch(`${API_CLIENT_COUNT_BASE}/client-count/${key}${API_QUERY ? `?${API_QUERY}` : ''}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const body = await upstream.text();
    cache.set(key, { time: Date.now(), body });
    res.type('json').send(body);
  } catch (err) {
    console.error(`[api] ${key}: ${err.message}`);
    if (hit) return res.type('json').send(hit.body);
    res.status(502).json({ status: 'error', message: 'API sumber tidak dapat dihubungi' });
  }
});

app.get('/api/mac-owners/username/:username', requireAllowedNetwork, async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).json({ status: 'error', message: 'Username wajib diisi' });
  }

  try {
    const upstream = await fetch(
      `${API_MAC_OWNER_BASE}/mac-owners/username/${encodeURIComponent(username)}`,
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
    );
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const body = await upstream.text();
    res.type('json').send(body);
  } catch (err) {
    console.error(`[api] mac-owners/username/${username}: ${err.message}`);
    res.status(502).json({ status: 'error', message: 'API mac-owners tidak dapat dihubungi' });
  }
});

app.get('/api/mac-owners/mac-address/:mac(*)', requireAllowedNetwork, async (req, res) => {
  const { mac } = req.params;
  if (!mac) {
    return res.status(400).json({ status: 'error', message: 'MAC Address wajib diisi' });
  }

  try {
    const upstream = await fetch(
      `${API_MAC_OWNER_BASE}/mac-owners/mac-address/${encodeURIComponent(mac)}`,
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
    );
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const body = await upstream.text();
    res.type('json').send(body);
  } catch (err) {
    console.error(`[api] mac-owners/mac-address/${mac}: ${err.message}`);
    res.status(502).json({ status: 'error', message: 'API mac-owners tidak dapat dihubungi' });
  }
});

// File statis web (HTML, CSS, JS) - Tidak diproteksi IP agar web selalu terbuka untuk publik
app.use(
  express.static(DIST, {
    index: false,
    setHeaders(res, filePath) {
      const hashed = filePath.includes(`${path.sep}assets${path.sep}`);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  })
);

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST, 'index.html'));
});

// Jalankan server jika dipanggil langsung
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, HOST, () => {
    console.log(`Dashboard berjalan di http://${HOST}:${PORT}`);
    console.log(`API Client Count : ${API_CLIENT_COUNT_BASE}`);
    console.log(`API Mac Owner    : ${API_MAC_OWNER_BASE}`);
    console.log(`Izin akses API   : ${ALLOWED_PREFIXES.join(', ')}${ALLOW_LOCALHOST ? ' + localhost' : ''}`);
  });
}

export default app;
