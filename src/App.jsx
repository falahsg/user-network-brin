import { useMemo, useState } from 'react';
import Chart from './components/Chart.jsx';
import DataTable from './components/DataTable.jsx';
import { Refresh } from './components/Icons.jsx';
import KpiStrip from './components/KpiStrip.jsx';
import MacOwnerSearch from './components/MacOwnerSearch.jsx';
import RangeInfo from './components/RangeInfo.jsx';
import Segmented from './components/Segmented.jsx';
import Select from './components/Select.jsx';
import SourceInfo from './components/SourceInfo.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { KAWASAN, METRICS, RANGES, SESSION_OPTIONS } from './constants.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { useDashboardView } from './hooks/useDashboardView.js';
import { useTheme } from './hooks/useTheme.js';
import { buildSeries, filterBySession } from './utils/dataset.js';
import { fmtCount, fmtNumber, fmtTime } from './utils/format.js';

const ALL_METRICS = METRICS.map((m) => m.key);
const labelOf = (options, id) => options.find((o) => o.id === id).label;
const withMeta = (options, metaOf) => options.map((o) => ({ ...o, meta: metaOf(o) }));

export default function App() {
  const { data, raw, errors, loading, updatedAt, reload } = useDashboardData();
  const { theme, toggle: toggleTheme } = useTheme();

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
  const error = errors[Object.keys(errors).find((k) => k.startsWith(`${kawasan}/`))];

  const toggleMetric = (k) =>
    setActive((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]));
  const pickMetric = (k) => setActive(solo === k ? ALL_METRICS : [k]);

  const kawasanOptions = withMeta(KAWASAN, (k) => {
    const latest = filterBySession(data[k.id], session)?.at(-1);
    return latest && `DHCP ${fmtNumber(latest.dhcp)}`;
  });
  const sessionOptions = withMeta(SESSION_OPTIONS, (o) => {
    const n = filterBySession(data[kawasan], o.id)?.length;
    return n !== undefined && `${fmtNumber(n)} data`;
  });

  const kawasanLabel = labelOf(KAWASAN, kawasan);
  const sessionLabel = labelOf(SESSION_OPTIONS, session);

  return (
    <div className="page">
      <div className={`progress${loading ? ' on' : ''}`} aria-hidden="true" />

      <header className="top">
        <div>
          <h1>Statistic User Network</h1>
          <p className="sub">Jumlah User per jenis koneksi, kawasan Gatsu, Ancol, dan Pejaten</p>
        </div>
        <div className="actions">
          <span className="stamp" aria-live="polite">
            <i className="pulse" aria-hidden="true" />
            {updatedAt ? `Diperbarui ${fmtTime(updatedAt)}` : 'Memuat…'}
          </span>
          <button type="button" className="icon-btn" onClick={reload} disabled={loading} aria-label="Muat ulang data" title="Muat ulang data">
            <Refresh className={loading ? 'spin' : ''} />
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main>
        <MacOwnerSearch />

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

        <RangeInfo key={view} win={win} range={range} shown={rows.length} total={total} updatedAt={updatedAt} last={allRows?.at(-1)} span={rows.length ? [rows[0].time, rows.at(-1).time] : null} />
        <KpiStrip key={key} rows={allRows || []} solo={solo} onPick={pickMetric} showSession={combined} />

        <section className="panel" aria-labelledby="chart-title">
          <div className="panel-head">
            <h2 id="chart-title" key={key} className="swap">
              Tren klien, {kawasanLabel} sesi {sessionLabel}
            </h2>
            <ul className="legend">
              {METRICS.map((m) => (
                <li key={m.key}>
                  <button type="button" aria-pressed={active.includes(m.key)} onClick={() => toggleMetric(m.key)} style={{ '--c': m.color }}>
                    <i /> {m.label}
                  </button>
                </li>
              ))}
              {/* {combined && (
                <li className="legend-note">
                  <span className="dash" aria-hidden="true" /> Putus-putus: Siang
                </li>
              )} */}
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
      </main>
    </div>
  );
}
