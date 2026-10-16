import { METRICS, SESSIONS } from '../constants.js';
import { fmtDateTime, fmtNumber } from '../utils/format.js';

const sessionName = (id) => SESSIONS.find((s) => s.id === id)?.label ?? id;

export default function DataTable({ rows }) {
  const latest = [...rows].reverse();
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabel pencatatan, dapat digulir">
      <table>
        <thead>
          <tr>
            <th scope="col">Waktu pencatatan</th>
            <th scope="col">Sesi</th>
            {METRICS.map((m) => (
              <th key={m.key} scope="col" className="num">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {latest.map((r, i) => (
            <tr key={r.id} style={{ '--i': Math.min(i, 12) }}>
              <th scope="row">{fmtDateTime(r.time)}</th>
              <td>
                <span className={`badge ${r.session}`}>{sessionName(r.session)}</span>
              </td>
              {METRICS.map((m) => (
                <td key={m.key} className="num">
                  {fmtNumber(r[m.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
