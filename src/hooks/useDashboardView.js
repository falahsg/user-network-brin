import { useMemo } from 'react';
import { filterBySession, getWindow } from '../utils/dataset.js';

export function useDashboardView({ data, updatedAt, kawasan, session, range }) {
  const allRows = useMemo(() => filterBySession(data[kawasan], session), [data, kawasan, session]);
  const win = useMemo(() => getWindow(range, allRows, updatedAt ?? Date.now()), [range, allRows, updatedAt]);
  const rows = useMemo(() => (win && allRows ? allRows.filter((r) => r.time >= win.start) : []), [allRows, win]);

  return { allRows, rows, win };
}
