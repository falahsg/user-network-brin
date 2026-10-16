import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClientCount, mergeRows } from '../api.js';
import { KAWASAN, SESSIONS, REFRESH_MS } from '../constants.js';

const ENDPOINTS = KAWASAN.flatMap((k) => SESSIONS.map((s) => [k.id, s.id]));

export function useDashboardData() {
  const [state, setState] = useState({ raw: {}, data: {}, errors: {}, loading: true, updatedAt: null });
  const controller = useRef(null);

  const load = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState((s) => ({ ...s, loading: true }));

    const results = await Promise.allSettled(ENDPOINTS.map(([k, s]) => fetchClientCount(k, s, ctrl.signal)));
    if (ctrl.signal.aborted) return;

    setState((prev) => {
      const raw = { ...prev.raw };
      const errors = {};
      results.forEach((r, i) => {
        const key = ENDPOINTS[i].join('/');
        if (r.status === 'fulfilled') raw[key] = r.value;
        else errors[key] = r.reason?.message || 'Gagal memuat';
      });
      const data = Object.fromEntries(
        KAWASAN.map((k) => {
          const lists = SESSIONS.map((s) => raw[`${k.id}/${s.id}`]).filter(Boolean);
          return [k.id, lists.length ? mergeRows(lists) : undefined];
        })
      );
      return { raw, data, errors, loading: false, updatedAt: Date.now() };
    });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(id);
      controller.current?.abort();
    };
  }, [load]);

  return { ...state, reload: load };
}
