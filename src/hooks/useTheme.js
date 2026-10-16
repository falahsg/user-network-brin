import { useCallback, useState } from 'react';

const META_COLOR = { dark: '#0b1220', light: '#1e3a5f' };

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('switching'); 
    root.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* penyimpanan dinonaktifkan: tema tetap berlaku untuk sesi ini */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[next]);
    setTimeout(() => root.classList.remove('switching'), 450);
  }, [theme]);

  return { theme, toggle };
}
