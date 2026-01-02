'use client';

import { useState, useEffect } from 'react';

interface CalculatorDefaults {
  id: string;
  buildingRatioStandard: number;
  buildingRatioNeubau: number;
  maintenanceCostPerSqm: number;
  nonAllocableHausgeldRatio: number;
  costIncreaseRate: number;
  rentIncreaseRate: number;
  valueAppreciationRate: number;
  hausgeldPerSqmModern: number;
  hausgeldPerSqmOld: number;
  isActive: boolean;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  currentDefaults: Record<string, string>;
  rawDefaults: CalculatorDefaults;
  historyCount: number;
  usersWithCustomPrefs: number;
  lastUpdated: string;
  lastChangedBy: string | null;
}

interface HistoryEntry {
  id: string;
  defaultsId: string;
  buildingRatioStandard: number | null;
  buildingRatioNeubau: number | null;
  maintenanceCostPerSqm: number | null;
  nonAllocableHausgeldRatio: number | null;
  costIncreaseRate: number | null;
  rentIncreaseRate: number | null;
  valueAppreciationRate: number | null;
  hausgeldPerSqmModern: number | null;
  hausgeldPerSqmOld: number | null;
  changedBy: string;
  changeReason: string | null;
  changedAt: string;
}

export default function CalculatorDefaultsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [defaults, setDefaults] = useState<CalculatorDefaults | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    buildingRatioStandard: 0.8,
    buildingRatioNeubau: 0.85,
    maintenanceCostPerSqm: 10,
    nonAllocableHausgeldRatio: 0.3,
    costIncreaseRate: 0.02,
    rentIncreaseRate: 0.03,
    valueAppreciationRate: 0.02,
    hausgeldPerSqmModern: 2.5,
    hausgeldPerSqmOld: 3.5,
  });
  const [changeReason, setChangeReason] = useState('');
  const [changedBy, setChangedBy] = useState('Admin');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/calculator-defaults/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch defaults
  const fetchDefaults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calculator-defaults`);
      if (res.ok) {
        const data = await res.json();
        setDefaults(data);
        setFormData({
          buildingRatioStandard: data.buildingRatioStandard,
          buildingRatioNeubau: data.buildingRatioNeubau,
          maintenanceCostPerSqm: data.maintenanceCostPerSqm,
          nonAllocableHausgeldRatio: data.nonAllocableHausgeldRatio,
          costIncreaseRate: data.costIncreaseRate,
          rentIncreaseRate: data.rentIncreaseRate,
          valueAppreciationRate: data.valueAppreciationRate,
          hausgeldPerSqmModern: data.hausgeldPerSqmModern,
          hausgeldPerSqmOld: data.hausgeldPerSqmOld,
        });
      }
    } catch (error) {
      console.error('Error fetching defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/calculator-defaults/history?page=${historyPage}&pageSize=10`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setHistoryTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Save defaults
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!changeReason.trim()) {
      setMessage({ type: 'error', text: 'Bitte geben Sie einen Aenderungsgrund an' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/calculator-defaults`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          changedBy,
          changeReason: changeReason.trim(),
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Standardwerte erfolgreich aktualisiert' });
        setChangeReason('');
        fetchStats();
        fetchDefaults();
        fetchHistory();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Fehler beim Speichern' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDefaults();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [historyPage]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format percentage
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Format currency
  const formatCurrency = (value: number) => `${value.toFixed(2)} EUR`;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border p-6">
        <h1 className="text-2xl font-bold text-primary mb-8">Rendito Admin</h1>

        <nav className="space-y-2">
          <a href="/" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Dashboard
          </a>
          <a href="/users" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Benutzer
          </a>
          <a href="/properties" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Immobilien
          </a>
          <a href="/bookings" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Abonnements
          </a>
          <a href="/analytics" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Analytics
          </a>
          <a href="/market-data" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Marktdaten
          </a>
          <a href="/interest-rates" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Zinssaetze
          </a>
          <a
            href="/calculator-defaults"
            className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            Rechner-Defaults
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-text-primary">Rechner-Standardwerte</h2>
            <p className="text-text-secondary mt-2">
              Globale Standardwerte fuer Rendite-, Steuer- und Eigennutzer-Berechnungen
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-primary">
                {stats?.currentDefaults?.buildingRatioStandard || '80%'}
              </div>
              <div className="text-text-secondary mt-1">Gebaeudeanteil</div>
              <div className="text-xs text-text-secondary mt-2">Standard (Bestand)</div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">
                {stats?.currentDefaults?.maintenanceCostPerSqm || '10.00 EUR/m2/Jahr'}
              </div>
              <div className="text-text-secondary mt-1">Instandhaltung</div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">{stats?.historyCount || 0}</div>
              <div className="text-text-secondary mt-1">Aenderungen</div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">{stats?.usersWithCustomPrefs || 0}</div>
              <div className="text-text-secondary mt-1">User mit Overrides</div>
            </div>
          </div>

          {/* Form */}
          {loading ? (
            <div className="bg-surface rounded-xl p-8 border border-border text-center text-text-secondary">
              Lade Standardwerte...
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-surface rounded-xl p-6 border border-border mb-8">
              <h3 className="text-xl font-semibold text-text-primary mb-6">Standardwerte bearbeiten</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Gebäudeanteil Standard */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Gebaeudeanteil Standard (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.buildingRatioStandard}
                    onChange={e => setFormData({ ...formData, buildingRatioStandard: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.buildingRatioStandard)}
                  </div>
                </div>

                {/* Gebäudeanteil Neubau */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Gebaeudeanteil Neubau (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.buildingRatioNeubau}
                    onChange={e => setFormData({ ...formData, buildingRatioNeubau: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.buildingRatioNeubau)}
                  </div>
                </div>

                {/* Instandhaltungskosten */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Instandhaltung (EUR/m2/Jahr)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={formData.maintenanceCostPerSqm}
                    onChange={e => setFormData({ ...formData, maintenanceCostPerSqm: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatCurrency(formData.maintenanceCostPerSqm)}/m2/Jahr
                  </div>
                </div>

                {/* Nicht-umlagefähiges Hausgeld */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Nicht-umlagefaehiges Hausgeld (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.nonAllocableHausgeldRatio}
                    onChange={e =>
                      setFormData({ ...formData, nonAllocableHausgeldRatio: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.nonAllocableHausgeldRatio)}
                  </div>
                </div>

                {/* Kostensteigerung */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Kostensteigerung p.a. (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="0.5"
                    value={formData.costIncreaseRate}
                    onChange={e => setFormData({ ...formData, costIncreaseRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.costIncreaseRate)}/Jahr
                  </div>
                </div>

                {/* Mietsteigerung */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Mietsteigerung p.a. (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="0.5"
                    value={formData.rentIncreaseRate}
                    onChange={e => setFormData({ ...formData, rentIncreaseRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.rentIncreaseRate)}/Jahr
                  </div>
                </div>

                {/* Wertsteigerung */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Wertsteigerung p.a. (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="-0.2"
                    max="0.5"
                    value={formData.valueAppreciationRate}
                    onChange={e => setFormData({ ...formData, valueAppreciationRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatPercent(formData.valueAppreciationRate)}/Jahr
                  </div>
                </div>

                {/* Hausgeld Modern */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Hausgeld/m2 Modern (ab 1980)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={formData.hausgeldPerSqmModern}
                    onChange={e => setFormData({ ...formData, hausgeldPerSqmModern: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatCurrency(formData.hausgeldPerSqmModern)}/m2
                  </div>
                </div>

                {/* Hausgeld Alt */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Hausgeld/m2 Altbau (vor 1980)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={formData.hausgeldPerSqmOld}
                    onChange={e => setFormData({ ...formData, hausgeldPerSqmOld: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-text-secondary mt-1">
                    Aktuell: {formatCurrency(formData.hausgeldPerSqmOld)}/m2
                  </div>
                </div>
              </div>

              {/* Change reason */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Geaendert von
                  </label>
                  <input
                    type="text"
                    value={changedBy}
                    onChange={e => setChangedBy(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    placeholder="Ihr Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Aenderungsgrund *
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={e => setChangeReason(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                    placeholder="z.B. Anpassung an Marktentwicklung"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Speichern...' : 'Aenderungen speichern'}
                </button>
              </div>
            </form>
          )}

          {/* History */}
          <div className="bg-surface rounded-xl p-6 border border-border">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Aenderungshistorie</h3>

            {history.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">Noch keine Aenderungen vorhanden.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Datum</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Geaendert von</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Grund</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Gebaeudeanteil</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Instandhaltung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(entry => (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-surface/50">
                          <td className="py-3 px-4 text-text-primary">{formatDate(entry.changedAt)}</td>
                          <td className="py-3 px-4 text-text-primary">{entry.changedBy}</td>
                          <td className="py-3 px-4 text-text-secondary">{entry.changeReason || '-'}</td>
                          <td className="py-3 px-4 text-text-primary">
                            {entry.buildingRatioStandard ? formatPercent(entry.buildingRatioStandard) : '-'}
                          </td>
                          <td className="py-3 px-4 text-text-primary">
                            {entry.maintenanceCostPerSqm ? `${entry.maintenanceCostPerSqm} EUR` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-4 py-2 bg-surface border border-border rounded-lg disabled:opacity-50"
                    >
                      Zurueck
                    </button>
                    <span className="px-4 py-2 text-text-secondary">
                      Seite {historyPage} von {historyTotalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage === historyTotalPages}
                      className="px-4 py-2 bg-surface border border-border rounded-lg disabled:opacity-50"
                    >
                      Weiter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-surface/50 rounded-xl p-6 border border-border/50">
            <h4 className="text-lg font-semibold text-text-primary mb-4">Hinweise zu den Standardwerten</h4>
            <ul className="space-y-2 text-text-secondary">
              <li>
                <strong>Gebaeudeanteil:</strong> Anteil des Kaufpreises, der auf das Gebaeude entfaellt (fuer
                AfA-Berechnung). Standard 80%, Neubauten ab 2024 typischerweise 85%.
              </li>
              <li>
                <strong>Instandhaltungskosten:</strong> Jaehrliche Ruecklage pro Quadratmeter. Empfehlung: 10
                EUR/m2/Jahr fuer mittelalte Gebaeude.
              </li>
              <li>
                <strong>Nicht-umlagefaehiges Hausgeld:</strong> Anteil des Hausgeldes, der nicht auf Mieter umgelegt
                werden kann (Verwaltung, Instandhaltungsruecklage). Typisch: 30%.
              </li>
              <li>
                <strong>Steigerungsraten:</strong> Jaehrliche Prognosen fuer Kosten, Miete und Immobilienwert. Werden
                fuer Break-Even-Analysen und langfristige Renditeprognosen verwendet.
              </li>
              <li>
                <strong>Hausgeld/m2:</strong> Geschaetztes monatliches Hausgeld pro Quadratmeter, wenn keine konkreten
                Angaben vorliegen. Moderne Gebaeude (ab 1980) haben typischerweise niedrigere Kosten.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
