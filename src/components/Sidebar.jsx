import { Close, Dashboard, Devices } from './Icons.jsx';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Statistik Jaringan', icon: Dashboard },
  { id: 'search', label: 'Cari Perangkat', icon: Devices },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`sidebar-backdrop${isOpen ? ' active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${isOpen ? ' open' : ' closed'}`} role="navigation" aria-label="Menu Utama">
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="brand-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19l4-6 5 4 7-11" />
                <circle cx="4" cy="19" r="1.5" fill="currentColor" />
                <circle cx="20" cy="6" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">BRIN Network</span>
              <span className="brand-sub">Client Monitoring</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            title="Tutup menu sidebar"
          >
            <Close />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => {
                      onNavigate(item.id);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="sidebar-item-label">{item.label}</span>
                    {isActive && <span className="sidebar-active-indicator" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span>Kawasan BRIN</span>
          </div>
          <span className="sidebar-version">v1.1 · React SPA</span>
        </div>
      </aside>
    </>
  );
}
