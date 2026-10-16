import { METRICS, SESSIONS } from '../constants.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { fmtNumber } from '../utils/format.js';
import Sparkline from './Sparkline.jsx';

function Delta({ now, before }) {
  if (before === undefined) return <span className="delta">Data pertama</span>;
  const diff = now - before;
  const pct = before ? (diff / before) * 100 : 0;
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const sign = diff > 0 ? '+' : '';
  return (
    <span className={`delta ${dir}`}>
      <i aria-hidden="true">{diff > 0 ? '▲' : diff < 0 ? '▼' : '■'}</i>
      {sign}
      {fmtNumber(diff)} ({sign}
      {pct.toFixed(1)}%)
    </span>
  );
}

function Kpi({ metric, last, history, index, solo, onPick, showSession }) {
  const prev = history[history.length - 2];
  const value = useCountUp(last ? last[metric.key] : 0);
  const sessionLabel = last && SESSIONS.find((s) => s.id === last.session)?.label;

  return (
    <button
      type="button"
      className="kpi"
      style={{ '--c': metric.color, '--i': index }}
      aria-pressed={solo}
      onClick={() => onPick(metric.key)}
      title={solo ? 'Klik untuk menampilkan semua garis' : `Klik untuk fokus ke garis ${metric.label}`}
    >
      <span className="kpi-name">
        {metric.label}
        {showSession && sessionLabel ? ` · ${sessionLabel}` : ''}
      </span>
      <span className="kpi-value">{last ? fmtNumber(value) : '-'}</span>
      {last && <Delta now={last[metric.key]} before={prev?.[metric.key]} />}
      <Sparkline values={history.slice(-14).map((r) => r[metric.key])} />
    </button>
  );
}

export default function KpiStrip({ rows, solo, onPick, showSession }) {
  const last = rows[rows.length - 1];
  const history = last ? rows.filter((r) => r.session === last.session) : [];

  return (
    <div className="kpis">
      {METRICS.map((m, i) => (
        <Kpi key={m.key} metric={m} last={last} history={history} index={i} solo={solo === m.key} onPick={onPick} showSession={showSession} />
      ))}
    </div>
  );
}
