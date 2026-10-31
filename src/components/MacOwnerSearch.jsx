import { useCallback, useRef, useState } from 'react';
import { normalizeMacAddress, searchMacOwners } from '../api.js';
import { Check, Clear, Copy, Refresh, Search } from './Icons.jsx';
import Segmented from './Segmented.jsx';
import { fmtDateTime } from '../utils/format.js';

const SEARCH_TYPES = [
  { id: 'username', label: 'Username' },
  { id: 'mac', label: 'MAC Address' },
];

export default function MacOwnerSearch() {
  const [searchType, setSearchType] = useState('username');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [lastSearched, setLastSearched] = useState(null);
  const [copiedMac, setCopiedMac] = useState(null);

  const controllerRef = useRef(null);

  const executeSearch = useCallback(
    async (type, val) => {
      const trimmed = val?.trim();
      if (!trimmed) return;

      const effectiveQuery = type === 'mac' ? normalizeMacAddress(trimmed) : trimmed;

      controllerRef.current?.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const owners = await searchMacOwners(type, effectiveQuery, ctrl.signal);
        setResults(owners);
        setLastSearched({ type, query: effectiveQuery });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Gagal memuat data dari server API');
          setResults(null);
          setLastSearched({ type, query: effectiveQuery });
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchType, query);
  };

  const handleReset = () => {
    controllerRef.current?.abort();
    setQuery('');
    setResults(null);
    setError(null);
    setLastSearched(null);
  };

  const handleTypeChange = (newType) => {
    setSearchType(newType);
    if (newType === 'mac' && query.trim()) {
      setQuery((q) => normalizeMacAddress(q));
    }
  };

  const handleQuickExample = (type, val) => {
    setSearchType(type);
    setQuery(val);
    executeSearch(type, val);
  };

  const copyToClipboard = (mac) => {
    navigator.clipboard?.writeText(mac);
    setCopiedMac(mac);
    setTimeout(() => {
      setCopiedMac((cur) => (cur === mac ? null : cur));
    }, 2000);
  };

  const placeholder =
    searchType === 'username'
      ? 'Masukkan username akun (contoh: titi024)'
      : 'Masukkan MAC (contoh: CC:2D:83:88:23:53)';

  return (
    <section className="panel search-panel" aria-labelledby="search-heading">
      <div className="panel-head search-panel-head">
        <div>
          <h2 id="search-heading">Pencarian Pemilik Perangkat</h2>
          <p className="search-subtitle">
            Cari data pemilik perangkat jaringan berdasarkan Username atau MAC Address
          </p>
        </div>
      </div>

      <form className="search-form" onSubmit={handleSubmit} role="search">
        <div className="search-type-wrap">
          <Segmented
            label="Cari Berdasarkan"
            options={SEARCH_TYPES}
            value={searchType}
            onChange={handleTypeChange}
          />
        </div>

        <div className="field search-input-field">
          <label htmlFor="search-input" className="field-label">
            {searchType === 'username' ? 'Username Akun' : 'Alamat MAC'}
          </label>
          <div className="search-input-row">
            <div className="search-bar">
              <span className="search-icon-prefix" aria-hidden="true">
                <Search />
              </span>
              <input
                id="search-input"
                type="text"
                className="search-input"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setQuery('')}
                  title="Hapus teks"
                  aria-label="Hapus teks"
                >
                  <Clear />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="search-submit-btn"
              disabled={loading || !query.trim()}
              title="Mulai pencarian"
            >
              {loading ? (
                <Refresh className="spin" />
              ) : (
                <>
                  <Search />
                  <span>Cari</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Example Chips */}
      <div className="search-examples">
        <span className="example-label">Contoh:</span>
        <div className="example-chips">
          <button
            type="button"
            className="example-chip"
            onClick={() => handleQuickExample('username', 'titi024')}
          >
            User: <code>titi024</code>
          </button>
          <button
            type="button"
            className="example-chip"
            onClick={() => handleQuickExample('mac', 'CC:2D:83:88:23:53')}
          >
            MAC: <code>CC:2D:83:88:23:53</code>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <p className="alert search-alert" role="alert">
          {error}. Pastikan koneksi ke server API mac-owners aktif.
        </p>
      )}

      {/* Search results summary header with Reset button */}
      {lastSearched && results !== null && !error && (
        <div className="search-results-header">
          <div className="search-meta">
            <span className="search-meta-text">
              Hasil {lastSearched.type === 'username' ? 'Username' : 'MAC Address'}:{' '}
              <strong>{lastSearched.query}</strong>
            </span>
            <span className="search-count-badge">
              {results.length} perangkat ditemukan
            </span>
          </div>

          <button
            type="button"
            className="btn-reset"
            onClick={handleReset}
            title="Bersihkan hasil pencarian"
          >
            <Clear />
            <span>Bersihkan</span>
          </button>
        </div>
      )}

      {/* Zero results */}
      {results !== null && results.length === 0 && !error && (
        <p className="empty">
          Tidak ditemukan data perangkat untuk {lastSearched?.type === 'username' ? 'username' : 'MAC address'}{' '}
          <strong>&ldquo;{lastSearched?.query}&rdquo;</strong>.
        </p>
      )}

      {/* Results View */}
      {results && results.length > 0 && (
        <>
          {/* Desktop Table View (>= 681px) */}
          <div
            className="search-desktop-table table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tabel data pemilik perangkat, dapat digulir"
          >
            <table className="search-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '48px' }}>#</th>
                  <th scope="col">Username</th>
                  <th scope="col">MAC Address</th>
                  <th scope="col">Hostname / Perangkat</th>
                  <th scope="col">Waktu Dibuat</th>
                  <th scope="col">Waktu Diperbarui</th>
                </tr>
              </thead>
              <tbody>
                {results.map((owner, idx) => (
                  <tr key={owner.id || idx} style={{ '--i': Math.min(idx, 15) }}>
                    <td className="num-col">{idx + 1}</td>
                    <td>
                      {lastSearched?.type === 'mac' ? (
                        <button
                          type="button"
                          className="clickable-link"
                          title={`Cari semua perangkat milik ${owner.username}`}
                          onClick={() => handleQuickExample('username', owner.username)}
                        >
                          {owner.username}
                        </button>
                      ) : (
                        <span className="user-badge">{owner.username}</span>
                      )}
                    </td>
                    <td>
                      <div className="mac-cell">
                        {lastSearched?.type === 'username' ? (
                          <button
                            type="button"
                            className="clickable-link mac-code"
                            title={`Cari pemilik MAC ${owner.mac_address}`}
                            onClick={() => handleQuickExample('mac', owner.mac_address)}
                          >
                            {owner.mac_address}
                          </button>
                        ) : (
                          <code className="mac-code">{owner.mac_address}</code>
                        )}
                        <button
                          type="button"
                          className={`copy-mac-btn${copiedMac === owner.mac_address ? ' copied' : ''}`}
                          onClick={() => copyToClipboard(owner.mac_address)}
                          title={copiedMac === owner.mac_address ? 'Tersalin ke clipboard!' : 'Salin MAC Address'}
                          aria-label="Salin MAC Address"
                        >
                          {copiedMac === owner.mac_address ? <Check /> : <Copy />}
                        </button>
                      </div>
                    </td>
                    <td>
                      {owner.hostname ? (
                        <span className="hostname-text">{owner.hostname}</span>
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                    <td>
                      {owner.created_at ? (
                        fmtDateTime(new Date(owner.created_at))
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                    <td>
                      {owner.updated_at ? (
                        fmtDateTime(new Date(owner.updated_at))
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< 681px) */}
          <div className="search-mobile-cards" role="list" aria-label="Daftar perangkat pemilik">
            {results.map((owner, idx) => (
              <div key={owner.id || idx} className="owner-card" role="listitem">
                <div className="owner-card-head">
                  <div className="owner-card-user">
                    <span className="owner-num-badge">#{idx + 1}</span>
                    {lastSearched?.type === 'mac' ? (
                      <button
                        type="button"
                        className="clickable-link user-highlight"
                        onClick={() => handleQuickExample('username', owner.username)}
                        title={`Cari semua perangkat milik ${owner.username}`}
                      >
                        {owner.username}
                      </button>
                    ) : (
                      <span className="user-highlight">{owner.username}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`copy-mac-pill${copiedMac === owner.mac_address ? ' copied' : ''}`}
                    onClick={() => copyToClipboard(owner.mac_address)}
                    title={copiedMac === owner.mac_address ? 'Tersalin!' : 'Salin MAC'}
                  >
                    {copiedMac === owner.mac_address ? <Check /> : <Copy />}
                    <span>{copiedMac === owner.mac_address ? 'Tersalin' : 'Salin MAC'}</span>
                  </button>
                </div>

                <div className="owner-card-details">
                  <div className="owner-card-item">
                    <span className="owner-item-label">MAC Address</span>
                    {lastSearched?.type === 'username' ? (
                      <button
                        type="button"
                        className="clickable-link mac-code"
                        onClick={() => handleQuickExample('mac', owner.mac_address)}
                        title={`Cari pemilik MAC ${owner.mac_address}`}
                      >
                        {owner.mac_address}
                      </button>
                    ) : (
                      <code className="mac-code">{owner.mac_address}</code>
                    )}
                  </div>

                  <div className="owner-card-item">
                    <span className="owner-item-label">Hostname / Perangkat</span>
                    <span className="owner-hostname-val">
                      {owner.hostname || <span className="muted-text">Tidak ada hostname</span>}
                    </span>
                  </div>

                  <div className="owner-card-footer">
                    <div className="owner-time-col">
                      <span className="owner-item-label">Dibuat</span>
                      <span className="owner-time-val">
                        {owner.created_at ? fmtDateTime(new Date(owner.created_at)) : '—'}
                      </span>
                    </div>
                    {owner.updated_at && (
                      <div className="owner-time-col">
                        <span className="owner-item-label">Diperbarui</span>
                        <span className="owner-time-val">
                          {fmtDateTime(new Date(owner.updated_at))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
