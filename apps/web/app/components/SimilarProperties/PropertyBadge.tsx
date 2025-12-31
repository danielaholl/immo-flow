'use client';

import React from 'react';
import { TrendingUp, Clock, Euro } from 'lucide-react';
import { PropertyScoreBadge } from '@rendito/ui';
import { PropertyBadgeProps } from './types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropertyBadge({ context, property, className = '' }: PropertyBadgeProps) {
  // AI-Score Badge (Ring variant)
  if (context === 'ai-score') {
    if (property.ai_investment_score == null) return null;
    return (
      <div className={className}>
        <PropertyScoreBadge
          score={Math.round(property.ai_investment_score)}
          variant="ring"
          size="sm"
        />
      </div>
    );
  }

  // Investor Badge (Rendite/Yield)
  if (context === 'investor') {
    if (property.grossYield == null) return null;
    const yieldValue = property.grossYield;
    let bgColor = 'bg-amber-500';
    if (yieldValue >= 5) bgColor = 'bg-emerald-500';
    else if (yieldValue < 3) bgColor = 'bg-red-500';

    return (
      <div
        className={`${bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg ${className}`}
      >
        <TrendingUp size={12} />
        {yieldValue.toFixed(1)}% Rendite
      </div>
    );
  }

  // Eigennutzer Badge (Break-Even Years)
  if (context === 'eigennutzer') {
    if (property.breakEvenYears == null) return null;
    const years = property.breakEvenYears;
    let bgColor = 'bg-amber-500';
    let label = `${years.toFixed(0)} Jahre`;

    if (years <= 10) {
      bgColor = 'bg-emerald-500';
      label = 'Kaufen lohnt sich';
    } else if (years >= 25) {
      bgColor = 'bg-red-500';
      label = 'Mieten besser';
    }

    return (
      <div
        className={`${bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg ${className}`}
      >
        <Clock size={12} />
        {label}
      </div>
    );
  }

  // Steuer Badge (Tax Savings)
  if (context === 'steuer') {
    if (property.taxSavings == null || property.taxSavings <= 0) return null;
    return (
      <div
        className={`bg-emerald-500/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg ${className}`}
      >
        <Euro size={12} />
        Spart {formatCurrency(property.taxSavings)}/Jahr
      </div>
    );
  }

  return null;
}
