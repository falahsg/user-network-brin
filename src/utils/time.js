// Seluruh perhitungan hari dan sesi memakai WIB (UTC+7, tanpa DST).
export const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const WIB_MS = 7 * HOUR_MS;

// Awal hari (00.00 WIB) dari sebuah waktu.
export const startOfDayWib = (t) => Math.floor((t + WIB_MS) / DAY_MS) * DAY_MS - WIB_MS;

// Sebelum 12.00 WIB = pagi, 12.00 WIB ke atas = siang.
export const sessionOf = (t) => (Math.floor(((t + WIB_MS) % DAY_MS) / HOUR_MS) < 12 ? 'pagi' : 'siang');
