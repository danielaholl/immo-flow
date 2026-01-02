'use client';

import React from 'react';
import { PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';

// Helper function to calculate dynamic input width based on value
function getInputWidth(value: number | null, placeholder: number): string {
  const displayValue = value ?? placeholder;
  const charCount = String(Math.ceil(displayValue)).length + 2; // +2 for extra space
  const minChars = 4;
  const chars = Math.max(charCount, minChars);
  // Each character is approximately 12px wide, plus padding for suffix (32px)
  return `${chars * 12 + 32}px`;
}

// AfA-Strategie Label
const getAfaLabel = (yearBuilt?: number): string => {
  if (!yearBuilt) return 'Bestand 2%';
  if (yearBuilt >= 2024) return 'Neubau Ø 4%';
  if (yearBuilt < 1925) return 'Altbau 2,5%';
  return 'Bestand 2%';
};

export function TaxEffectCard({ className = '' }: CardProps) {
  const {
    props,
    isEditMode,
    editState,
    setEditState,
    values,
    formatCurrency,
    expandedCards,
    toggleCardExpansion,
  } = useCalculatorContext();

  const { mode, yearBuilt } = props;
  const { steuereffekt, calculatedCashflow, defaultAfaRate, defaultGrenzsteuersatz } = values;

  // Only show for investor mode with valid steuereffekt
  if (mode !== 'investor' || steuereffekt === null) {
    return null;
  }

  const isSaving = steuereffekt.monatlich < 0;
  const isNeutral = Math.abs(steuereffekt.monatlich) < 20;
  const cashflowAfterTax = calculatedCashflow - steuereffekt.monatlich;
  const isExpanded = expandedCards.tax;

  // Icon and title color: green for saving, red for loss, amber for neutral
  const getIconColor = () => {
    if (isNeutral) return 'text-amber-600 dark:text-amber-400';
    return isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  // Dynamic title based on tax effect
  const getTaxTitle = () => {
    if (isNeutral) return 'Steuereffekt';
    return isSaving ? 'Steuerersparnis' : 'Steuerlast';
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('tax')}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <PiggyBank size={18} className={getIconColor()} />
          <h4 className="font-semibold text-gray-900 dark:text-white text-base">{getTaxTitle()}</h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && (
            <span className={`font-bold text-sm ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isSaving ? '+' : ''}{formatCurrency(Math.abs(steuereffekt.monatlich))}/Mo
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
        <div className="space-y-3 text-sm flex-grow flex flex-col mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Cashflow */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cashflow / Monat</span>
          <span className={`font-semibold ${calculatedCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {calculatedCashflow >= 0 ? '+' : ''}{formatCurrency(calculatedCashflow)}
          </span>
        </div>

        {/* AfA-Abschreibung */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            − AfA / Monat
            {!isEditMode && <span className="text-xs text-gray-400 ml-1">({getAfaLabel(yearBuilt)})</span>}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.afaRate ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    afaRate: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(defaultAfaRate * 100)}
                  style={{ width: getInputWidth(editState.afaRate, defaultAfaRate * 100) }}
                  className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max="10"
                  step="0.5"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
              </span>
            ) : null}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">−{formatCurrency(steuereffekt.afaMonatlich)}</span>
          </div>
        </div>

        {/* Steuerliches Ergebnis */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Steuerliches Ergebnis</span>
          <span className={`font-semibold ${steuereffekt.steuerlichesErgebnis < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(Math.round(steuereffekt.steuerlichesErgebnis / 12))}
          </span>
        </div>

        {/* Grenzsteuersatz */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">× Grenzsteuersatz</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.grenzsteuersatz ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    grenzsteuersatz: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(defaultGrenzsteuersatz)}
                  style={{ width: getInputWidth(editState.grenzsteuersatz, defaultGrenzsteuersatz) }}
                  className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max="50"
                  step="1"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
              </span>
            ) : null}
            <span className="font-semibold text-gray-900 dark:text-white">{steuereffekt.grenzsteuersatz}%</span>
          </div>
        </div>

        {/* Steuereffekt */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {isSaving ? 'Steuerersparnis / Monat' : 'Steuerlast / Monat'}
          </span>
          <span className={`font-semibold ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isSaving ? '+' : ''}{formatCurrency(Math.abs(steuereffekt.monatlich))}
          </span>
        </div>

        {/* Cashflow nach Steuern */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <span className="text-gray-900 dark:text-white font-bold">Cashflow nach Steuern</span>
          <span className={`text-lg font-bold ${cashflowAfterTax >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {cashflowAfterTax >= 0 ? '+' : ''}{formatCurrency(cashflowAfterTax)}
          </span>
        </div>

        {/* Hinweis */}
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          {isSaving
            ? 'Die AfA übersteigt den Cashflow → steuerlicher Verlust mindert Ihre Einkommensteuer.'
            : 'Der Cashflow übersteigt die AfA → Sie zahlen zusätzliche Einkommensteuer.'}
        </p>
        </div>
      )}
    </div>
  );
}
