import { useMemo, useState } from 'react';
import Chart from '../components/Chart.jsx';
import DataTable from '../components/DataTable.jsx';
import KpiStrip from '../components/KpiStrip.jsx';
import RangeInfo from '../components/RangeInfo.jsx';
import Segmented from '../components/Segmented.jsx';
import Select from '../components/Select.jsx';
import SourceInfo from '../components/SourceInfo.jsx';
import { KAWASAN, METRICS, RANGES, SESSION_OPTIONS } from '../constants.js';
import { useDashboardView } from '../hooks/useDashboardView.js';
import { buildSeries, filterBySession } from '../utils/dataset.js';
import { fmtCount, fmtNumber } from '../utils/format.js';

const ALL_METRICS = METRICS.map((m) => m.key);
const labelOf = (options, id) => options.find((o) => o.id === id).label;
const withMeta = (options, metaOf) => options.map((o) => ({ ...o, meta: metaOf(o) }));

export default function DashboardPage({ data, raw, errors, loading, updatedAt }) {
  const [kawasan, setKawasan] = useState('gatsu');
  const [session, setSession] = useState('pagi');
  const [range, setRange] = useState(7);
  const [active, setActive] = useState(ALL_METRICS);

  const { allRows, rows, win } = useDashboardView({ data, updatedAt, kawasan, session, range });
  const combined = session === 'semua';
  const series = useMemo(() => buildSeries(active, combined), [active, combined]);
  const solo = active.length === 1 ? active[0] : null;
  const total = allRows?.length ?? 0;

  const key = `${kawasan}/${session}`;
  const view = `${key}/${range}`;
  const error = errors ? errors[Object.keys(errors).find((k) => k.startsWith(`${kawasan}/`))] : null;

  const toggleMetric = (k) =>
    setActive((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]));
  const pickMetric = (k) => setActive(solo === k ? ALL_METRICS : [k]);

  const kawasanOptions = withMeta(KAWASAN, (k) => {
    const latest = data ? filterBySession(data[k.id], session)?.at(-1) : null;
    return latest && `DHCP ${fmtNumber(latest.dhcp)}`;
  });
  const sessionOptions = withMeta(SESSION_OPTIONS, (o) => {
    const n = data ? filterBySession(data[kawasan], o.id)?.length : undefined;
    return n !== undefined && `${fmtNumber(n)} data`;
  });

  const kawasanLabel = labelOf(KAWASAN, kawasan);
  const sessionLabel = labelOf(SESSION_OPTIONS, session);

  return (
    <div className="page-content dashboard-page">
      <section className="controls" aria-label="Filter data">
        <Select label="Kawasan" options={kawasanOptions} value={kawasan} onChange={setKawasan} />
        <Select label="Sesi" options={sessionOptions} value={session} onChange={setSession} />
        <Segmented label="Rentang" options={RANGES} value={range} onChange={setRange} />
      </section>

      {error && (
        <p className="alert" role="alert">
          Sebagian data {kawasanLabel} gagal dimuat ({error}). Periksa koneksi ke server API.
        </p>
      )}

      <RangeInfo
        key={view}
        win={win}
        range={range}
        shown={rows.length}
        total={total}
        updatedAt={updatedAt}
        last={allRows?.at(-1)}
        span={rows.length ? [rows[0].time, rows.at(-1).time] : null}
      />
      <KpiStrip key={key} rows={allRows || []} solo={solo} onPick={pickMetric} showSession={combined} />

      <section className="panel" aria-labelledby="chart-title">
        <div className="panel-head">
          <h2 id="chart-title" key={key} className="swap">
            Tren klien, {kawasanLabel} sesi {sessionLabel}
          </h2>
          <ul className="legend">
            {METRICS.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  aria-pressed={active.includes(m.key)}
                  onClick={() => toggleMetric(m.key)}
                  style={{ '--c': m.color }}
                >
                  <i /> {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {loading && !allRows ? <p className="empty">Memuat data…</p> : <Chart key={view} rows={rows} series={series} />}
      </section>

      <section className="panel" aria-labelledby="table-title">
        <div className="panel-head">
          <h2 id="table-title">Riwayat pencatatan ({fmtCount(rows.length, total)})</h2>
        </div>
        <DataTable key={view} rows={rows} />
        <SourceInfo raw={raw} kawasan={kawasan} />
      </section>
    </div>
  );
}
