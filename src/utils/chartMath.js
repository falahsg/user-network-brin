import { DAY_MS, startOfDayWib } from './time.js';

const DAY_PADDING = 0.1; 

export function createDayScale(times, width) {
  const days = [...new Set(times.map(startOfDayWib))];
  const indexOf = new Map(days.map((day, i) => [day, i]));
  const slot = width / days.length;

  const x = (t) => {
    const day = startOfDayWib(t);
    const timeOfDay = (t - day) / DAY_MS;
    return (indexOf.get(day) + DAY_PADDING + (1 - 2 * DAY_PADDING) * timeOfDay) * slot;
  };

  return { x, days, slot };
}

export function dayMarks(days, slot, minLabelPx) {
  const step = Math.max(1, Math.ceil(minLabelPx / slot));
  return days.map((day, i) => ({
    day,
    x: (i + 0.5) * slot,
    labeled: (days.length - 1 - i) % step === 0,
  }));
}

export const toPath = (points, x, y, key) =>
  points.map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(1)} ${y(p[key]).toFixed(1)}`).join('');
