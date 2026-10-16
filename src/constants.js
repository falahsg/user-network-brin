export const KAWASAN = [
  { id: 'gatsu', label: 'Gatsu' },
  { id: 'ancol', label: 'Ancol' },
  { id: 'pejaten', label: 'Pejaten' },
];

export const SESSIONS = [
  { id: 'pagi', label: 'Pagi' },
  { id: 'siang', label: 'Siang' },
];

// Pilihan sesi di antarmuka; 'semua' menggabungkan data pagi dan siang.
export const SESSION_OPTIONS = [...SESSIONS, { id: 'semua', label: 'Pagi & siang' }];

export const METRICS = [
  { key: 'dhcp', label: 'DHCP', color: 'var(--m-dhcp)' },
  { key: 'dynamic', label: 'Dynamic', color: 'var(--m-dynamic)' },
  { key: 'hotspot', label: 'Hotspot', color: 'var(--m-hotspot)' },
  { key: 'guest', label: 'Guest', color: 'var(--m-guest)' },
];

export const RANGES = [
  { id: 7, label: '7 hari' },
  { id: 30, label: '30 hari' },
  { id: 0, label: 'Semua' },
];

export const REFRESH_MS = 5 * 60 * 1000;
