'use client';

import React from 'react';
import { Building2, Wallet, TrendingUp, Sparkles, Calculator } from 'lucide-react';

interface PortfolioSummary {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  totalInvestment?: number;
  totalMonthlyCashflow: number;
  totalAnnualCashflow: number;
  averageYield: number;
  averageCashOnCash: number;
  averageAiScore?: number | null;
}

interface TaxEffect {
  annualTaxEffect: number;
  monthlyTaxEffect: number;
  breakdown: {
    annualRent: number;
    annualInterest: number;
    annualAfa: number;
    taxableIncome: number;
  };
}

interface PortfolioProperty {
  id: string;
  metrics: {
    monthlyCashflow: number;
  };
}

interface PortfolioHeroStatsProps {
  summary: PortfolioSummary | undefined;
  canAccessAnalytics: boolean;
  properties?: PortfolioProperty[];
  taxEffectsData?: {
    marginalTaxRate: number;
    taxEffects: Record<string, TaxEffect>;
  };
}

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get cashflow color
const getCashflowColor = (value: number): string => {
  return value >= 0 ? 'text-green-600' : 'text-red-600';
};

// Get yield color
const getYieldColor = (value: number): string => {
  if (value >= 4) return 'text-green-600';
  if (value >= 2) return 'text-yellow-600';
  return 'text-red-600';
};

// Get AI score color (matching PropertyScoreBadge thresholds)
const getAiScoreColor = (value: number): string => {
  if (value >= 85) return 'text-[#06d551]'; // Sehr gut - Custom bright green
  if (value >= 60) return 'text-green-600'; // Gut
  if (value >= 40) return 'text-yellow-600'; // OK
  return 'text-red-600'; // Schwach
};

export function PortfolioHeroStats({ summary, canAccessAnalytics, properties, taxEffectsData }: PortfolioHeroStatsProps) {
  if (!summary) return null;

  // Berechne gesamtes steuerliches Ergebnis (Cashflow - AfA) für alle Immobilien
  let gesamtSteuerlichesErgebnis = 0;
  const taxRate = taxEffectsData?.marginalTaxRate || 0.42;

  if (properties && taxEffectsData?.taxEffects) {
    for (const property of properties) {
      const taxEffect = taxEffectsData.taxEffects[property.id];
      if (taxEffect) {
        const monthlyAfa = taxEffect.breakdown.annualAfa / 12;
        const steuerlichesErgebnis = property.metrics.monthlyCashflow - monthlyAfa;
        gesamtSteuerlichesErgebnis += steuerlichesErgebnis;
      }
    }
  }

  const isVerlust = gesamtSteuerlichesErgebnis < 0;
  const steuerEffekt = Math.round(gesamtSteuerlichesErgebnis * taxRate);
  const hasTaxData = properties && properties.length > 0 && taxEffectsData?.taxEffects;

  const stats = [
    {
      label: 'Gesamtwert',
      value: formatCurrency(summary.totalValue),
      icon: Building2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      sublabel: `EK: ${formatCurrency(summary.totalEquity)}`,
    },
    {
      label: 'Cashflow / Monat',
      value: `${summary.totalMonthlyCashflow >= 0 ? '+' : ''}${formatCurrency(summary.totalMonthlyCashflow)}`,
      valueColor: getCashflowColor(summary.totalMonthlyCashflow),
      icon: Wallet,
      iconBg: summary.totalMonthlyCashflow >= 0 ? 'bg-green-100' : 'bg-red-100',
      iconColor: summary.totalMonthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600',
      sublabel: `${formatCurrency(summary.totalAnnualCashflow)} / Jahr`,
    },
    {
      label: 'Ø Brutto-Rendite',
      value: `${summary.averageYield.toFixed(1)}%`,
      valueColor: getYieldColor(summary.averageYield),
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      sublabel: canAccessAnalytics
        ? `Cash-on-Cash: ${summary.averageCashOnCash.toFixed(1)}%`
        : undefined,
    },
    {
      label: 'Ø AI-Score',
      value: summary.averageAiScore != null ? `${(summary.averageAiScore / 10).toFixed(1)} / 10` : '–',
      valueColor: summary.averageAiScore != null ? getAiScoreColor(summary.averageAiScore) : undefined,
      icon: Sparkles,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      sublabel: summary.averageAiScore != null
        ? `${summary.totalProperties} ${summary.totalProperties === 1 ? 'Immobilie' : 'Immobilien'} bewertet`
        : 'Noch keine Bewertungen',
    },
    {
      label: isVerlust ? 'Steuerersparnis' : 'Steuerlast',
      value: hasTaxData ? `${isVerlust ? '+' : ''}${formatCurrency(Math.abs(steuerEffekt))}` : '–',
      valueColor: hasTaxData ? (isVerlust ? 'text-green-600' : 'text-red-600') : undefined,
      icon: Calculator,
      iconBg: isVerlust ? 'bg-green-100' : 'bg-red-100',
      iconColor: isVerlust ? 'text-green-600' : 'text-red-600',
      sublabel: hasTaxData ? `${formatCurrency(Math.abs(steuerEffekt * 12))} / Jahr` : 'Keine Daten',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${stat.iconBg} dark:bg-opacity-20`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${stat.valueColor || 'text-gray-900 dark:text-white'}`}>
              {stat.value}
            </p>
            {stat.sublabel && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{stat.sublabel}</p>
            )}
            {stat.extraInfo && (
              <p className={`text-xs font-medium ${stat.extraInfo.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.extraInfo.value} ({stat.extraInfo.percent})
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
