'use client';

import { trpc } from '@/app/providers/TRPCProvider';

interface InterestRateChartProps {
  weeks?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

interface HistoryEntry {
  calendarWeek: number;
  year: number;
  snapshotDate: Date;
  topRate: number;
  avgRate10y80pct: number | null;
  avgRate10y90pct: number | null;
}

/**
 * InterestRateChart - Zeigt die Zinsentwicklung der letzten Wochen
 * Verwendet SVG für ein leichtgewichtiges Chart ohne externe Abhängigkeiten
 */
export function InterestRateChart({
  weeks = 10,
  height = 160,
  showLabels = true,
  className = '',
}: InterestRateChartProps) {
  const { data: history, isLoading, error } = trpc.interestRates.getHistory.useQuery(
    { weeks },
    {
      staleTime: 1000 * 60 * 60, // 1 hour cache
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-surface rounded-lg ${className}`} style={{ height }}>
        <div className="h-full flex items-center justify-center text-text-secondary text-sm">
          Lade Zinsentwicklung...
        </div>
      </div>
    );
  }

  if (error || !history || history.length === 0) {
    return null; // Kein Chart anzeigen wenn keine Daten
  }

  // Sort history chronologically (oldest first)
  const sortedHistory = [...history].reverse() as HistoryEntry[];
  const rates = sortedHistory.map(h => h.topRate);
  const minRate = Math.min(...rates) - 0.3;
  const maxRate = Math.max(...rates) + 0.3;
  const range = maxRate - minRate || 1;

  const width = 400;
  const padding = { top: 20, right: 20, bottom: showLabels ? 30 : 10, left: showLabels ? 45 : 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate line path
  const points = sortedHistory.map((h, i) => {
    const x = padding.left + (i / (sortedHistory.length - 1 || 1)) * chartWidth;
    const y = padding.top + ((maxRate - h.topRate) / range) * chartHeight;
    return { x, y, data: h };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Generate area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  return (
    <div className={`relative ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="rateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showLabels && [0, 0.5, 1].map((p, i) => {
          const y = padding.top + p * chartHeight;
          const rateValue = maxRate - p * range;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-text-secondary text-[10px]"
              >
                {rateValue.toFixed(2)}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#rateGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#10b981"
              className="transition-all hover:r-6"
            />
            {/* Week label */}
            {showLabels && i % Math.ceil(sortedHistory.length / 5) === 0 && (
              <text
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-text-secondary text-[9px]"
              >
                KW{point.data.calendarWeek}
              </text>
            )}
          </g>
        ))}

        {/* Current rate indicator */}
        {points.length > 0 && (
          <g>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="6"
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
            />
            {showLabels && (
              <text
                x={points[points.length - 1].x}
                y={points[points.length - 1].y - 12}
                textAnchor="middle"
                className="fill-primary font-semibold text-xs"
              >
                {sortedHistory[sortedHistory.length - 1].topRate.toFixed(2)}%
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * InterestRateInfo - Kompakte Anzeige des aktuellen Marktzinses
 */
export function InterestRateInfo({ className = '' }: { className?: string }) {
  const { data: currentRate } = trpc.interestRates.getCurrent.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  if (!currentRate) return null;

  return (
    <div className={`flex items-center gap-2 text-xs text-text-secondary ${className}`}>
      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span>
        Aktueller Marktzins: <span className="text-primary font-medium">{currentRate.interestRate?.toFixed(2)}%</span>
        {currentRate.calendarWeek && currentRate.year && (
          <span className="ml-1 opacity-70">
            (KW{currentRate.calendarWeek}/{currentRate.year})
          </span>
        )}
      </span>
    </div>
  );
}

export default InterestRateChart;
