'use client';

import { useState, useEffect } from 'react';

interface AnalyticsStats {
  totalUsers: number;
  newThisWeek: number;
  newThisMonth: number;
  activeSubscribers: number;
  weeklyTrend: number;
}

interface RegistrationData {
  week: string;
  registrations: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/stats`);
      if (res.ok) {
        const result = await res.json();
        setStats(result);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics/registrations`);
      if (res.ok) {
        const result = await res.json();
        setRegistrations(result);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRegistrations();
  }, []);

  const formatWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const maxRegistrations = Math.max(...registrations.map((r) => r.registrations), 1);

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
          <a href="/analytics" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
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
          <h2 className="text-3xl font-bold text-text-primary mb-2">Analytics</h2>
          <p className="text-text-secondary">Nutzer-Aktivität und Wachstum</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-text-primary">{stats?.totalUsers.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Gesamt Nutzer</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🆕</div>
            <div className="text-2xl font-bold text-success">{stats?.newThisWeek.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Neu diese Woche</div>
            {stats && stats.weeklyTrend !== 0 && (
              <div className={`text-xs mt-1 ${stats.weeklyTrend > 0 ? 'text-success' : 'text-error'}`}>
                {stats.weeklyTrend > 0 ? '↑' : '↓'} {Math.abs(stats.weeklyTrend)}% zur Vorwoche
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-info">{stats?.newThisMonth.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Neu diesen Monat</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-warning">{stats?.activeSubscribers.toLocaleString() || '-'}</div>
            <div className="text-sm text-text-secondary">Aktive Abonnenten</div>
          </div>
        </div>

        {/* Registration Chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-text-primary mb-6">Registrierungen pro Woche (letzte 12 Wochen)</h3>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-text-secondary">Lädt...</div>
          ) : registrations.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-secondary">Keine Daten verfügbar</div>
          ) : (
            <div className="flex items-end gap-2 h-64">
              {registrations.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="text-sm font-medium text-text-primary mb-2">{item.registrations}</div>
                  <div
                    className="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80"
                    style={{
                      height: `${Math.max((item.registrations / maxRegistrations) * 100, 5)}%`,
                      minHeight: '8px',
                    }}
                  />
                  <div className="text-xs text-text-secondary mt-2 whitespace-nowrap">{formatWeek(item.week)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {stats && (
          <div className="mt-8 bg-surface border border-border rounded-lg p-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">Zusammenfassung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background rounded-lg p-4">
                <div className="text-sm text-text-secondary">Conversion Rate (Nutzer → Abonnent)</div>
                <div className="text-2xl font-bold text-text-primary">
                  {stats.totalUsers > 0
                    ? `${((stats.activeSubscribers / stats.totalUsers) * 100).toFixed(1)}%`
                    : '-'}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4">
                <div className="text-sm text-text-secondary">Durchschnitt neue Nutzer/Woche</div>
                <div className="text-2xl font-bold text-text-primary">
                  {registrations.length > 0
                    ? Math.round(registrations.reduce((sum, r) => sum + r.registrations, 0) / registrations.length)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
