'use client';

import { useState, useEffect } from 'react';

interface PropertyStats {
  total: number;
  active: number;
  sold: number;
  archived: number;
  inactive: number;
  pending: number;
}

interface PropertyData {
  id: string;
  title: string;
  price: number;
  location: string;
  rooms: number;
  sqm: number;
  status: string;
  created_at: string;
  user_id: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
}

export default function PropertiesPage() {
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [data, setData] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/stats`);
      if (res.ok) {
        const result = await res.json();
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_URL}/api/properties/list?${params}`);
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

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statusLabels: Record<string, string> = {
    active: 'Aktiv',
    sold: 'Verkauft',
    archived: 'Archiviert',
    inactive: 'Inaktiv',
    pending: 'Ausstehend',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success/10 text-success',
    sold: 'bg-info/10 text-info',
    archived: 'bg-text-tertiary/10 text-text-tertiary',
    inactive: 'bg-warning/10 text-warning',
    pending: 'bg-primary/10 text-primary',
  };

  const getOwnerName = (property: PropertyData) => {
    if (property.owner_first_name || property.owner_last_name) {
      return `${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim();
    }
    return '-';
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
          <a href="/properties" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
            🏠 Objekte
          </a>
          <a href="/bookings" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            📅 Abos
          </a>
          <a href="/analytics" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            📈 Analysen
          </a>
          <a href="/market-data" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
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
          <h2 className="text-3xl font-bold text-text-primary mb-2">Properties</h2>
          <p className="text-text-secondary">Alle Immobilien im System</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🏠</div>
            <div className="text-2xl font-bold text-text-primary">{stats?.total.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Gesamt</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-success">{stats?.active.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Aktiv</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-info">{stats?.sold.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Verkauft</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold text-text-tertiary">{stats?.archived.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Archiviert</div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">Filter & Suche</h3>

          <div className="flex gap-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg bg-background text-text-primary"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="sold">Verkauft</option>
              <option value="archived">Archiviert</option>
              <option value="inactive">Inaktiv</option>
              <option value="pending">Ausstehend</option>
            </select>

            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <input
                type="text"
                placeholder="Titel oder Ort suchen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-text-primary flex-1 max-w-md"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
              >
                Suchen
              </button>
            </form>

            {(search || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-background"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Titel</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Preis</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Ort</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Zimmer</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">m²</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Eigentümer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    Lädt...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    Keine Properties gefunden
                  </td>
                </tr>
              ) : (
                data.map((property) => (
                  <tr key={property.id} className="border-t border-border hover:bg-background/50">
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">
                      {property.title}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{formatPrice(property.price)}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{property.location}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{property.rooms}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{property.sqm}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${statusColors[property.status] || 'bg-surface'}`}
                      >
                        {statusLabels[property.status] || property.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{getOwnerName(property)}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{formatDate(property.created_at)}</td>
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
