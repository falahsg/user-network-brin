import { useEffect, useState } from 'react';
import { Menu, Refresh } from './components/Icons.jsx';
import Sidebar from './components/Sidebar.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { useDashboardData } from './hooks/useDashboardData.js';
import { useTheme } from './hooks/useTheme.js';
import DashboardPage from './pages/DashboardPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import { fmtTime } from './utils/format.js';

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash === 'search' || hash === 'search-devices' || hash === 'cari-perangkat') {
    return 'search';
  }
  return 'dashboard';
}

export default function App() {
  const { data, raw, errors, loading, updatedAt, reload } = useDashboardData();
  const { theme, toggle: toggleTheme } = useTheme();

  const [activePage, setActivePage] = useState(getPageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 960;
    }
    return true;
  });

  // Sync hash routing so back/forward works without reload
  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync sidebar open state smoothly across window resize
  useEffect(() => {
    let prevWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (prevWidth <= 960 && currentWidth > 960) {
        setSidebarOpen(true);
      } else if (prevWidth > 960 && currentWidth <= 960) {
        setSidebarOpen(false);
      }
      prevWidth = currentWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = (pageId) => {
    setActivePage(pageId);
    window.location.hash = pageId === 'dashboard' ? '' : pageId;
    if (window.innerWidth <= 960) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className={`app-layout${sidebarOpen ? ' sidebar-open' : ' sidebar-collapsed'}`}>
      <div className={`progress${loading && activePage === 'dashboard' ? ' on' : ''}`} aria-hidden="true" />

      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-body">
        <header className="top app-header">
          <div className="header-left">
            <button
              type="button"
              className="icon-btn hamburger-btn"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
              aria-expanded={sidebarOpen}
            >
              <Menu />
            </button>

            <div className="header-titles">
              {activePage === 'dashboard' ? (
                <>
                  <h1>Statistic User Network</h1>
                  <p className="sub">Jumlah User per jenis koneksi, kawasan Gatsu, Ancol, dan Pejaten</p>
                </>
              ) : (
                <>
                  <h1>Cari Pemilik Perangkat</h1>
                  <p className="sub">Pencarian perangkat jaringan berdasarkan Username atau MAC Address</p>
                </>
              )}
            </div>
          </div>

          <div className="actions">
            {activePage === 'dashboard' && (
              <>
                <span className="stamp" aria-live="polite">
                  {updatedAt ? `Diperbarui ${fmtTime(updatedAt)}` : 'Memuat…'}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={reload}
                  disabled={loading}
                  aria-label="Muat ulang data"
                  title="Muat ulang data"
                >
                  <Refresh className={loading ? 'spin' : ''} />
                </button>
              </>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        <main className="main-content">
          {activePage === 'dashboard' ? (
            <DashboardPage
              data={data}
              raw={raw}
              errors={errors}
              loading={loading}
              updatedAt={updatedAt}
            />
          ) : (
            <SearchPage />
          )}
        </main>
      </div>
    </div>
  );
}
