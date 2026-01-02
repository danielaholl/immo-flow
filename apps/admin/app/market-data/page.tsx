'use client';

import { useState, useEffect } from 'react';

interface MarketDataStats {
  total: number;
  withPrices: number;
  withoutPrices: number;
  lastUpdate: string | null;
  avgConfidence: number;
}

interface PLZData {
  plz: string;
  city: string;
  stadtteil: string | null;
  district: string | null;
  federal_state: string;
  avg_purchase_price_sqm: number | null;
  avg_rent_sqm: number | null;
  confidence_score: number | null;
  updated_at: string | null;
}

interface StateStats {
  federal_state: string;
  total: number;
  with_prices: number;
}

export default function MarketDataPage() {
  const [stats, setStats] = useState<MarketDataStats | null>(null);
  const [stateStats, setStateStats] = useState<StateStats[]>([]);
  const [data, setData] = useState<PLZData[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [onlyWithoutPrices, setOnlyWithoutPrices] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/market-data/stats`);
      if (res.ok) {
        const result = await res.json();
        setStats(result.stats);
        setStateStats(result.byState || []);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        ...(filterState && { state: filterState }),
        ...(filterCity && { city: filterCity }),
        ...(onlyWithoutPrices && { onlyWithoutPrices: 'true' }),
      });

      const res = await fetch(`${API_URL}/api/market-data/list?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger AI estimation
  const handleEstimatePrices = async () => {
    setEstimating(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/market-data/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10, onlyWithoutPrices: true }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: result.message });
        fetchStats();
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Schätzen der Preise' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler' });
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, filterState, filterCity, onlyWithoutPrices]);

  const formatPrice = (price: number | string | null) => {
    if (price === null || price === undefined) return '-';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatRent = (rent: number | string | null) => {
    if (rent === null || rent === undefined) return '-';
    const num = typeof rent === 'string' ? parseFloat(rent) : rent;
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)} €/m²`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border p-6">
        <h1 className="text-2xl font-bold text-primary mb-8">Rendito Admin</h1>

        <nav className="space-y-2">
          <a href="/" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            📊 Dashboard
          </a>
          <a href="/users" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            👥 Benutzer
          </a>
          <a href="/properties" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            🏠 Objekte
          </a>
          <a href="/bookings" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            📅 Abos
          </a>
          <a href="/analytics" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            📈 Analysen
          </a>
          <a href="/market-data" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
            📊 Marktdaten
          </a>
          <a href="/interest-rates" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            💰 Zinssaetze
          </a>
          <a href="/calculator-defaults" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            ⚙️ Rechner-Defaults
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">Marktdaten</h2>
          <p className="text-text-secondary">PLZ-basierte Kaufpreise und Mieten pro m²</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🗺️</div>
            <div className="text-2xl font-bold text-text-primary">{stats?.total.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Gesamt PLZ</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-success">{stats?.withPrices.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Mit Preisen</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-warning">{stats?.withoutPrices.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Ohne Preise</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-text-primary">
              {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '-'}
            </div>
            <div className="text-sm text-text-secondary">Avg. Confidence</div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">Aktionen</h3>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleEstimatePrices}
              disabled={estimating}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {estimating ? '⏳ Schätze Preise...' : '🤖 Preise schätzen (10 PLZ)'}
            </button>

            <div className="text-sm text-text-secondary self-center">
              Verwendet AI um Kaufpreise und Mieten für PLZ ohne Daten zu schätzen.
              <br />
              Kosten: ca. $0.10-0.20 pro Batch (50 PLZ)
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">Filter</h3>

          <div className="flex gap-4 flex-wrap">
            <select
              value={filterState}
              onChange={(e) => {
                setFilterState(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg bg-background text-text-primary"
            >
              <option value="">Alle Bundesländer</option>
              {stateStats.map((s) => (
                <option key={s.federal_state} value={s.federal_state}>
                  {s.federal_state} ({s.total})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Stadt suchen..."
              value={filterCity}
              onChange={(e) => {
                setFilterCity(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg bg-background text-text-primary w-64"
            />

            <label className="flex items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                checked={onlyWithoutPrices}
                onChange={(e) => {
                  setOnlyWithoutPrices(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4"
              />
              Nur ohne Preise
            </label>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">PLZ</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Stadt</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Stadtteil</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Bundesland</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Kaufpreis/m²</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Miete/m²</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                    Lädt...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                    Keine Daten gefunden
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.plz} className="border-t border-border hover:bg-background/50">
                    <td className="px-4 py-3 text-text-primary font-mono">{row.plz}</td>
                    <td className="px-4 py-3 text-text-primary">{row.city}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{row.stadtteil || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{row.federal_state}</td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {formatPrice(row.avg_purchase_price_sqm)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{formatRent(row.avg_rent_sqm)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.confidence_score ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            row.confidence_score >= 0.8
                              ? 'bg-success/10 text-success'
                              : row.confidence_score >= 0.6
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                          }`}
                        >
                          {(row.confidence_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Seite {page} von {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >
                ←
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
