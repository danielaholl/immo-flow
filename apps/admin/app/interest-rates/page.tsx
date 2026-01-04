'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface InterestRateStats {
  totalUpdates: number;
  latestUpdate: {
    calendarWeek: number;
    year: number;
    topRate: number;
    uploadDate: string;
  } | null;
  matrixStats: {
    totalEntries: number;
    minRate: number | null;
    maxRate: number | null;
  };
}

interface InterestRateUpdate {
  id: string;
  calendarWeek: number;
  year: number;
  topRate: number;
  imageUrl: string | null;
  status: string;
  extractionConfidence: number | null;
  uploadDate: string;
  createdAt: string;
}

interface MatrixEntry {
  loanToValue: number;
  fixedRateYears: number;
  interestRate: number;
}

interface HistoryEntry {
  calendarWeek: number;
  year: number;
  snapshotDate: string;
  topRate: number;
  avgRate10y80pct: number | null;
  avgRate10y90pct: number | null;
}

export default function InterestRatesPage() {
  const [stats, setStats] = useState<InterestRateStats | null>(null);
  const [updates, setUpdates] = useState<InterestRateUpdate[]>([]);
  const [matrix, setMatrix] = useState<MatrixEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedMatrix, setEditedMatrix] = useState<MatrixEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [latestUpdateId, setLatestUpdateId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/interest-rates/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch matrix
  const fetchMatrix = async () => {
    try {
      const res = await fetch(`${API_URL}/api/interest-rates/matrix`);
      if (res.ok) {
        const data = await res.json();
        setMatrix(data.matrix || []);
        setEditedMatrix(data.matrix || []); // Initialize edited state
        setLatestUpdateId(data.update?.id || null); // Store update ID
      }
    } catch (error) {
      console.error('Error fetching matrix:', error);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/interest-rates/history?weeks=12`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Fetch updates list
  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/interest-rates/updates?page=${page}&pageSize=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload image
  const uploadImage = async (file: File) => {
    setUploading(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/interest-rates/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: 'success',
          text: `Zinsdaten erfolgreich extrahiert! KW${data.data.calendarWeek}/${data.data.year}, TOP-ZINS: ${data.data.topRate}%`,
        });
        // Refresh all data
        fetchStats();
        fetchMatrix();
        fetchHistory();
        fetchUpdates();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.details || error.error || 'Fehler beim Upload' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler beim Upload' });
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        uploadImage(file);
      } else {
        setMessage({ type: 'error', text: 'Bitte nur Bilddateien hochladen' });
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0]);
    }
  };

  // Save matrix changes
  const saveMatrixChanges = async () => {
    if (!latestUpdateId) {
      setMessage({ type: 'error', text: 'Keine Update-ID gefunden' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/interest-rates/matrix/${latestUpdateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ matrix: editedMatrix }),
      });

      if (res.ok) {
        const data = await res.json();
        setMatrix(data.matrix || []);
        setEditedMatrix(data.matrix || []);
        setIsEditMode(false);
        setMessage({
          type: 'success',
          text: 'Zinsmatrix erfolgreich aktualisiert',
        });
        // Refresh stats and history
        fetchStats();
        fetchHistory();
      } else {
        const error = await res.json();
        setMessage({
          type: 'error',
          text: error.details || error.error || 'Fehler beim Speichern',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler beim Speichern' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedMatrix([...matrix]); // Reset to original
    setIsEditMode(false);
  };

  // Update single cell
  const updateMatrixCell = (ltv: number, years: number, newRate: string) => {
    const rateValue = parseFloat(newRate);

    // Validation
    if (newRate === '' || isNaN(rateValue) || rateValue < 0 || rateValue >= 20) {
      return; // Invalid input, ignore
    }

    setEditedMatrix(prev =>
      prev.map(entry =>
        entry.loanToValue === ltv && entry.fixedRateYears === years
          ? { ...entry, interestRate: rateValue }
          : entry
      )
    );
  };

  // Check if matrix has changes
  const hasChanges = () => {
    return editedMatrix.some((edited, idx) => {
      const original = matrix[idx];
      return !original || edited.interestRate !== original.interestRate;
    });
  };

  useEffect(() => {
    fetchStats();
    fetchMatrix();
    fetchHistory();
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [page]);

  // Format rate
  const formatRate = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) return '-';
    return `${Number(rate).toFixed(2)}%`;
  };

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

  // Get matrix value (with edit support)
  const getMatrixRate = (ltv: number, years: number): number | null => {
    const sourceMatrix = isEditMode ? editedMatrix : matrix;
    const entry = sourceMatrix.find(m => m.loanToValue === ltv && m.fixedRateYears === years);
    return entry?.interestRate ?? null;
  };

  // Chart simple SVG
  const renderChart = () => {
    if (history.length === 0) return null;

    const sortedHistory = [...history].reverse();
    const rates = sortedHistory.map(h => h.topRate);
    const minRate = Math.min(...rates) - 0.5;
    const maxRate = Math.max(...rates) + 0.5;
    const range = maxRate - minRate || 1;

    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const points = sortedHistory.map((h, i) => {
      const x = padding + (i / (sortedHistory.length - 1 || 1)) * chartWidth;
      const y = padding + ((maxRate - h.topRate) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="mt-4">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={padding + p * chartHeight}
              x2={width - padding}
              y2={padding + p * chartHeight}
              stroke="#333"
              strokeDasharray="4"
            />
            <text x={padding - 5} y={padding + p * chartHeight + 4} textAnchor="end" fill="#888" fontSize="10">
              {(maxRate - p * range).toFixed(2)}%
            </text>
          </g>
        ))}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
        />

        {/* Points */}
        {sortedHistory.map((h, i) => {
          const x = padding + (i / (sortedHistory.length - 1 || 1)) * chartWidth;
          const y = padding + ((maxRate - h.topRate) / range) * chartHeight;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#10b981" />
              <text x={x} y={height - 10} textAnchor="middle" fill="#888" fontSize="10">
                KW{h.calendarWeek}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

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
          <a href="/interest-rates" className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
            Finanzierung
          </a>
          <a href="/calculator-defaults" className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface">
            Rechner-Defaults
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-text-primary">Finanzierung</h2>
            <p className="text-text-secondary mt-2">
              Woechentliche Zinsupdates hochladen und verwalten
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
                {stats?.latestUpdate ? formatRate(stats.latestUpdate.topRate) : '-'}
              </div>
              <div className="text-text-secondary mt-1">TOP-ZINS aktuell</div>
              {stats?.latestUpdate && (
                <div className="text-xs text-text-secondary mt-2">
                  KW{stats.latestUpdate.calendarWeek}/{stats.latestUpdate.year}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">{stats?.totalUpdates || 0}</div>
              <div className="text-text-secondary mt-1">Gesamt Updates</div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">
                {stats?.matrixStats?.minRate ? formatRate(stats.matrixStats.minRate) : '-'}
              </div>
              <div className="text-text-secondary mt-1">Min. Zinssatz</div>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <div className="text-3xl font-bold text-text-primary">
                {stats?.matrixStats?.maxRate ? formatRate(stats.matrixStats.maxRate) : '-'}
              </div>
              <div className="text-text-secondary mt-1">Max. Zinssatz</div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-surface rounded-xl p-6 border border-border mb-8">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Neues Zinsupdate hochladen</h3>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="text-text-secondary">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  Verarbeite Bild mit AI...
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-4">📷</div>
                  <p className="text-text-secondary mb-4">
                    ZINSUPDATE-Bild hierher ziehen oder klicken zum Auswaehlen
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                  >
                    Bild auswaehlen
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Current Matrix */}
          {matrix.length > 0 && (
            <div className="bg-surface rounded-xl p-6 border border-border mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text-primary">Aktuelle Zinsmatrix</h3>

                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                  >
                    Bearbeiten
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface/80 transition-colors disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={saveMatrixChanges}
                      disabled={isSaving || !hasChanges()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Speichert...' : 'Speichern'}
                    </button>
                  </div>
                )}
              </div>

              {isEditMode && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
                  Bearbeitungsmodus: Klicken Sie auf eine Zelle, um den Wert zu ändern.
                  Änderungen werden erst nach Klick auf "Speichern" übernommen.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-text-secondary font-medium">
                        Beleihung / Zinsbindung
                      </th>
                      <th className="text-center py-3 px-4 text-text-secondary font-medium">5 Jahre</th>
                      <th className="text-center py-3 px-4 text-text-secondary font-medium">10 Jahre</th>
                      <th className="text-center py-3 px-4 text-text-secondary font-medium">15 Jahre</th>
                      <th className="text-center py-3 px-4 text-text-secondary font-medium">20 Jahre</th>
                      <th className="text-center py-3 px-4 text-text-secondary font-medium">30 Jahre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[50, 70, 80, 90, 100].map(ltv => (
                      <tr key={ltv} className="border-b border-border/50 hover:bg-surface/50">
                        <td className="py-3 px-4 text-text-primary font-medium">{ltv}%</td>
                        {[5, 10, 15, 20, 30].map(years => {
                          const rate = getMatrixRate(ltv, years);
                          const isHighlighted = ltv === 80 && years === 10;
                          const originalEntry = matrix.find(
                            m => m.loanToValue === ltv && m.fixedRateYears === years
                          );
                          const editedEntry = editedMatrix.find(
                            m => m.loanToValue === ltv && m.fixedRateYears === years
                          );
                          const isChanged =
                            hasChanges() &&
                            originalEntry &&
                            editedEntry &&
                            originalEntry.interestRate !== editedEntry.interestRate;

                          return (
                            <td
                              key={years}
                              className={`py-3 px-4 text-center ${
                                isHighlighted ? 'font-semibold text-primary' : 'text-text-primary'
                              }`}
                            >
                              {isEditMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="20"
                                  value={rate !== null ? rate.toFixed(2) : ''}
                                  onChange={e => updateMatrixCell(ltv, years, e.target.value)}
                                  className={`w-full px-2 py-1 text-center bg-surface border rounded ${
                                    isChanged ? 'border-yellow-500 bg-yellow-500/10' : 'border-border'
                                  } focus:outline-none focus:border-primary`}
                                />
                              ) : (
                                formatRate(rate)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* History Chart */}
          {history.length > 0 && (
            <div className="bg-surface rounded-xl p-6 border border-border mb-8">
              <h3 className="text-xl font-semibold text-text-primary mb-4">Zinsentwicklung</h3>
              {renderChart()}
            </div>
          )}

          {/* Updates List */}
          <div className="bg-surface rounded-xl p-6 border border-border">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Vergangene Updates</h3>

            {loading ? (
              <div className="text-center py-8 text-text-secondary">Lade Updates...</div>
            ) : updates.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Noch keine Updates vorhanden. Laden Sie ein Zinsupdate-Bild hoch.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Woche</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">TOP-ZINS</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Konfidenz</th>
                        <th className="text-left py-3 px-4 text-text-secondary font-medium">Hochgeladen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updates.map(update => (
                        <tr key={update.id} className="border-b border-border/50 hover:bg-surface/50">
                          <td className="py-3 px-4 text-text-primary">
                            KW{update.calendarWeek}/{update.year}
                          </td>
                          <td className="py-3 px-4 text-primary font-semibold">
                            {formatRate(update.topRate)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                update.status === 'processed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : update.status === 'error'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {update.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">
                            {update.extractionConfidence
                              ? `${(update.extractionConfidence * 100).toFixed(0)}%`
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-text-secondary">{formatDate(update.uploadDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-surface border border-border rounded-lg disabled:opacity-50"
                    >
                      Zurueck
                    </button>
                    <span className="px-4 py-2 text-text-secondary">
                      Seite {page} von {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-surface border border-border rounded-lg disabled:opacity-50"
                    >
                      Weiter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
