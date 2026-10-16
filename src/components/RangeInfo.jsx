import { fmtCount, fmtDateTime, fmtDay } from '../utils/format.js';
import { DAY_MS } from '../utils/time.js';

const STALE_AFTER_DAYS = 2;

export default function RangeInfo({ win, range, shown, total, updatedAt, last, span }) {
  if (!win) return null;
  const ageDays = last ? Math.floor((win.end - last.time) / DAY_MS) : 0;
  const partial = span && (fmtDay(span[0]) !== fmtDay(win.start) || fmtDay(span[1]) !== fmtDay(win.end));

  return (
    <>
      <div className="range-info">
        <p className="range-main">
          <strong>
            {fmtDay(win.start)} – {fmtDay(win.end)}
          </strong>
          <span>{range ? `${range} hari terakhir` : 'Semua data'}</span>
        </p>
        <p className="range-sub">
          {fmtCount(shown, total)}
          {partial && ` · Data tersedia ${fmtDay(span[0])} – ${fmtDay(span[1])}`}
          {updatedAt && ` · Terakhir diperbarui ${fmtDateTime(updatedAt)}`}
        </p>
      </div>

      {ageDays > STALE_AFTER_DAYS && (
        <p className="meta stale">
          Pencatatan terakhir {fmtDateTime(last.time)} ({ageDays} hari lalu), data sesi ini belum diperbarui.
        </p>
      )}
      {last && shown === 0 && <p className="meta">Tidak ada pencatatan pada rentang ini. Pilih rentang Semua untuk melihat seluruh riwayat.</p>}
    </>
  );
}
