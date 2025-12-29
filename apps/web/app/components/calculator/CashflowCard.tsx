'use client';

import React from 'react';
import { Wallet, Home, TrendingUp } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';

// Helper function to calculate dynamic input width based on value
function getInputWidth(value: number | null, placeholder: number): string {
  const displayValue = value ?? placeholder;
  const charCount = String(Math.ceil(displayValue)).length + 2; // +2 for extra space
  const minChars = 4;
  const chars = Math.max(charCount, minChars);
  // Each character is approximately 12px wide, plus padding for € symbol (32px)
  return `${chars * 12 + 32}px`;
}

export function CashflowCard({ className = '' }: CardProps) {
  const {
    props,
    isEditMode,
    editState,
    setEditState,
    values,
    formatCurrency,
  } = useCalculatorContext();

  const { mode, monthlyRent, estimatedRentPerSqm, sqm, marketRent, monthlyFee, yearBuilt } = props;

  // Calculate default rent
  const calculateRent = (): number => {
    if (mode === 'eigennutzer') {
      return marketRent ?? 0;
    }
    if (monthlyRent && monthlyRent > 0) return monthlyRent;
    if (estimatedRentPerSqm && sqm) return estimatedRentPerSqm * sqm;
    return 0;
  };

  // Calculate default Hausgeld (from ExpensesCard)
  const calculateHausgeld = (): number => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm) {
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return sqm * hausgeldProQm;
    }
    return 0;
  };

  const isPositive = values.calculatedCashflow >= 0;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {mode === 'investor' ? (
          <Wallet size={18} className={isPositive ? 'text-emerald-600' : 'text-rose-600'} />
        ) : (
          <Home size={18} className="text-indigo-600 dark:text-gray-300" />
        )}
        <h4 className="font-semibold text-gray-900 dark:text-white text-base">
          {mode === 'investor' ? 'Cashflow / Monat' : 'Miete vs. Kauf'}
        </h4>
      </div>

      {/* Content */}
      <div className="space-y-3 text-sm flex-grow flex flex-col">
        {/* Mieteinnahmen / Marktmiete */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            {mode === 'investor' ? 'Mieteinnahmen' : 'Marktmiete'}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.monthlyRent ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    monthlyRent: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(Math.ceil(calculateRent()))}
                  style={{ width: getInputWidth(editState.monthlyRent, Math.ceil(calculateRent())) }}
                  className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                  min="0"
                  step="50"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
              </span>
            ) : null}
            <span className="font-semibold text-emerald-600">+{formatCurrency(values.mieteinnahmen)}</span>
          </div>
        </div>

        {/* Hausgeld */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Hausgeld
            {values.isHausgeldEstimated && !isEditMode && (
              <span className="text-xs text-gray-400 ml-1">(geschätzt)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.monthlyFee ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    monthlyFee: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(Math.ceil(calculateHausgeld()))}
                  style={{ width: getInputWidth(editState.monthlyFee, Math.ceil(calculateHausgeld())) }}
                  className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                  min="0"
                  step="10"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
              </span>
            ) : null}
            <span className={`font-semibold ${mode === 'investor' ? 'text-gray-500 dark:text-gray-400' : 'text-rose-600'}`}>
              {mode === 'investor' ? '' : '-'}{formatCurrency(values.hausgeld)}
            </span>
          </div>
        </div>

        {/* Nicht umlegbare Kosten (nur Investor) */}
        {mode === 'investor' && (
          <div className="flex items-center justify-between pl-4">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              davon nicht umlegbar
              <span className="text-xs text-gray-400 ml-1">(30%)</span>
            </span>
            <span className="font-semibold text-rose-600">
              -{formatCurrency(values.hausgeldNichtUmlegbar)}
            </span>
          </div>
        )}

        {/* Instandhaltung */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Instandhaltung
            {!isEditMode && (
              <span className="text-xs text-gray-400 ml-1">(1% p.a.)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.maintenanceCosts ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    maintenanceCosts: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(values.instandhaltungskosten)}
                  style={{ width: getInputWidth(editState.maintenanceCosts, values.instandhaltungskosten) }}
                  className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                  min="0"
                  step="10"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
              </span>
            ) : null}
            <span className="font-semibold text-rose-600">-{formatCurrency(values.instandhaltungskosten)}</span>
          </div>
        </div>

        {/* Kapitaldienst */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Kapitaldienst
            <span className="text-xs text-gray-400 ml-1">
              ({values.effectiveInterestRate.toFixed(1)}% + {values.effectiveAmortizationRate.toFixed(0)}%)
            </span>
          </span>
          <span className="font-semibold text-rose-600">-{formatCurrency(values.monatlicheRate)}</span>
        </div>

        {/* Summe */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <span className="text-gray-900 dark:text-white font-bold">
            {mode === 'investor' ? 'Cashflow / Monat' : 'Differenz / Monat'}
          </span>
          <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(values.calculatedCashflow)}
          </span>
        </div>

        {/* Hinweis für Eigennutzer */}
        {mode === 'eigennutzer' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            {isPositive
              ? 'Kaufen ist günstiger als Mieten!'
              : 'Mieten ist monatlich günstiger. Prüfen Sie den Break-Even.'}
          </p>
        )}

        {/* Break-Even Section (nur Investor-Modus) */}
        {mode === 'investor' && values.breakEvenEK !== null && (
          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* Break-Even Header */}
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Break-Even</span>
            </div>

            {/* Break-Even EK */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Break-Even EK</span>
                <p className="text-xs text-gray-400 mt-0.5">Cashflow = 0</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-purple-600">
                  {values.breakEvenEK.percentage.toFixed(0)}%
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(values.breakEvenEK.amount)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
