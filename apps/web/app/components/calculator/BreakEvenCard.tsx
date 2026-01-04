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
    ? breakEvenYears <= 10
      ? 'text-emerald-600 dark:text-emerald-400'
      : breakEvenYears <= 20
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'
    : '';

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('breakeven')}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white text-xl">Jahre</h4>
          </div>
          {!isExpanded && breakEvenYears !== null && (
            <span className="font-semibold text-gray-500 dark:text-gray-400 text-lg ml-[26px]">
              {breakEvenYears} {breakEvenYears === 1 ? 'Jahr' : 'Jahre'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && breakEvenYears !== null && (
            <div className="flex flex-col items-end">
              <span className={`font-bold text-xl ${yearsColor}`}>
                {breakEvenYears} {breakEvenYears === 1 ? 'Jahr' : 'Jahre'}
              </span>
              {breakEvenEK !== null && (
                <span className="font-bold text-purple-600 dark:text-purple-400 text-lg mt-0.5">
                  {breakEvenEK.percentage.toFixed(0)}% EK
                </span>
              )}
            </div>
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
        <div className="space-y-3 text-sm flex-grow flex flex-col mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
        {/* Break-Even Jahre */}
        {breakEvenYears !== null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              bis Kaufen = Mieten
            </span>
            <span className={`text-lg font-bold ${
              breakEvenYears <= 10
                ? 'text-emerald-600 dark:text-emerald-400'
                : breakEvenYears <= 20
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}>
              {breakEvenYears} {breakEvenYears === 1 ? 'Jahr' : 'Jahre'}
            </span>
          </div>
        )}

        {/* Break-Even EK */}
        {breakEvenEK !== null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Break-Even EK
              <span className="text-xs text-gray-400 ml-1">(Miete = Kauf)</span>
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {breakEvenEK.percentage.toFixed(0)}%
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(breakEvenEK.amount)}</p>
            </div>
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
