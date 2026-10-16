import { Moon, Sun } from './Icons.jsx';

export default function ThemeToggle({ theme, onToggle }) {
  const next = theme === 'dark' ? 'terang' : 'gelap';
  return (
    <button type="button" className="icon-btn theme-btn" onClick={onToggle} aria-label={`Ganti ke tema ${next}`} title={`Tema ${next}`}>
      <Sun className="sun" />
      <Moon className="moon" />
    </button>
  );
}
