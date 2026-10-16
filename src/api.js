import { sessionOf } from './utils/time.js';

// Memanggil API lewat /api (di-proxy oleh server).
export async function fetchClientCount(kawasan, apiSession, signal) {
  const res = await fetch(`/api/client-count/${kawasan}/${apiSession}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
