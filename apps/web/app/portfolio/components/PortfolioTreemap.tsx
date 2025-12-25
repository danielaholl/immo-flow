'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Lightbulb,
  Newspaper,
  Activity,
  ChevronRight,
} from 'lucide-react';

// Types
type ColorMode = 'yield' | 'growth' | 'risk';

interface PropertyMetrics {
  totalInvestment: number;
  currentValue: number;
  equity: number;
  monthlyLoanPayment: number;
  monthlyCashflow: number;
  annualCashflow: number;
  grossYield: number;
  cashOnCash: number;
  rentMultiplier: number;
}

interface PortfolioProperty {
  id: string;
  title: string;
  location: string;
  condition?: string | null;
  vacancy_rate?: number;
  metrics: PropertyMetrics;
}

interface PortfolioTreemapProps {
  properties: PortfolioProperty[];
}

// Color mode configuration
const colorModes: { id: ColorMode; label: string; icon: typeof TrendingUp; color: string }[] = [
  { id: 'yield', label: 'Rendite Focus', icon: TrendingUp, color: '#8b5cf6' },
  { id: 'growth', label: 'Wertzuwachs', icon: ArrowUpRight, color: '#22c55e' },
  { id: 'risk', label: 'Risiko Check', icon: ShieldCheck, color: '#ef4444' },
];

// Interpolate between colors based on a value from 0-1
function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get gradient color from red to yellow to green
function getGradientColor(value: number, min: number, max: number, invert: boolean = false): string {
  // Normalize to 0-1 range
  let normalized = max === min ? 0.5 : (value - min) / (max - min);
  normalized = Math.max(0, Math.min(1, normalized));

  if (invert) {
    normalized = 1 - normalized;
  }

  // Red (#ef4444) -> Yellow (#eab308) -> Green (#22c55e)
  if (normalized < 0.5) {
    // Red to Yellow
    return interpolateColor('#ef4444', '#eab308', normalized * 2);
  } else {
    // Yellow to Green
    return interpolateColor('#eab308', '#22c55e', (normalized - 0.5) * 2);
  }
}

// Calculate risk score
function calculateRiskScore(property: PortfolioProperty): number {
  let score = 0;

  // Negative cashflow = +30 risk
  if (property.metrics.monthlyCashflow < 0) score += 30;

  // Poor condition = +25 risk
  if (property.condition === 'needs_work') score += 25;

  // Low yield (<3%) = +20 risk
  if (property.metrics.grossYield < 3) score += 20;

  // High vacancy rate (>10%) = +25 risk
  if (property.vacancy_rate && property.vacancy_rate > 10) score += 25;

  return Math.min(100, score);
}

// Calculate value growth percentage
function calculateValueGrowth(property: PortfolioProperty): number {
  const { totalInvestment, currentValue } = property.metrics;
  if (totalInvestment === 0) return 0;
  return ((currentValue - totalInvestment) / totalInvestment) * 100;
}

// Get color ranges for all properties (for gradient calculations)
interface ColorRanges {
  yield: { min: number; max: number };
  growth: { min: number; max: number };
  risk: { min: number; max: number };
}

function calculateColorRanges(properties: PortfolioProperty[]): ColorRanges {
  if (properties.length === 0) {
    return {
      yield: { min: 0, max: 0 },
      growth: { min: 0, max: 0 },
      risk: { min: 0, max: 0 },
    };
  }

  const yields = properties.map(p => p.metrics.grossYield);
  const growths = properties.map(p => calculateValueGrowth(p));
  const risks = properties.map(p => calculateRiskScore(p));

  return {
    yield: {
      min: Math.min(...yields, 0),
      max: Math.max(...yields, 8), // Cap at 8% for better gradient
    },
    growth: {
      min: Math.min(...growths, -10), // Ensure negative range
      max: Math.max(...growths, 20),  // Ensure positive range
    },
    risk: {
      min: 0,
      max: 100, // Risk score is always 0-100
    },
  };
}

// Get color for property based on mode
function getColorForMode(
  property: PortfolioProperty,
  mode: ColorMode,
  ranges: ColorRanges
): string {
  switch (mode) {
    case 'yield':
      // Higher yield = more green
      return getGradientColor(
        property.metrics.grossYield,
        ranges.yield.min,
        ranges.yield.max,
        false
      );

    case 'growth':
      // Higher growth = more green, negative = red
      const growth = calculateValueGrowth(property);
      return getGradientColor(
        growth,
        ranges.growth.min,
        ranges.growth.max,
        false
      );

    case 'risk':
      // Higher risk = more red (inverted)
      const riskScore = calculateRiskScore(property);
      return getGradientColor(
        riskScore,
        ranges.risk.min,
        ranges.risk.max,
        true // Inverted: high value = red
      );

    default:
      return '#9ca3af';
  }
}

