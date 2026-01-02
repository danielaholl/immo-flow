'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Scale, LucideIcon } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';

interface Verdict {
  icon: LucideIcon;
  title: string;
  text: string;
  color: 'emerald' | 'amber' | 'rose';
}

export function VerdictCard({ className = '' }: CardProps) {
  const { props, values, formatCurrency } = useCalculatorContext();

  // Only show for investor mode
  if (props.mode !== 'investor') return null;

  const { breakEvenPrice, effectivePurchasePrice, calculatedCashflow } = values;

  // If no break-even price can be calculated, don't show the card
  if (breakEvenPrice === null) return null;

  const diff = breakEvenPrice - effectivePurchasePrice;

  // Determine verdict based on cashflow
  const getVerdict = (): Verdict => {
    const isPositive = calculatedCashflow > 50;
    const isNeutral = Math.abs(calculatedCashflow) <= 50;

    if (isPositive) {
      return {
        icon: TrendingUp,
        title: 'Cashflow-positiv',
        text: `Das Objekt generiert ${formatCurrency(calculatedCashflow)}/Mo. Max. Kaufpreis für Cashflow = 0: ${formatCurrency(breakEvenPrice)}.`,
        color: 'emerald',
      };
    }

    if (isNeutral) {
      return {
        icon: Scale,
        title: 'Cashflow-neutral',
        text: `Bei einem Kaufpreis von ${formatCurrency(breakEvenPrice)} wäre das Objekt mit den eingestellten Parametern cashflow-neutral.`,
        color: 'amber',
      };
    }

    return {
      icon: TrendingDown,
      title: 'Cashflow-negativ',
      text: `Break-Even bei ${formatCurrency(breakEvenPrice)} (${formatCurrency(Math.abs(diff))} unter aktuellem Preis).`,
      color: 'rose',
    };
  };

  const verdict = getVerdict();
  const Icon = verdict.icon;

  // Color mappings
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      title: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      icon: 'text-rose-600 dark:text-rose-400',
      title: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800/50',
    },
  };

  const styles = colorStyles[verdict.color];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon size={20} className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${styles.title} text-base`}>
            {verdict.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {verdict.text}
          </p>
        </div>
      </div>
    </div>
  );
}
