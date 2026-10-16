import { memo, useMemo, useRef, useState } from 'react';
import { SESSIONS } from '../constants.js';
import { useElementWidth } from '../hooks/useElementWidth.js';
import { createDayScale, dayMarks, toPath } from '../utils/chartMath.js';
import { fmtDate, fmtDateTime, fmtNumber, niceTicks } from '../utils/format.js';

const MARGIN = { top: 14, right: 16, bottom: 28, left: 48 };
const MAX_DOTS = 60;
const MIN_DAY_TICK_PX = 6;

const sessionName = (id) => SESSIONS.find((s) => s.id === id)?.label ?? id;
const appliesTo = (series, row) => !series.session || series.session === row.session;

function buildGeometry({ rows, series, width, height }) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const scale = createDayScale(rows.map((r) => r.time), innerW);
  const x = (t) => MARGIN.left + scale.x(t);

  const maxValue = Math.max(1, ...rows.flatMap((r) => series.filter((s) => appliesTo(s, r)).map((s) => r[s.key])));
  const { ticks, top } = niceTicks(maxValue);
  const y = (v) => MARGIN.top + innerH - (v / top) * innerH;

  const lines = series.map((s) => {
    const pts = s.session ? rows.filter((r) => r.session === s.session) : rows;
    return { ...s, pts, d: toPath(pts, x, y, s.key) };
  });

  const marks = dayMarks(scale.days, scale.slot, width < 520 ? 46 : 52).map((m) => ({ ...m, x: MARGIN.left + m.x }));

  return { x, y, ticks, lines, marks, showDayTicks: scale.slot >= MIN_DAY_TICK_PX, innerH };
}

function Grid({ geo, width, height }) {
  const plotBottom = MARGIN.top + geo.innerH;
  return (
    <>
      {geo.ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={geo.y(v)} y2={geo.y(v)} />
          <text className="tick" x={MARGIN.left - 8} y={geo.y(v)} textAnchor="end" dominantBaseline="middle">
            {fmtNumber(v)}
          </text>
        </g>
      ))}

      {geo.marks.map((m) => {
        const anchor = m.x < MARGIN.left + 24 ? 'start' : m.x > width - MARGIN.right - 24 ? 'end' : 'middle';
        return (
          <g key={m.day}>
            {m.labeled && <line className="grid vgrid" x1={m.x} x2={m.x} y1={MARGIN.top} y2={plotBottom} />}
            {(m.labeled || geo.showDayTicks) && <line className="day-tick" x1={m.x} x2={m.x} y1={plotBottom} y2={plotBottom + 4} />}
            {m.labeled && (
              <text className="tick" x={m.x} y={height - 8} textAnchor={anchor}>
                {fmtDate(m.day)}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function Lines({ geo, showAllDots }) {
  return (
    <>
      {geo.lines.map((l, i) => (
        <path
          key={l.id}
          className={`line${l.dashed ? ' dashed' : ''}`}
          d={l.d}
          pathLength="1"
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ stroke: l.color, animationDelay: `${i * 120}ms` }}
        />
      ))}

      {geo.lines.map((l) => {
        // Seri dengan satu titik tidak membentuk garis, jadi titiknya selalu digambar.
        const dots = showAllDots || l.pts.length === 1 ? l.pts : [];
        return dots.map((r, i) => (
          <circle
            key={`${l.id}-${r.id}`}
            className="dot"
            cx={geo.x(r.time)}
            cy={geo.y(r[l.key])}
            r="3.5"
            strokeWidth="2"
            style={{ stroke: l.color, animationDelay: `${300 + (i / dots.length) * 700}ms` }}
          />
        ));
      })}
    </>
  );
}

// Grafik garis SVG buatan sendiri: tanpa library, sehingga bundle kecil dan cepat.
function Chart({ rows, series }) {
  const wrapRef = useRef(null);
  const width = useElementWidth(wrapRef);
  const [hover, setHover] = useState(null);
  const height = width < 520 ? 260 : 340;

  const geo = useMemo(
    () => (width && rows.length ? buildGeometry({ rows, series, width, height }) : null),
    [rows, series, width, height]
  );

  const onMove = (e) => {
    if (!geo) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let nearest = 0;
    rows.forEach((r, i) => {
      if (Math.abs(geo.x(r.time) - px) < Math.abs(geo.x(rows[nearest].time) - px)) nearest = i;
    });
    setHover(nearest);
  };

  const hoverRow = geo && hover !== null ? rows[hover] : null;
  const hoverX = hoverRow ? geo.x(hoverRow.time) : 0;
  const hoverLines = hoverRow ? geo.lines.filter((l) => appliesTo(l, hoverRow)) : [];

  return (
    <div className="chart" ref={wrapRef} style={{ height }}>
      {!rows.length && <p className="empty">Tidak ada data pada rentang ini.</p>}
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Grafik garis jumlah klien dari waktu ke waktu"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <Grid geo={geo} width={width} height={height} />
          <Lines geo={geo} showAllDots={rows.length <= MAX_DOTS} />

          {hoverRow && (
            <g>
              <line className="cursor" x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={MARGIN.top + geo.innerH} />
              {hoverLines.map((l) => (
                <circle key={l.id} className="hover-dot" cx={hoverX} cy={geo.y(hoverRow[l.key])} r="6" strokeWidth="2.5" style={{ fill: l.color }} />
              ))}
            </g>
          )}
        </svg>
      )}

      {hoverRow && (
        <div className={`tooltip ${hoverX > width / 2 ? 'left' : 'right'}`} style={{ left: hoverX }}>
          <strong>
            {fmtDateTime(hoverRow.time)} · {sessionName(hoverRow.session)}
          </strong>
          {hoverLines.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.label}
              <b>{fmtNumber(hoverRow[s.key])}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(Chart);