// Get display value for current mode
function getModeDisplayValue(property: PortfolioProperty, mode: ColorMode): string {
  switch (mode) {
    case 'yield':
      return `${property.metrics.grossYield.toFixed(1)}%`;
    case 'growth':
      const growth = calculateValueGrowth(property);
      return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
    case 'risk':
      const score = calculateRiskScore(property);
      if (score <= 25) return 'Niedrig';
      if (score <= 50) return 'Mittel';
      if (score <= 75) return 'Hoch';
      return 'Kritisch';
    default:
      return '';
  }
}

// Get text color based on background
function getTextColor(bgColor: string): string {
  // Simple luminance check
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate AI tip based on portfolio analysis
function generateAITip(properties: PortfolioProperty[]): { title: string; description: string } {
  if (properties.length === 0) {
    return { title: 'Portfolio starten', description: 'Füge deine erste Immobilie hinzu.' };
  }

  const avgYield = properties.reduce((sum, p) => sum + p.metrics.grossYield, 0) / properties.length;
  const negativeCashflowCount = properties.filter(p => p.metrics.monthlyCashflow < 0).length;
  const highRiskCount = properties.filter(p => calculateRiskScore(p) > 50).length;
  const avgGrowth = properties.reduce((sum, p) => sum + calculateValueGrowth(p), 0) / properties.length;

  if (negativeCashflowCount > 0) {
    return {
      title: 'Cashflow optimieren',
      description: `${negativeCashflowCount} ${negativeCashflowCount === 1 ? 'Objekt hat' : 'Objekte haben'} negativen Cashflow. Prüfe Mieterhöhungen.`,
    };
  }

  if (highRiskCount > 0) {
    return {
      title: 'Risiken minimieren',
      description: `${highRiskCount} ${highRiskCount === 1 ? 'Immobilie' : 'Immobilien'} mit erhöhtem Risiko identifiziert.`,
    };
  }

  if (avgYield < 4) {
    return {
      title: 'Rendite steigern',
      description: `Durchschnittsrendite bei ${avgYield.toFixed(1)}%. Marktüblich sind 4-6%.`,
    };
  }

  if (avgGrowth > 5) {
    return {
      title: 'Starke Performance',
      description: `Dein Portfolio wächst mit ${avgGrowth.toFixed(1)}% überdurchschnittlich.`,
    };
  }

  return {
    title: 'Portfolio diversifizieren',
    description: 'Erwäge Investments in verschiedenen Lagen.',
  };
}

// Squarified Treemap Algorithm
interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  property: PortfolioProperty;
}

function squarify(
  properties: PortfolioProperty[],
  containerWidth: number,
  containerHeight: number
): TreemapRect[] {
  if (properties.length === 0) return [];

  // Sort by investment (largest first)
  const sorted = [...properties].sort(
    (a, b) => b.metrics.totalInvestment - a.metrics.totalInvestment
  );

  const totalValue = sorted.reduce((sum, p) => sum + p.metrics.totalInvestment, 0);
  if (totalValue === 0) return [];

  const rects: TreemapRect[] = [];
  let currentX = 0;
  let currentY = 0;
  let remainingWidth = containerWidth;
  let remainingHeight = containerHeight;
  let remainingItems = [...sorted];

  while (remainingItems.length > 0) {
    const isHorizontal = remainingWidth >= remainingHeight;
    const side = isHorizontal ? remainingHeight : remainingWidth;

    // Find the best row
    let row: PortfolioProperty[] = [];
    let rowValue = 0;
    let bestRatio = Infinity;

    for (let i = 0; i < remainingItems.length; i++) {
      const testRow = remainingItems.slice(0, i + 1);
      const testValue = testRow.reduce((sum, p) => sum + p.metrics.totalInvestment, 0);
      const testRemainingValue = remainingItems.reduce((sum, p) => sum + p.metrics.totalInvestment, 0);

      // Calculate the width/height of this row
      const rowSize = (testValue / testRemainingValue) * (isHorizontal ? remainingWidth : remainingHeight);

      // Calculate worst aspect ratio in this row
      let worstRatio = 0;
      for (const item of testRow) {
        const itemSize = (item.metrics.totalInvestment / testValue) * side;
        const ratio = Math.max(rowSize / itemSize, itemSize / rowSize);
        worstRatio = Math.max(worstRatio, ratio);
      }

      if (worstRatio <= bestRatio) {
        bestRatio = worstRatio;
        row = testRow;
        rowValue = testValue;
      } else {
        break;
      }
    }

    if (row.length === 0) {
      row = [remainingItems[0]];
      rowValue = remainingItems[0].metrics.totalInvestment;
    }

    // Calculate row dimensions
    const remainingValue = remainingItems.reduce((sum, p) => sum + p.metrics.totalInvestment, 0);
    const rowLength = (rowValue / remainingValue) * (isHorizontal ? remainingWidth : remainingHeight);

    // Create rectangles for this row
    let offset = 0;
    for (const item of row) {
      const itemSize = (item.metrics.totalInvestment / rowValue) * side;

      if (isHorizontal) {
        rects.push({
          x: currentX,
          y: currentY + offset,
          width: rowLength,
          height: itemSize,
          property: item,
        });
      } else {
        rects.push({
          x: currentX + offset,
          y: currentY,
          width: itemSize,
          height: rowLength,
          property: item,
        });
      }
      offset += itemSize;
    }

    // Update remaining space
    if (isHorizontal) {
      currentX += rowLength;
      remainingWidth -= rowLength;
    } else {
      currentY += rowLength;
      remainingHeight -= rowLength;
    }

    // Remove processed items
    remainingItems = remainingItems.slice(row.length);
  }

  return rects;
}

