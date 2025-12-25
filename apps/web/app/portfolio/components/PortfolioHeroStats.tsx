'use client';

import React from 'react';
import { Building2, Wallet, TrendingUp, PiggyBank } from 'lucide-react';

interface PortfolioSummary {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  totalInvestment?: number;
  totalMonthlyCashflow: number;
  totalAnnualCashflow: number;
  averageYield: number;
  averageCashOnCash: number;
}

interface PortfolioHeroStatsProps {
  summary: PortfolioSummary | undefined;
  canAccessAnalytics: boolean;
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

export function PortfolioHeroStats({ summary, canAccessAnalytics }: PortfolioHeroStatsProps) {
  if (!summary) return null;

  // Calculate value increase from GIK
  const totalInvestment = summary.totalInvestment || 0;
  const valueIncreaseFromGIK = totalInvestment > 0 ? summary.totalValue - totalInvestment : 0;
  const valueIncreasePercent = totalInvestment > 0 ? ((summary.totalValue - totalInvestment) / totalInvestment) * 100 : 0;

  const stats = [
    {
      label: 'Gesamtwert',
      value: formatCurrency(summary.totalValue),
      icon: Building2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      sublabel: totalInvestment > 0
        ? `GIK: ${formatCurrency(totalInvestment)}`
        : `${summary.totalProperties} ${summary.totalProperties === 1 ? 'Immobilie' : 'Immobilien'}`,
      extraInfo: totalInvestment > 0 ? {
        value: `${valueIncreaseFromGIK >= 0 ? '+' : ''}${formatCurrency(valueIncreaseFromGIK)}`,
        percent: `${valueIncreasePercent >= 0 ? '+' : ''}${valueIncreasePercent.toFixed(1)}%`,
        isPositive: valueIncreaseFromGIK >= 0,
      } : undefined,
    },
    {
      label: 'Eigenkapital',
      value: formatCurrency(summary.totalEquity),
      icon: PiggyBank,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      sublabel: summary.totalValue > 0
        ? `${Math.round((summary.totalEquity / summary.totalValue) * 100)}% EK-Quote`
        : undefined,
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
      label: 'Ø Rendite',
      value: `${summary.averageYield.toFixed(1)}%`,
      valueColor: getYieldColor(summary.averageYield),
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      sublabel: canAccessAnalytics
        ? `Cash-on-Cash: ${summary.averageCashOnCash.toFixed(1)}%`
        : 'Brutto-Rendite',
      locked: !canAccessAnalytics,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.valueColor || 'text-gray-900'}`}>
              {stat.value}
            </p>
            {stat.sublabel && (
              <p className="text-xs text-gray-400">{stat.sublabel}</p>
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
