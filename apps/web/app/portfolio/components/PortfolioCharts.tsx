'use client';

import React, { useState } from 'react';
import { trpc } from '../../../lib/trpc';
import { TrendingUp, Calendar, Receipt, Sparkles, Landmark } from 'lucide-react';

type Period = '3m' | '6m' | '1y' | 'all';

// Default forecast assumptions
const FORECAST_DEFAULTS = {
  valueIncreasePA: 1.0,    // Wertsteigerung p.a. in %
  rentIncreasePA: 3.0,     // Mietsteigerung p.a. in %
  costIncreasePA: 3.0,     // Kostensteigerung p.a. in %
  forecastYears: 10,       // Prognose-Zeitraum in Jahren
};

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PortfolioChartsProps {
  summary?: {
    totalValue: number;
    totalEquity: number;
    totalMonthlyCashflow: number;
    totalMonthlyRent?: number;
    totalMonthlyDebtService?: number;
    averageYield: number;
  } | null;
}

export function PortfolioCharts({ summary }: PortfolioChartsProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [showForecast, setShowForecast] = useState(true);

  const { data: history, isLoading } = trpc.portfolio.getPerformanceHistory.useQuery(
    { period },
    { enabled: true }
  );

  const periods: { value: Period; label: string }[] = [
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1J' },
    { value: 'all', label: 'Alle' },
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const hasHistory = history && history.length > 0;
  const latestHistory = hasHistory ? history[history.length - 1] : null;

  // Use summary data if available, fallback to history
  const monthlyRent = summary?.totalMonthlyRent || Number(latestHistory?.total_rent) || 0;
  const monthlyDebtService = summary?.totalMonthlyDebtService || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Portfolio-Entwicklung</h3>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    period === p.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Forecast Toggle */}
            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showForecast
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title="Prognose anzeigen"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Prognose</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Current Values Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">Mieteinnahmen</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(monthlyRent)}/Mo</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(monthlyRent * 12)}/Jahr
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">Kapitaldienst</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(monthlyDebtService)}/Mo</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(monthlyDebtService * 12)}/Jahr
            </p>
          </div>
        </div>

        {/* Chart Area */}
        {!hasHistory ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
            <Calendar className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Noch keine historischen Daten</p>
            <p className="text-sm">Die Entwicklung wird über Zeit erfasst</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline visualization */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Wertentwicklung {showForecast && '+ Prognose'}</span>
                <span>
                  {history.length} {history.length === 1 ? 'Monat' : 'Monate'}
                  {showForecast && ` + ${FORECAST_DEFAULTS.forecastYears}J Prognose`}
                </span>
              </div>

              {/* Line chart visualization with forecast */}
              {(() => {
                const chartWidth = 400;
                const chartHeight = 140;
                const padding = { top: 15, right: 15, bottom: 25, left: 15 };
                const innerWidth = chartWidth - padding.left - padding.right;
                const innerHeight = chartHeight - padding.top - padding.bottom;

                // Historical data
                const historyValues = history.map((h: any) => Number(h.total_value) || 0);
                const lastHistoryValue = historyValues[historyValues.length - 1];
                const lastHistoryRent = Number(history[history.length - 1]?.total_rent) || 0;
                const lastHistoryEquity = Number(history[history.length - 1]?.total_equity) || 0;

                // Generate forecast data (10 years = 120 months)
                const forecastMonths = showForecast ? FORECAST_DEFAULTS.forecastYears * 12 : 0;
                const forecastData: { value: number; rent: number; equity: number }[] = [];

                if (showForecast) {
                  // Use default forecast values
                  const monthlyValueGrowth = Math.pow(1 + FORECAST_DEFAULTS.valueIncreasePA / 100, 1/12);
                  const monthlyRentGrowth = Math.pow(1 + FORECAST_DEFAULTS.rentIncreasePA / 100, 1/12);

                  let forecastValue = lastHistoryValue;
                  let forecastRent = lastHistoryRent;
                  let forecastEquity = lastHistoryEquity;

                  for (let i = 1; i <= forecastMonths; i++) {
                    forecastValue *= monthlyValueGrowth;
                    forecastRent *= monthlyRentGrowth;
                    // Simplified equity growth (value growth + rent accumulation factor)
                    forecastEquity = forecastEquity * monthlyValueGrowth + (forecastRent * 0.3); // Assume 30% of rent goes to equity

                    // Only add yearly points for cleaner visualization
                    if (i % 12 === 0) {
                      forecastData.push({ value: forecastValue, rent: forecastRent, equity: forecastEquity });
                    }
                  }
                }

                // Combine for scale calculation
                const allValues = [...historyValues, ...forecastData.map(f => f.value)];
                const maxValue = Math.max(...allValues);
                const minValue = Math.min(...allValues);
                const range = maxValue - minValue || 1;

                // Calculate how much space for history vs forecast
                const totalPoints = history.length + (showForecast ? forecastData.length : 0);
                const historyWidth = showForecast
                  ? (history.length / totalPoints) * innerWidth
                  : innerWidth;
                const forecastWidth = innerWidth - historyWidth;

                // Generate history points
                const historyPoints = history.map((point: any, index: number) => {
                  const x = padding.left + (index / (history.length - 1 || 1)) * historyWidth;
                  const y = padding.top + innerHeight - ((Number(point.total_value) - minValue) / range) * innerHeight;
                  return { x, y, value: Number(point.total_value), month: point.month };
                });

                // Generate forecast points
                const forecastPoints = forecastData.map((point, index) => {
                  const x = padding.left + historyWidth + ((index + 1) / forecastData.length) * forecastWidth;
                  const y = padding.top + innerHeight - ((point.value - minValue) / range) * innerHeight;
                  const futureDate = new Date();
                  futureDate.setFullYear(futureDate.getFullYear() + index + 1);
                  return { x, y, value: point.value, year: futureDate.getFullYear() };
                });

                // Create SVG paths
                const historyLinePath = historyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const historyAreaPath = `${historyLinePath} L ${historyPoints[historyPoints.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

                // Forecast path starts from last history point
                const forecastLinePath = showForecast && forecastPoints.length > 0
                  ? `M ${historyPoints[historyPoints.length - 1].x} ${historyPoints[historyPoints.length - 1].y} ` +
                    forecastPoints.map(p => `L ${p.x} ${p.y}`).join(' ')
                  : '';

                const forecastAreaPath = showForecast && forecastPoints.length > 0
                  ? `M ${historyPoints[historyPoints.length - 1].x} ${historyPoints[historyPoints.length - 1].y} ` +
                    forecastPoints.map(p => `L ${p.x} ${p.y}`).join(' ') +
                    ` L ${forecastPoints[forecastPoints.length - 1].x} ${chartHeight - padding.bottom} L ${historyPoints[historyPoints.length - 1].x} ${chartHeight - padding.bottom} Z`
                  : '';

                const lastForecastValue = forecastData.length > 0 ? forecastData[forecastData.length - 1].value : lastHistoryValue;

                return (
                  <div className="relative">
                    <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                      {/* Gradient definitions */}
                      <defs>
                        <linearGradient id="historyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(147, 51, 234)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="forecastGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(251, 191, 36)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Separator line between history and forecast */}
                      {showForecast && (
                        <line
                          x1={padding.left + historyWidth}
                          y1={padding.top}
                          x2={padding.left + historyWidth}
                          y2={chartHeight - padding.bottom}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* History filled area */}
                      <path d={historyAreaPath} fill="url(#historyGradient)" />

                      {/* Forecast filled area */}
                      {showForecast && forecastAreaPath && (
                        <path d={forecastAreaPath} fill="url(#forecastGradient)" />
                      )}

                      {/* History line */}
                      <path
                        d={historyLinePath}
                        fill="none"
                        stroke="rgb(147, 51, 234)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Forecast line (dashed) */}
                      {showForecast && forecastLinePath && (
                        <path
                          d={forecastLinePath}
                          fill="none"
                          stroke="rgb(251, 191, 36)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="6 4"
                        />
                      )}

                      {/* Start dot */}
                      <circle cx={historyPoints[0].x} cy={historyPoints[0].y} r="4" fill="rgb(192, 132, 252)" />

                      {/* Current value dot */}
                      <circle
                        cx={historyPoints[historyPoints.length - 1].x}
                        cy={historyPoints[historyPoints.length - 1].y}
                        r="5"
                        fill="rgb(147, 51, 234)"
                      />

                      {/* Forecast end dot */}
                      {showForecast && forecastPoints.length > 0 && (
                        <circle
                          cx={forecastPoints[forecastPoints.length - 1].x}
                          cy={forecastPoints[forecastPoints.length - 1].y}
                          r="5"
                          fill="rgb(251, 191, 36)"
                        />
                      )}

                      {/* X-axis labels */}
                      <text x={padding.left} y={chartHeight - 6} fontSize="9" fill="#9ca3af" textAnchor="start">
                        {new Date(history[0].month).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                      </text>
                      <text x={padding.left + historyWidth} y={chartHeight - 6} fontSize="9" fill="#6b7280" fontWeight="500" textAnchor="middle">
                        Heute
                      </text>
                      {showForecast && forecastPoints.length > 0 && (
                        <text x={chartWidth - padding.right} y={chartHeight - 6} fontSize="9" fill="#f59e0b" textAnchor="end">
                          {forecastPoints[forecastPoints.length - 1].year}
                        </text>
                      )}

                      {/* Y-axis labels */}
                      <text x={padding.left + 2} y={padding.top + 2} fontSize="8" fill="#9ca3af" textAnchor="start">
                        {formatCurrency(maxValue)}
                      </text>
                      <text x={padding.left + 2} y={chartHeight - padding.bottom - 4} fontSize="8" fill="#9ca3af" textAnchor="start">
                        {formatCurrency(minValue)}
                      </text>

                      {/* Forecast value label */}
                      {showForecast && forecastPoints.length > 0 && (
                        <text
                          x={forecastPoints[forecastPoints.length - 1].x - 5}
                          y={forecastPoints[forecastPoints.length - 1].y - 8}
                          fontSize="9"
                          fill="#f59e0b"
                          fontWeight="600"
                          textAnchor="end"
                        >
                          {formatCurrency(lastForecastValue)}
                        </text>
                      )}
                    </svg>

                    {/* Legend */}
                    {showForecast && (
                      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-0.5 bg-purple-500 rounded"></div>
                          <span className="text-gray-500">Historisch</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-0.5 bg-amber-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(251,191,36) 0px, rgb(251,191,36) 4px, transparent 4px, transparent 8px)' }}></div>
                          <span className="text-gray-500">Prognose ({FORECAST_DEFAULTS.valueIncreasePA}% p.a.)</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-400 text-center">
              Werte werden monatlich aktualisiert. Ändere den Marktwert deiner Immobilien, um die Entwicklung zu verfolgen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