export function PortfolioTreemap({ properties }: PortfolioTreemapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('yield');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Dynamic height based on number of properties
        const height = Math.max(200, Math.min(400, properties.length * 60));
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [properties.length]);

  // Calculate treemap layout
  const rects = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];
    return squarify(properties, dimensions.width, dimensions.height);
  }, [properties, dimensions]);

  // Calculate color ranges for gradient
  const colorRanges = useMemo(() => calculateColorRanges(properties), [properties]);

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Treemap container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {dimensions.width > 0 && (
          <div
            className="relative"
            style={{ height: dimensions.height }}
          >
            {rects.map((rect) => {
              const bgColor = getColorForMode(rect.property, colorMode, colorRanges);
              const textColor = getTextColor(bgColor);
              const isHovered = hoveredId === rect.property.id;
              const isSmall = rect.width < 100 || rect.height < 80;
              const isTiny = rect.width < 60 || rect.height < 50;

              const modeValue = getModeDisplayValue(rect.property, colorMode);
              const isLarge = rect.width >= 140 && rect.height >= 100;

              return (
                <div
                  key={rect.property.id}
                  onClick={() => router.push(`/portfolio/${rect.property.id}`)}
                  onMouseEnter={() => setHoveredId(rect.property.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`absolute cursor-pointer transition-all duration-200 rounded-lg overflow-hidden ${
                    isHovered ? 'z-10 shadow-lg scale-[1.02]' : 'z-0'
                  }`}
                  style={{
                    left: rect.x + 2,
                    top: rect.y + 2,
                    width: rect.width - 4,
                    height: rect.height - 4,
                    backgroundColor: bgColor,
                    opacity: isHovered ? 1 : 0.9,
                  }}
                >
                  <div className="h-full p-2 flex flex-col justify-between">
                    {/* Title at top */}
                    {!isTiny && (
                      <div className="overflow-hidden" style={{ color: textColor }}>
                        <p
                          className={`font-semibold truncate ${
                            isSmall ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          {rect.property.title}
                        </p>
                      </div>
                    )}

                    {/* Mode value prominently in center */}
                    {!isTiny && (
                      <div className="flex-1 flex items-center justify-center">
                        <p
                          className={`font-bold text-white drop-shadow-md ${
                            isLarge ? 'text-2xl' : isSmall ? 'text-base' : 'text-xl'
                          }`}
                          style={{
                            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          }}
                        >
                          {modeValue}
                        </p>
                      </div>
                    )}

                    {/* Investment at bottom */}
                    {!isTiny && !isSmall && (
                      <div style={{ color: textColor }}>
                        <p className="text-xs opacity-80">
                          {formatCurrency(rect.property.metrics.totalInvestment)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hover tooltip for small tiles */}
                  {isHovered && (isTiny || isSmall) && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-xl z-20 whitespace-nowrap"
                      style={{ minWidth: 150 }}
                    >
                      <p className="font-semibold text-sm">{rect.property.title}</p>
                      <p className="text-xs text-gray-300">{rect.property.location}</p>
                      <p className="text-sm font-bold mt-1">{modeValue}</p>
                      <p className="text-xs text-gray-400">
                        {formatCurrency(rect.property.metrics.totalInvestment)}
                      </p>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                        <div className="border-8 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Color mode badges - Glass design with colored border */}
      <div className="flex flex-wrap justify-center gap-2">
        {colorModes.map((mode) => {
          const isActive = colorMode === mode.id;
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => setColorMode(mode.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-white/95 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'bg-white/40 text-gray-600 backdrop-blur-sm border border-gray-200 hover:bg-white/60 hover:border-gray-300'
              }`}
              style={{
                boxShadow: isActive
                  ? `0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)`
                  : '0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                border: isActive ? `2px solid ${mode.color}` : undefined,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? mode.color : undefined }} />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Quick Insights Section */}
      <QuickInsights properties={properties} />
    </div>
  );
}

// Cashflow Waterfall Card Component
function CashflowWaterfallCard({ properties }: { properties: PortfolioProperty[] }) {
  // Calculate totals
  const totalRent = properties.reduce((sum, p) => {
    // Estimate monthly rent from annual cashflow + loan payment
    const estimatedRent = p.metrics.annualCashflow / 12 + p.metrics.monthlyLoanPayment;
    return sum + Math.max(estimatedRent, 0);
  }, 0);

  const totalLoanPayment = properties.reduce((sum, p) => sum + p.metrics.monthlyLoanPayment, 0);

  // Estimate other costs (roughly 15-20% of rent for management, maintenance, reserves)
  const estimatedCosts = totalRent * 0.15;

  const totalCashflow = properties.reduce((sum, p) => sum + p.metrics.monthlyCashflow, 0);

  // Waterfall data
  const waterfallData = [
    { label: 'Miete', value: totalRent, type: 'income' as const },
    { label: 'Kredit', value: -totalLoanPayment, type: 'expense' as const },
    { label: 'Kosten', value: -estimatedCosts, type: 'expense' as const },
    { label: 'Übrig', value: totalCashflow, type: 'result' as const },
  ];

  // Calculate positions for waterfall
  const maxValue = totalRent;
  const chartHeight = 48;

  const formatShort = (val: number) => {
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return Math.round(val).toString();
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
          <Activity className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Cashflow</h4>
            <span className={`text-xs font-bold ${totalCashflow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {totalCashflow >= 0 ? '+' : ''}{formatShort(totalCashflow)} €
            </span>
          </div>

          {/* Mini Waterfall Chart */}
          <div className="mt-2 relative" style={{ height: chartHeight }}>
            <div className="flex items-end h-full gap-1">
              {(() => {
                let runningTotal = 0;
                return waterfallData.map((item) => {
                  const isResult = item.type === 'result';
                  const barHeight = Math.abs(item.value) / maxValue * chartHeight;

                  if (!isResult) {
                    runningTotal += item.value;
                  }

                  // Calculate bottom position for expense bars (they start from previous total)
                  const bottomOffset = isResult
                    ? 0
                    : item.type === 'expense'
                      ? (runningTotal / maxValue) * chartHeight
                      : 0;

                  const barColor = item.type === 'income'
                    ? '#22c55e'
                    : item.type === 'expense'
                      ? '#ef4444'
                      : totalCashflow >= 0
                        ? '#22c55e'
                        : '#ef4444';

                  return (
                    <div key={item.label} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full h-full flex items-end">
                        <div
                          className="w-full rounded-t-sm transition-all"
                          style={{
                            height: Math.max(4, barHeight),
                            backgroundColor: barColor,
                            opacity: isResult ? 1 : 0.7,
                            marginBottom: bottomOffset,
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ height: chartHeight }}>
              {waterfallData.slice(0, -1).map((_, index) => {
                const x1 = (index + 0.5) * (100 / waterfallData.length);
                const x2 = (index + 1.5) * (100 / waterfallData.length);
                const runningTotal = waterfallData.slice(0, index + 1).reduce((sum, d) =>
                  d.type !== 'result' ? sum + d.value : sum, 0
                );
                const y = chartHeight - (runningTotal / maxValue) * chartHeight;

                return (
                  <line
                    key={index}
                    x1={`${x1}%`}
                    y1={y}
                    x2={`${x2}%`}
                    y2={y}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                );
              })}
            </svg>
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-1">
            {waterfallData.map((item) => (
              <span key={item.label} className="text-[9px] text-gray-400 flex-1 text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Insights Component
function QuickInsights({ properties }: { properties: PortfolioProperty[] }) {
  const aiTip = useMemo(() => generateAITip(properties), [properties]);

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Insights</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* KI-Tipp Card */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
              <Lightbulb className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">KI-Tipp</h4>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
              </div>
              <p className="text-xs font-medium text-violet-600 mt-0.5">{aiTip.title}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{aiTip.description}</p>
            </div>
          </div>
        </div>

        {/* Markt-Updates Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Newspaper className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Markt-Updates</h4>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-xs font-medium text-blue-600 mt-0.5">Neuste Entwicklungen</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                Immobilienpreise stabil. Zinsen bei 3,5%.
              </p>
            </div>
          </div>
        </div>

        {/* Cashflow Waterfall Card */}
        <CashflowWaterfallCard properties={properties} />
      </div>
    </div>
  );
}
