'use client';

import React from 'react';
import { TrendingUp, Calendar, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';

export function BreakEvenCard({ className = '' }: CardProps) {
  const { props, values, formatCurrency, expandedCards, toggleCardExpansion } = useCalculatorContext();

  const { mode } = props;
  const { breakEvenEK, breakEvenYears } = values;

  // Only show for Eigennutzer mode
  if (mode !== 'eigennutzer') {
    return null;
  }

  // Show nothing if no break-even data
  if (breakEvenEK === null && breakEvenYears === null) {
    return null;
  }

  const isExpanded = expandedCards.breakeven;

  // Color for break-even years
  const yearsColor = breakEvenYears !== null
    ? breakEvenYears <= 15
      ? 'text-emerald-600 dark:text-emerald-400'
      : breakEvenYears <= 25
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'
    : '';

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('breakeven')}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-purple-600 dark:text-gray-300" />
          <h4 className="font-semibold text-gray-900 dark:text-white text-base">Break-Even</h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && breakEvenYears !== null && (
            <span className={`font-bold ${yearsColor}`}>
              {breakEvenYears} Jahre
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </button>

      {/* Content - only shown when expanded */}
      {isExpanded && (
        <div className="space-y-4 flex-grow flex flex-col mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Break-Even EK */}
        {breakEvenEK !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={16} className="text-purple-600 dark:text-gray-300" />
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Break-Even EK</span>
                <p className="text-xs text-gray-400 mt-0.5">Miete = Kauf</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-purple-600">
                {breakEvenEK.percentage.toFixed(0)}%
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(breakEvenEK.amount)}</p>
            </div>
          </div>
        )}

        {/* Break-Even Jahre */}
        {breakEvenYears !== null && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600 dark:text-gray-300" />
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Break-Even Jahre</span>
                <p className="text-xs text-gray-400 mt-0.5">Kaufen vs. Mieten</p>
              </div>
            </div>
            <span className={`text-lg font-bold ${
              breakEvenYears <= 15
                ? 'text-emerald-600 dark:text-emerald-400'
                : breakEvenYears <= 25
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}>
              {breakEvenYears} Jahre
            </span>
          </div>
        )}

        {/* Annahmen */}
        {breakEvenYears !== null && (
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            Break-Even = Kaufnebenkosten ÷ jährliche Ersparnis (Miete − Zinsen − Hausgeld − Instandhaltung)
          </p>
        )}
        </div>
      )}
    </div>
  );
}
