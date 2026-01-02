'use client';

import { useState, useEffect } from 'react';

interface UserStats {
  totalUsers: number;
  newThisWeek: number;
  newThisMonth: number;
}

interface UserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  plan_type: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export default function UsersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/stats`);
      if (res.ok) {
        const result = await res.json();
        setStats(result);
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
        ...(search && { search }),
      });

      const res = await fetch(`${API_URL}/api/users/list?${params}`);
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
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const planLabels: Record<string, string> = {
    free: 'Free',
    investor: 'Investor',
    pro: 'Pro',
    sucher: 'Sucher',
    makler_pro: 'Makler Pro',
    makler_enterprise: 'Makler Enterprise',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success/10 text-success',
    trialing: 'bg-info/10 text-info',
    canceled: 'bg-warning/10 text-warning',
    past_due: 'bg-error/10 text-error',
    incomplete: 'bg-text-tertiary/10 text-text-tertiary',
  };

  const getPlanBadge = (user: UserData) => {
    const plan = user.plan_type || 'free';
    const status = user.subscription_status;
    const label = planLabels[plan] || plan;
    const colorClass = status ? statusColors[status] || 'bg-surface' : 'bg-surface text-text-secondary';

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
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
          <a href="/users" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
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
          <h2 className="text-3xl font-bold text-text-primary mb-2">Benutzer</h2>
          <p className="text-text-secondary">Registrierte Benutzer verwalten</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-text-primary">{stats?.totalUsers.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Gesamt Benutzer</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🆕</div>
            <div className="text-2xl font-bold text-success">{stats?.newThisWeek.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Neu diese Woche</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-info">{stats?.newThisMonth.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Neu diesen Monat</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">Suche</h3>

          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="E-Mail, Name oder Firma suchen..."
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
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-background"
              >
                Zurücksetzen
              </button>
            )}
          </form>
        </div>

        {/* Data Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Abo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Vorname</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Nachname</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">E-Mail</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Telefon</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Firma</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Registriert</th>
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
                    Keine Benutzer gefunden
                  </td>
                </tr>
              ) : (
                data.map((user) => (
                  <tr key={user.id} className="border-t border-border hover:bg-background/50">
                    <td className="px-4 py-3">{getPlanBadge(user)}</td>
                    <td className="px-4 py-3 text-text-primary">{user.first_name || '-'}</td>
                    <td className="px-4 py-3 text-text-primary">{user.last_name || '-'}</td>
                    <td className="px-4 py-3 text-text-primary">{user.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.phone || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.company || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{formatDate(user.created_at)}</td>
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
