import { SESSIONS } from '../constants.js';
import { fmtDay, fmtNumber } from '../utils/format.js';

function describe(list) {
  if (!list) return 'belum dimuat';
  if (!list.length) return '0 data';
  const times = list.map((r) => r.time);
  return `${fmtNumber(list.length)} data (${fmtDay(Math.min(...times))} – ${fmtDay(Math.max(...times))})`;
}

export default function SourceInfo({ raw, kawasan }) {
  return (
    <details className="source">
      <summary>Detail sumber data API</summary>
      <ul>
        {SESSIONS.map((s) => (
          <li key={s.id}>
            <code>/client-count/{kawasan}/{s.id}</code>: {describe(raw[`${kawasan}/${s.id}`])}
          </li>
        ))}
      </ul>
      <p>Sesi Pagi/Siang di dashboard ditentukan dari jam WIB (sebelum 12.00 = Pagi), sehingga data satu endpoint bisa terbagi ke kedua sesi.</p>
    </details>
  );
}
