'use client';

import React from 'react';
import { Wallet, Home, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';
import { trpc } from '@/app/providers/TRPCProvider';

// Fallback constants (used when DB values not yet loaded)
const DEFAULT_HAUSGELD_MODERN = 2.50;
const DEFAULT_HAUSGELD_OLD = 3.50;

// For formatted numbers like "1.200"
function getFormattedInputWidth(value: number | null, placeholder: number): string {
  const displayValue = value ?? placeholder;
  const formatted = new Intl.NumberFormat('de-DE').format(Math.ceil(displayValue));
  const charCount = formatted.length + 2; // +2 for extra space
  const minChars = 4;
  const chars = Math.max(charCount, minChars);
  return `${chars * 11 + 32}px`;
}

export function CashflowCard({ className = '' }: CardProps) {
  const {
    props,
    isEditMode,
    editState,
    setEditState,
    values,
    formatCurrency,
    expandedCards,
    toggleCardExpansion,
    plzMarketRent,
    isLoadingMarketData,
    isRentOverridden,
  } = useCalculatorContext();

  const { mode, monthlyRent, estimatedRentPerSqm, sqm, marketRent, monthlyFee, yearBuilt } = props;

  // Calculator defaults from database
  const { data: calculatorDefaults } = trpc.calculatorDefaults.getDefaults.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Calculate default rent
  const calculateRent = (): number => {
    if (mode === 'eigennutzer') {
      return marketRent ?? 0;
    }
    if (monthlyRent && monthlyRent > 0) return monthlyRent;
    if (estimatedRentPerSqm && sqm) return estimatedRentPerSqm * sqm;
    return 0;
  };

  // Calculate default Hausgeld (using DB defaults)
  const calculateHausgeld = (): number => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm) {
      const hausgeldModern = calculatorDefaults?.hausgeldPerSqmModern ?? DEFAULT_HAUSGELD_MODERN;
      const hausgeldOld = calculatorDefaults?.hausgeldPerSqmOld ?? DEFAULT_HAUSGELD_OLD;
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? hausgeldModern : hausgeldOld;
      return sqm * hausgeldProQm;
    }
    return 0;
  };

  const isPositive = values.calculatedCashflow >= 0;
  const isNeutral = Math.abs(values.calculatedCashflow) < 50;
  const isExpanded = expandedCards.cashflow;

  // Icon color: green for positive, red for negative, amber for neutral (near zero)
  const getIconColor = () => {
    if (isNeutral) return 'text-amber-600 dark:text-amber-400';
    return isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('cashflow')}
        className="flex items-start justify-between w-full text-left"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {mode === 'investor' ? (
              <Wallet size={18} className={getIconColor()} />
            ) : (
              <Home size={18} className="text-indigo-600 dark:text-gray-300" />
            )}
            <h4 className="font-semibold text-gray-900 dark:text-white text-xl">
              {mode === 'investor' ? 'Cashflow' : 'Differenz Miete-Kauf'}
            </h4>
          </div>
          {!isExpanded && (
            <span className="font-semibold text-gray-500 dark:text-gray-400 text-lg ml-[26px]">Miete</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && (
            <div className="flex flex-col items-end">
              <span className={`font-bold text-xl ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(values.calculatedCashflow)}/Mo
              </span>
              <span className="font-bold text-gray-500 dark:text-gray-400 text-lg mt-0.5">
                {formatCurrency(values.mieteinnahmen)}/Mo
              </span>
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
        {/* Mieteinnahmen / Marktmiete */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {mode === 'investor'
                ? (plzMarketRent
                    ? `Mieteinnahmen (Ø: ${formatCurrency(plzMarketRent)}/Mo)`
                    : 'Mieteinnahmen')
                : 'Miete'}
              {isLoadingMarketData && (
                <span className="text-xs text-gray-400 ml-1 animate-pulse">...</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <span className="relative inline-flex items-center">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold mr-1">+</span>
                  <input
                    type="text"
                    value={editState.monthlyRent !== null && editState.monthlyRent !== undefined
                      ? new Intl.NumberFormat('de-DE').format(editState.monthlyRent)
                      : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d]/g, '');
                      setEditState((prev) => ({
                        ...prev,
                        monthlyRent: rawValue === '' ? null : Number(rawValue),
                      }));
                    }}
                    placeholder={new Intl.NumberFormat('de-DE').format(Math.ceil(plzMarketRent ?? calculateRent()))}
                    style={{ width: getFormattedInputWidth(editState.monthlyRent ?? Math.ceil(plzMarketRent ?? calculateRent()), Math.ceil(plzMarketRent ?? calculateRent())) }}
                    className={`pl-2 pr-7 py-1.5 input-gradient-border rounded-lg text-sm text-right font-semibold ${
                      editState.monthlyRent === null || editState.monthlyRent === undefined
                        ? 'text-emerald-600/70 dark:text-emerald-400/70'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  />
                  <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
                </span>
              ) : (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(values.mieteinnahmen)}</span>
              )}
            </div>
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
                {mode !== 'investor' && <span className="text-rose-600 dark:text-rose-400 font-semibold mr-1">-</span>}
                <input
                  type="text"
                  value={editState.monthlyFee !== null && editState.monthlyFee !== undefined
                    ? new Intl.NumberFormat('de-DE').format(editState.monthlyFee)
                    : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^\d]/g, '');
                    setEditState((prev) => ({
                      ...prev,
                      monthlyFee: rawValue === '' ? null : Number(rawValue),
                    }));
                  }}
                  placeholder={new Intl.NumberFormat('de-DE').format(Math.ceil(calculateHausgeld()))}
                  style={{ width: getFormattedInputWidth(editState.monthlyFee ?? Math.ceil(calculateHausgeld()), Math.ceil(calculateHausgeld())) }}
                  className={`pl-2 pr-7 py-1.5 input-gradient-border rounded-lg text-sm text-right font-semibold ${
                    editState.monthlyFee === null || editState.monthlyFee === undefined
                      ? 'text-rose-600/70 dark:text-rose-400/70'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
              </span>
            ) : (
              <span className={`font-semibold ${mode === 'investor' ? 'text-gray-500 dark:text-gray-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {mode === 'investor' ? '' : '-'}{formatCurrency(values.hausgeld)}
              </span>
            )}
          </div>
        </div>

        {/* Nicht umlegbare Kosten (nur Investor) */}
        {mode === 'investor' && (
          <div className="flex items-center justify-between pl-4">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              davon nicht umlegbar
              <span className="text-xs text-gray-400 ml-1">
                ({Math.round((calculatorDefaults?.nonAllocableHausgeldRatio ?? 0.30) * 100)}%)
              </span>
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              -{formatCurrency(values.hausgeldNichtUmlegbar)}
            </span>
          </div>
        )}

        {/* Instandhaltung */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Instandhaltung
            {!isEditMode && (
              <span className="text-xs text-gray-400 ml-1">
                ({calculatorDefaults?.maintenanceCostPerSqm ?? 10}€/m²/J.)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <span className="text-rose-600 dark:text-rose-400 font-semibold mr-1">-</span>
                <input
                  type="text"
                  value={editState.maintenanceCosts !== null && editState.maintenanceCosts !== undefined
                    ? new Intl.NumberFormat('de-DE').format(editState.maintenanceCosts)
                    : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^\d]/g, '');
                    setEditState((prev) => ({
                      ...prev,
                      maintenanceCosts: rawValue === '' ? null : Number(rawValue),
                    }));
                  }}
                  placeholder={new Intl.NumberFormat('de-DE').format(values.instandhaltungskosten)}
                  style={{ width: getFormattedInputWidth(editState.maintenanceCosts ?? values.instandhaltungskosten, values.instandhaltungskosten) }}
                  className={`pl-2 pr-7 py-1.5 input-gradient-border rounded-lg text-sm text-right font-semibold ${
                    editState.maintenanceCosts === null || editState.maintenanceCosts === undefined
                      ? 'text-rose-600/70 dark:text-rose-400/70'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
              </span>
            ) : (
              <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(values.instandhaltungskosten)}</span>
            )}
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
          <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(values.monatlicheRate)}</span>
        </div>

        {/* Summe */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700 mt-auto">
          <span className="text-gray-900 dark:text-white font-bold">
            {mode === 'investor' ? 'Cashflow / Monat' : 'Differenz / Monat'}
          </span>
          <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
        {mode === 'investor' && (values.breakEvenEK !== null || values.breakEvenPrice !== null) && (
          <div className="pt-3 mt-3 border-t border-gray-300 dark:border-gray-700 space-y-3">
            {/* Break-Even Header */}
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Break-Even</span>
            </div>

            {/* Break-Even Preis */}
            {values.breakEvenPrice !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Max. Kaufpreis</span>
                  <p className="text-xs text-gray-400 mt-0.5">für Cashflow = 0</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${values.breakEvenPrice > values.effectivePurchasePrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(values.breakEvenPrice)}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {values.breakEvenPrice > values.effectivePurchasePrice
                      ? `+${formatCurrency(values.breakEvenPrice - values.effectivePurchasePrice)} Spielraum`
                      : `${formatCurrency(values.effectivePurchasePrice - values.breakEvenPrice)} zu teuer`}
                  </p>
                </div>
              </div>
            )}

            {/* Break-Even EK */}
            {values.breakEvenEK !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Break-Even EK</span>
                  <p className="text-xs text-gray-400 mt-0.5">für Cashflow = 0</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {values.breakEvenEK.percentage.toFixed(0)}%
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(values.breakEvenEK.amount)}</p>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
