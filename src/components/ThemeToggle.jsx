import { Moon, Sun } from './Icons.jsx';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <div
      className="glass-theme-toggle"
      role="group"
      aria-label="Pilihan tema tampilan"
    >
      <button
        type="button"
        className={`theme-segment ${!isDark ? 'active' : ''}`}
        onClick={() => {
          if (isDark) onToggle();
        }}
        aria-pressed={!isDark}
        title="Aktifkan Mode Terang (Light)"
      >
        <Sun className="theme-toggle-icon" />
        <span className="theme-toggle-label">Light</span>
      </button>

      <button
        type="button"
        className={`theme-segment ${isDark ? 'active' : ''}`}
        onClick={() => {
          if (!isDark) onToggle();
        }}
        aria-pressed={isDark}
        title="Aktifkan Mode Gelap (Dark)"
      >
        <Moon className="theme-toggle-icon" />
        <span className="theme-toggle-label">Dark</span>
      </button>
    </div>
  );
}
