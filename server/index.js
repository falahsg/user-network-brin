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
const UPSTREAM_TIMEOUT_MS = 8_000;

const normalizeIp = (ip = "") => ip.replace(/^::ffff:/, "");

function isDockerPrivateIp(ip) {
  const parts = ip.split(".").map(Number);

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

function isAllowed(ip) {
  ip = normalizeIp(ip);

  // IP public yang diizinkan melalui konfigurasi
  if (ALLOWED_PREFIXES.some((prefix) => ip.startsWith(prefix))) {
    return true;
  }

  // Izinkan localhost jika diaktifkan
  if (ALLOW_LOCALHOST === "true" && (ip === "127.0.0.1" || ip === "::1")) {
    return true;
  }

  // Izinkan alamat privat Docker
  if (isDockerPrivateIp(ip)) {
    return true;
  }

  return false;
}

const app = express();
app.disable('x-powered-by');

// 1) Pembatas jaringan. Memakai alamat socket asli, bukan header yang bisa dipalsukan.
app.use((req, res, next) => {
  const ip = normalizeIp(req.socket.remoteAddress);
  if (isAllowed(ip)) return next();
  console.warn(`[blocked] ${ip} ${req.method} ${req.url}`);
  res
    .status(403)
    .type("text/plain")
    .send(`403 - Akses ditolak. IP yang terdeteksi: ${ip}`);
});

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'"
  );
  next();
});
app.use(compression());

// 2) Proxy API dengan cache singkat agar ringan bagi server sumber.
const cache = new Map();

app.get('/api/client-count/:kawasan/:session', async (req, res) => {
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

app.get('/api/mac-owners/username/:username', async (req, res) => {
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

app.get('/api/mac-owners/mac-address/:mac(*)', async (req, res) => {
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

app.listen(PORT, HOST, () => {
  console.log(`Dashboard berjalan di http://${HOST}:${PORT}`);
  console.log(`API Client Count : ${API_CLIENT_COUNT_BASE}`);
  console.log(`API Mac Owner    : ${API_MAC_OWNER_BASE}`);
  console.log(`Izin akses       : ${ALLOWED_PREFIXES.join(', ')}${ALLOW_LOCALHOST ? ' + localhost' : ''}`);
});
