'use client';

import React from 'react';
import { trpc } from '../../../lib/trpc';
import { TrendingUp, Calendar } from 'lucide-react';

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format currency in thousands (e.g., 1.324 K)
const formatCurrencyK = (amount: number): string => {
  const thousands = amount / 1000;
  return `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(thousands)} K`;
};

interface PortfolioChartsProps {
  summary?: {
    totalValue: number;
    totalEquity: number;
    totalInvestment?: number;
    totalMonthlyCashflow: number;
    totalMonthlyRent?: number;
    totalMonthlyDebtService?: number;
    averageYield: number;
  } | null;
}

export function PortfolioCharts({ summary }: PortfolioChartsProps) {
  const { data: history, isLoading } = trpc.portfolio.getPerformanceHistory.useQuery(
    { period: '1y' },
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  const hasHistory = history && history.length > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Portfolio-Entwicklung</h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Chart Area */}
        {!hasHistory ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Calendar className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Noch keine historischen Daten</p>
            <p className="text-sm">Die Entwicklung wird über Zeit erfasst</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* GIK (left) and Current Value (right) */}
            <div className="flex items-center justify-between px-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">GIK</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {summary?.totalInvestment ? formatCurrency(summary.totalInvestment) : '–'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400">Aktueller Wert</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {summary?.totalValue ? formatCurrency(summary.totalValue) : '–'}
                </p>
              </div>
            </div>

            {/* Timeline visualization */}
            <div>
              {/* Line chart visualization */}
              {(() => {
                const chartWidth = 500;
                const chartHeight = 160;
                const padding = { top: 20, right: 10, bottom: 30, left: 50 };
                const innerWidth = chartWidth - padding.left - padding.right;
                const innerHeight = chartHeight - padding.top - padding.bottom;

                // Historical data
                const historyValues = history.map((h: any) => Number(h.total_value) || 0);
                const maxValue = Math.max(...historyValues);
                const minValue = Math.min(...historyValues);
                const range = maxValue - minValue || 1;

                // Determine trend color based on first vs last value
                const firstValue = historyValues[0];
                const lastValue = historyValues[historyValues.length - 1];
                const changePercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

                // Green if rising (>1%), Orange if flat (-1% to 1%), Red if falling (<-1%)
                let trendColor = '#F59E0B'; // Orange (flat)
                let trendColorLight = '#FCD34D';
                if (changePercent > 1) {
                  trendColor = '#10B981'; // Green (rising)
                  trendColorLight = '#6EE7B7';
                } else if (changePercent < -1) {
                  trendColor = '#EF4444'; // Red (falling)
                  trendColorLight = '#FCA5A5';
                }

                // Generate history points
                const historyPoints = history.map((point: any, index: number) => {
                  const x = padding.left + (index / (history.length - 1 || 1)) * innerWidth;
                  const y = padding.top + innerHeight - ((Number(point.total_value) - minValue) / range) * innerHeight;
                  return { x, y, value: Number(point.total_value), month: point.month };
                });

                // Create SVG paths
                const historyLinePath = historyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const historyAreaPath = `${historyLinePath} L ${historyPoints[historyPoints.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

                return (
                  <div className="relative">
                    <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                      {/* Gradient definitions */}
                      <defs>
                        <linearGradient id="historyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={trendColor} stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Y-axis line */}
                      <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={padding.left}
                        y2={chartHeight - padding.bottom}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />

                      {/* X-axis line */}
                      <line
                        x1={padding.left}
                        y1={chartHeight - padding.bottom}
                        x2={chartWidth - padding.right}
                        y2={chartHeight - padding.bottom}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />

                      {/* Horizontal grid lines */}
                      <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={chartWidth - padding.right}
                        y2={padding.top}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                      />
                      <line
                        x1={padding.left}
                        y1={padding.top + innerHeight / 2}
                        x2={chartWidth - padding.right}
                        y2={padding.top + innerHeight / 2}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                      />

                      {/* History filled area */}
                      <path d={historyAreaPath} fill="url(#historyGradient)" />

                      {/* History line */}
                      <path
                        d={historyLinePath}
                        fill="none"
                        stroke={trendColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Start dot */}
                      <circle cx={historyPoints[0].x} cy={historyPoints[0].y} r="4" fill={trendColorLight} />

                      {/* Current value dot */}
                      <circle
                        cx={historyPoints[historyPoints.length - 1].x}
                        cy={historyPoints[historyPoints.length - 1].y}
                        r="5"
                        fill={trendColor}
                      />

                      {/* X-axis labels - show months */}
                      {historyPoints.map((point, index) => {
                        // Show label every 2-3 months to avoid crowding
                        const showLabel = history.length <= 6 || index % Math.ceil(history.length / 6) === 0 || index === history.length - 1;
                        if (!showLabel) return null;
                        const date = new Date(point.month);
                        const isLast = index === history.length - 1;
                        return (
                          <text
                            key={index}
                            x={point.x}
                            y={chartHeight - 6}
                            fontSize="8"
                            fill={isLast ? '#6b7280' : '#9ca3af'}
                            fontWeight={isLast ? '500' : 'normal'}
                            textAnchor="middle"
                          >
                            {date.toLocaleDateString('de-DE', { month: 'short' })}
                          </text>
                        );
                      })}

                      {/* Y-axis labels */}
                      <text x={padding.left - 5} y={padding.top + 4} fontSize="8" fill="#9ca3af" textAnchor="end">
                        {formatCurrencyK(maxValue)}
                      </text>
                      <text x={padding.left - 5} y={padding.top + innerHeight / 2 + 3} fontSize="8" fill="#9ca3af" textAnchor="end">
                        {formatCurrencyK((maxValue + minValue) / 2)}
                      </text>
                      <text x={padding.left - 5} y={chartHeight - padding.bottom} fontSize="8" fill="#9ca3af" textAnchor="end">
                        {formatCurrencyK(minValue)}
                      </text>
                    </svg>
                  </div>
                );
              })()}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
