'use client';

import { useCalculatorContext } from './useCalculatorState';

export function MetricsCards() {
  const { values, formatCurrency } = useCalculatorContext();

  // Cash on Cash Rendite berechnen
  const cashOnCash = values.calculatedCashflow !== undefined && values.eigenkapital > 0
    ? (values.calculatedCashflow * 12 / values.eigenkapital) * 100
    : undefined;

  // Dynamisches Label für Steuereffekt
  const getTaxLabel = () => {
    if (!values.steuereffekt) return 'Steuereffekt';
    const isSaving = values.steuereffekt.monatlich < 0;
    const isNeutral = Math.abs(values.steuereffekt.monatlich) < 20;
    if (isNeutral) return 'Steuereffekt';
    return isSaving ? 'Steuerersparnis' : 'Steuerverlust';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Rendite Card */}
      <div className={`rounded-xl border p-4 text-center ${
        values.grossYield !== undefined && values.grossYield !== null && values.grossYield >= 4
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/50'
          : values.grossYield !== undefined && values.grossYield !== null && values.grossYield >= 2
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/50'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50'
      }`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendite</p>
        <p className={`text-xl font-semibold ${
          values.grossYield !== undefined && values.grossYield !== null && values.grossYield >= 4
            ? 'text-emerald-700 dark:text-emerald-400'
            : values.grossYield !== undefined && values.grossYield !== null && values.grossYield >= 2
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-rose-700 dark:text-rose-400'
        }`}>
          {values.grossYield !== undefined && values.grossYield !== null ? values.grossYield.toFixed(1) : '—'}%
        </p>
      </div>

      {/* Cashflow Card */}
      <div className={`rounded-xl border p-4 text-center ${
        values.calculatedCashflow !== undefined && values.calculatedCashflow > 50
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/50'
          : values.calculatedCashflow !== undefined && values.calculatedCashflow >= -50
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/50'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50'
      }`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cashflow</p>
        <p className={`text-xl font-semibold ${
          values.calculatedCashflow !== undefined && values.calculatedCashflow > 50
            ? 'text-emerald-700 dark:text-emerald-400'
            : values.calculatedCashflow !== undefined && values.calculatedCashflow >= -50
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-rose-700 dark:text-rose-400'
        }`}>
          {values.calculatedCashflow !== undefined
            ? `${values.calculatedCashflow >= 0 ? '+' : ''}${formatCurrency(values.calculatedCashflow)}`
            : '—'}
        </p>
      </div>

      {/* Steuereffekt Card */}
      <div className={`rounded-xl border p-4 text-center ${
        values.steuereffekt && values.steuereffekt.monatlich < -20
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/50'
          : values.steuereffekt && Math.abs(values.steuereffekt.monatlich) <= 20
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/50'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50'
      }`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{getTaxLabel()}</p>
        <p className={`text-xl font-semibold ${
          values.steuereffekt && values.steuereffekt.monatlich < -20
            ? 'text-emerald-700 dark:text-emerald-400'
            : values.steuereffekt && Math.abs(values.steuereffekt.monatlich) <= 20
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-rose-700 dark:text-rose-400'
        }`}>
          {values.steuereffekt
            ? `${values.steuereffekt.monatlich < 0 ? '+' : ''}${formatCurrency(Math.abs(values.steuereffekt.monatlich))}`
            : '—'}
        </p>
      </div>

      {/* Cash on Cash Card */}
      <div className={`rounded-xl border p-4 text-center ${
        cashOnCash !== undefined && cashOnCash > 0
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/50'
          : cashOnCash !== undefined && cashOnCash >= -2
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/50'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/50'
      }`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cash on Cash</p>
        <p className={`text-xl font-semibold ${
          cashOnCash !== undefined && cashOnCash > 0
            ? 'text-emerald-700 dark:text-emerald-400'
            : cashOnCash !== undefined && cashOnCash >= -2
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-rose-700 dark:text-rose-400'
        }`}>
          {cashOnCash !== undefined ? `${cashOnCash.toFixed(1)}%` : '—'}
        </p>
      </div>
    </div>
  );
}
