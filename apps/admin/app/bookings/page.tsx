'use client';

import { useState, useEffect } from 'react';

interface BookingStats {
  totalMRR: number;
  totalActive: number;
  byPlan: Record<string, { count: number; revenue: number }>;
}

interface MRRHistory {
  month: string;
  mrr: number;
}

interface SubscriptionData {
  id: string;
  email: string;
  plan_type: string;
  status: string;
  price: number;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  cancel_at_period_end: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  investor: 'Investor',
  pro: 'Pro',
  sucher: 'Sucher',
  makler_pro: 'Makler Pro',
  makler_enterprise: 'Makler Enterprise',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  trialing: 'Testphase',
  canceled: 'Gekündigt',
  past_due: 'Überfällig',
  incomplete: 'Unvollständig',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trialing: 'bg-info/10 text-info',
  canceled: 'bg-warning/10 text-warning',
  past_due: 'bg-error/10 text-error',
  incomplete: 'bg-text-tertiary/10 text-text-tertiary',
};

export default function BookingsPage() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [history, setHistory] = useState<MRRHistory[]>([]);
  const [data, setData] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/stats`);
      if (res.ok) {
        const result = await res.json();
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/history`);
      if (res.ok) {
        const result = await res.json();
        setHistory(result);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_URL}/api/bookings/list?${params}`);
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
    fetchHistory();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      month: 'short',
      year: '2-digit',
    });
  };

  const maxMRR = Math.max(...history.map((h) => h.mrr), 1);

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
          <a href="/bookings" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
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
          <h2 className="text-3xl font-bold text-text-primary mb-2">Abonnements</h2>
          <p className="text-text-secondary">MRR und Abonnement-Übersicht</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-success">{stats ? formatCurrency(stats.totalMRR) : '-'}</div>
            <div className="text-sm text-text-secondary">Monatlicher Umsatz (MRR)</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-text-primary">{stats?.totalActive.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Aktive Abonnements</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-2xl font-bold text-info">
              {stats ? formatCurrency(stats.totalMRR * 12) : '-'}
            </div>
            <div className="text-sm text-text-secondary">Jährlicher Umsatz (ARR)</div>
          </div>
        </div>

        {/* Revenue by Plan */}
        {stats && Object.keys(stats.byPlan).length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-text-primary mb-4">Umsatz pro Plan</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.byPlan).map(([plan, data]) => (
                <div key={plan} className="bg-background rounded-lg p-4">
                  <div className="text-sm font-medium text-text-secondary mb-1">
                    {PLAN_LABELS[plan] || plan}
                  </div>
                  <div className="text-lg font-bold text-text-primary">{formatCurrency(data.revenue)}</div>
                  <div className="text-xs text-text-tertiary">{data.count} Abos</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MRR History Chart */}
        {history.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-text-primary mb-4">MRR-Verlauf (letzte 6 Monate)</h3>
            <div className="flex items-end gap-4 h-48">
              {history.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="text-sm font-medium text-text-primary mb-2">
                    {formatCurrency(item.mrr)}
                  </div>
                  <div
                    className="w-full bg-primary rounded-t-lg transition-all"
                    style={{
                      height: `${Math.max((item.mrr / maxMRR) * 100, 5)}%`,
                      minHeight: '8px',
                    }}
                  />
                  <div className="text-xs text-text-secondary mt-2">{formatMonth(item.month)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">Filter</h3>
          <div className="flex gap-4">
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
              <option value="trialing">Testphase</option>
              <option value="canceled">Gekündigt</option>
              <option value="past_due">Überfällig</option>
            </select>

            {statusFilter && (
              <button
                onClick={() => {
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
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">E-Mail</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Preis/Monat</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Aktiv seit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Endet am</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    Lädt...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    Keine Abonnements gefunden
                  </td>
                </tr>
              ) : (
                data.map((sub) => (
                  <tr key={sub.id} className="border-t border-border hover:bg-background/50">
                    <td className="px-4 py-3 text-text-primary">{sub.email || '-'}</td>
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {PLAN_LABELS[sub.plan_type] || sub.plan_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[sub.status] || 'bg-surface'}`}
                      >
                        {STATUS_LABELS[sub.status] || sub.status}
                        {sub.cancel_at_period_end && ' (kündigt)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{formatCurrency(sub.price)}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {formatDate(sub.current_period_start)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {formatDate(sub.current_period_end)}
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
