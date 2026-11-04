import { sessionOf } from './utils/time.js';

// Mengambil konfigurasi alamat API dari endpoint runtime server
export async function getApiConfig() {
  try {
    const res = await fetch('/api/config', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return {
          clientCountBase: (json.data.clientCountBase || 'http://10.13.222.10:5010').replace(/\/$/, ''),
          macOwnerBase: (json.data.macOwnerBase || 'http://10.13.222.10:5001').replace(/\/$/, ''),
        };
      }
    }
  } catch (_) {
    // Fallback default jika endpoint config tidak tersedia
  }
  return {
    clientCountBase: 'http://10.13.222.10:5010',
    macOwnerBase: 'http://10.13.222.10:5001',
  };
}

// Helper untuk mengurai pesan kesalahan dari respons HTTP server
async function extractErrorMessage(res) {
  let errorMsg = `HTTP ${res.status}`;
  try {
    const json = await res.json();
    if (json?.message) {
      errorMsg = json.message;
    }
  } catch (_) {
    // Abaikan jika respons bukan JSON
  }
  return errorMsg;
}

// Memanggil API client-count lewat proxy /api/client-count (dengan validasi jaringan BRIN oleh server)
export async function fetchClientCount(kawasan, apiSession, signal) {
  const res = await fetch(`/api/client-count/${kawasan}/${apiSession}`, { signal });
  if (!res.ok) {
    const msg = await extractErrorMessage(res);
    throw new Error(msg);
  }

  const json = await res.json();
  if (json.status !== 'success' || !Array.isArray(json.data?.clientCount)) {
    throw new Error('Format respons tidak sesuai');
  }
  return json.data.clientCount.map((row) => ({ ...row, time: new Date(row.createdAt).getTime() }));
}

// Menggabungkan data dari endpoint pagi dan siang, membuang duplikat (berdasarkan id),
// lalu menentukan sesi dari jam WIB: sebelum 12.00 = pagi, 12.00 ke atas = siang.
export function mergeRows(lists) {
  const byId = new Map();
  lists.flat().forEach((row) => {
    if (Number.isFinite(row.time)) byId.set(row.id, { ...row, session: sessionOf(row.time) });
  });
  return [...byId.values()].sort((a, b) => a.time - b.time);
}

// Normalisasi input MAC address agar cocok dengan format di database (huruf kapital dipisah titik dua)
export function normalizeMacAddress(str = '') {
  const clean = str.trim().toUpperCase();
  const hexOnly = clean.replace(/[^0-9A-F]/g, '');
  if (hexOnly.length === 12) {
    return hexOnly.match(/.{1,2}/g).join(':');
  }
  return clean.replace(/-/g, ':');
}

// Mencari data pemilik berdasarkan username atau mac-address
export async function searchMacOwners(type, rawQuery, signal) {
  const query = type === 'mac' ? normalizeMacAddress(rawQuery) : rawQuery.trim();
  if (!query) return [];

  const endpoint =
    type === 'mac'
      ? `/api/mac-owners/mac-address/${encodeURIComponent(query)}`
      : `/api/mac-owners/username/${encodeURIComponent(query)}`;

  const res = await fetch(endpoint, { signal });
  if (!res.ok) {
    if (res.status === 404) return [];
    const msg = await extractErrorMessage(res);
    throw new Error(msg);
  }

  const json = await res.json();
  if (json.status !== 'success' || !Array.isArray(json.data?.owners)) {
    throw new Error('Format respons tidak sesuai');
  }
  return json.data.owners;
}
