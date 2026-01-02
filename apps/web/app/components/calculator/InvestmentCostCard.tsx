'use client';

import React from 'react';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';

// Helper function to calculate dynamic input width based on value
function getInputWidth(value: number | null, placeholder: number, suffix = '€'): string {
  const displayValue = value ?? placeholder;
  const charCount = String(Math.ceil(displayValue)).length + 2; // +2 for extra space
  const minChars = 4;
  const chars = Math.max(charCount, minChars);
  // Each character is approximately 12px wide, plus padding for suffix (32px)
  return `${chars * 12 + 32}px`;
}

// For formatted numbers like "250.000"
function getFormattedInputWidth(value: number | null, placeholder: number): string {
  const displayValue = value ?? placeholder;
  const formatted = new Intl.NumberFormat('de-DE').format(Math.ceil(displayValue));
  const charCount = formatted.length + 2; // +2 for extra space
  const minChars = 6;
  const chars = Math.max(charCount, minChars);
  return `${chars * 11 + 32}px`;
}

export function InvestmentCostCard({ className = '' }: CardProps) {
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

  const { mode, commissionRate } = props;
  const isExpanded = expandedCards.investment;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('investment')}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white text-base">Gesamtinvestition</h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(values.gesamtinvestition)}</span>
              <span className="text-gray-500 dark:text-gray-400">(NK: {formatCurrency(values.kaufnebenkosten)})</span>
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
        <div className="space-y-3 text-sm flex-grow flex flex-col mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Kaufpreis */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Kaufpreis</span>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <span className="relative inline-flex items-center">
                  <input
                    type="text"
                    value={editState.purchasePrice !== null ? new Intl.NumberFormat('de-DE').format(editState.purchasePrice) : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d]/g, '');
                      const newPrice = rawValue === '' ? null : Number(rawValue);
                      setEditState((prev) => ({ ...prev, purchasePrice: newPrice }));
                      if (newPrice !== null && props.onPurchasePriceChange) {
                        props.onPurchasePriceChange(newPrice);
                      }
                    }}
                    placeholder={new Intl.NumberFormat('de-DE').format(props.purchasePrice)}
                    style={{ width: getFormattedInputWidth(editState.purchasePrice, props.purchasePrice) }}
                    className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right"
                  />
                  <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
                </span>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(values.effectivePurchasePrice)}</span>
              )}
            </div>
          </div>

          {/* Grunderwerbsteuer */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              + Grunderwerbsteuer ({values.grunderwerbsteuerRate.toFixed(1)}%)
              {values.detectedState && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  ({values.detectedState.charAt(0).toUpperCase() + values.detectedState.slice(1)})
                </span>
              )}
            </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.grunderwerbsteuer)}</span>
          </div>

          {/* Notar */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">+ Notar (~1,5%)</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.notarkosten)}</span>
          </div>

          {/* Grundbuch */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">+ Grundbuch (~0,5%)</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.grundbuchkosten)}</span>
          </div>

          {/* Maklergebühren */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">+ Maklergebühren</span>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <span className="relative inline-flex items-center">
                  <input
                    type="number"
                    value={editState.brokerCommission ?? ''}
                    onChange={(e) => setEditState((prev) => ({
                      ...prev,
                      brokerCommission: e.target.value === '' ? null : Number(e.target.value),
                    }))}
                    placeholder={String(commissionRate)}
                    style={{ width: getInputWidth(editState.brokerCommission, commissionRate || 0) }}
                    className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                  <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-500 text-xs">({values.effectiveBrokerCommission.toFixed(2)}%)</span>
              )}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.maklergebuehren)}</span>
            </div>
          </div>

          {/* Renovierungskosten */}
          {(mode === 'investor' || values.effectiveRenovationCosts > 0 || isEditMode) && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">+ Renovierung</span>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="text"
                      value={editState.renovationCosts !== null ? new Intl.NumberFormat('de-DE').format(editState.renovationCosts) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        setEditState((prev) => ({
                          ...prev,
                          renovationCosts: rawValue === '' ? null : Number(rawValue),
                        }));
                      }}
                      placeholder="0"
                      style={{ width: `calc(${getFormattedInputWidth(editState.renovationCosts, values.effectiveRenovationCosts || 0)} * 1.15)` }}
                      className="pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right"
                    />
                    <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
                  </span>
                ) : (
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.effectiveRenovationCosts)}</span>
                )}
              </div>
            </div>
          )}

          {/* Summe */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <span className="text-gray-900 dark:text-white font-bold">Gesamtinvestition</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(values.gesamtinvestition)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
