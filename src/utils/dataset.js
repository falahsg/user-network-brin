import { METRICS } from '../constants.js';
import { DAY_MS, startOfDayWib } from './time.js';

export const filterBySession = (rows, session) =>
  !rows || session === 'semua' ? rows : rows.filter((r) => r.session === session);

export function getWindow(range, rows, now) {
  const latest = rows?.length ? rows[rows.length - 1].time : 0;
  const end = Math.max(now, latest);
  if (range) return { start: startOfDayWib(now) - range * DAY_MS, end };
  return rows?.length ? { start: rows[0].time, end } : null;
}

export function buildSeries(activeKeys, combined) {
  const base = METRICS.filter((m) => activeKeys.includes(m.key));
  if (!combined) return base.map((m) => ({ ...m, id: m.key }));
  return base.flatMap((m) => [
    { ...m, id: `${m.key}-pagi`, session: 'pagi' },
    { ...m, id: `${m.key}-siang`, session: 'siang', dashed: true },
  ]);
}
