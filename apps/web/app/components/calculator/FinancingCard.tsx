'use client';

import React from 'react';
import { Landmark, ChevronDown, ChevronUp } from 'lucide-react';
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

export function FinancingCard({ className = '' }: CardProps) {
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

  const { equityPercentage = 20, interestRate = 3.5, amortizationRate = 2.0 } = props;
  const isExpanded = expandedCards.financing;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('financing')}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Landmark size={18} className="text-rose-600 dark:text-rose-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white text-base">Finanzierung</h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">EK:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(values.eigenkapital)}</span>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(values.monatlicheRate)}/Mo</span>
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
        {/* Eigenkapital */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Eigenkapital</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.equityPercent ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    equityPercent: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(equityPercentage)}
                  className="w-[74px] pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max="100"
                  step="1"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-xs">({values.effectiveEquityPercent.toFixed(0)}%)</span>
            )}
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(values.eigenkapital)}</span>
          </div>
        </div>

        {/* Darlehensbetrag */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Darlehensbetrag</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.darlehensbetrag)}</span>
        </div>

        {/* Zinssatz */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Zinssatz</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.interestRate ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    interestRate: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(interestRate)}
                  className="w-20 pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max="15"
                  step="0.1"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-xs">({values.effectiveInterestRate.toFixed(2)}%)</span>
            )}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.monatlicheZinsen)}/Mo</span>
          </div>
        </div>

        {/* Tilgung */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Tilgung</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.amortizationRate ?? ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    amortizationRate: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={String(amortizationRate)}
                  className="w-[74px] pl-2 pr-7 py-1.5 border border-[#DDDDDD] dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                  max="10"
                  step="0.5"
                />
                <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-xs">({values.effectiveAmortizationRate.toFixed(1)}%)</span>
            )}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(values.monatlicheTilgung)}/Mo</span>
          </div>
        </div>

        {/* Summe */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <span className="text-gray-900 dark:text-white font-bold">Kapitaldienst / Monat</span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(values.monatlicheRate)}</span>
        </div>
        </div>
      )}
    </div>
  );
}
