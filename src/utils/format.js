const TZ = 'Asia/Jakarta';

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TZ,
});
const dayFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const numberFmt = new Intl.NumberFormat('id-ID');

export const fmtDate = (t) => dateFmt.format(t);
export const fmtDay = (t) => dayFmt.format(t);
export const fmtDateTime = (t) => `${dateTimeFmt.format(t)} WIB`;
export const fmtTime = (t) => `${timeFmt.format(t)} WIB`;
export const fmtNumber = (n) => numberFmt.format(n);

export function niceTicks(max, count = 5) {
  const raw = (max || 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step || step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return { ticks, top };
}

export const fmtCount = (shown, total) =>
  shown === total ? `${fmtNumber(shown)} data` : `${fmtNumber(shown)} dari ${fmtNumber(total)} data`;
