'use client';

import React, { useState, useEffect } from 'react';
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

  // Tracking ob User aktiv tippt (verhindert useEffect-Überschreibung)
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Lokaler State für Prozent-Input (für flüssiges Tippen)
  // FIX: Verwende props statt values für initiale Berechnung (kein NaN-Flicker)
  const [localPercent, setLocalPercent] = useState(() => {
    // FIX: Prüfe auch auf NaN, nicht nur auf null
    if (editState.equityPercent !== null && !isNaN(editState.equityPercent)) {
      return editState.equityPercent.toString();
    }
    // Verwende props.equityPercentage (synchron verfügbar) statt values.effectiveEquityPercent (asynchron)
    const fallback = props.equityPercentage ?? 20;
    return fallback.toString();
  });

  // Synchronisiere lokalen State mit globalem State (nur wenn User NICHT aktiv tippt)
  useEffect(() => {
    // FIX: NICHT synchronisieren während User aktiv tippt
    if (isUserTyping) return;

    // FIX: Prüfe auch auf NaN bei editState.equityPercent
    if (editState.equityPercent !== null && !isNaN(editState.equityPercent)) {
      setLocalPercent(editState.equityPercent.toString());
    } else if (editState.eigenkapitalBetrag === null && editState.darlehensbetrag === null) {
      const val = values.effectiveEquityPercent;
      // FIX: Nur setzen wenn valide Zahl (nicht NaN)
      if (!isNaN(val) && val !== null && val !== undefined) {
        setLocalPercent(val.toString());
      }
    }
  }, [editState.equityPercent, editState.eigenkapitalBetrag, editState.darlehensbetrag, values.effectiveEquityPercent, isUserTyping]);

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col ${className}`}>
      {/* Header - klickbar */}
      <button
        onClick={() => toggleCardExpansion('financing')}
        className="flex items-start justify-between w-full text-left"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-rose-600 dark:text-rose-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white text-xl">Finanzierung</h4>
          </div>
          {!isExpanded && (
            <span className="font-semibold text-gray-500 dark:text-gray-400 text-lg ml-[26px]">Eigenkapital</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isExpanded && (
            <div className="flex flex-col items-end">
              <span className="font-bold text-rose-600 dark:text-rose-400 text-xl">{formatCurrency(values.monatlicheRate)}/Mo</span>
              <span className="font-bold text-gray-500 dark:text-gray-400 text-lg mt-0.5">{formatCurrency(values.eigenkapital)}</span>
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
        {/* Eigenkapital - Dual Input (Prozent + Betrag) */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Eigenkapital</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                {/* Prozent Input */}
                <span className="relative inline-flex items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={localPercent}
                    onChange={(e) => {
                      const inputValue = e.target.value;

                      // FIX: Setze Typing-Flag (verhindert useEffect-Überschreibung)
                      setLocalPercent(inputValue);
                      setIsUserTyping(true);

                      // Erlaube leeres Input für komplettes Löschen
                      if (inputValue === '') {
                        setEditState((prev) => ({
                          ...prev,
                          equityPercent: null,
                          eigenkapitalBetrag: null,
                          darlehensbetrag: null,
                        }));
                        return;
                      }

                      // Validiere numerischen Input
                      const newPercent = parseFloat(inputValue);
                      if (isNaN(newPercent)) return;

                      // Wenn Prozent auf 0 gesetzt wird, auch eigenkapitalBetrag auf 0 setzen
                      setEditState((prev) => ({
                        ...prev,
                        equityPercent: newPercent,
                        eigenkapitalBetrag: newPercent === 0 ? 0 : null,
                        darlehensbetrag: null,
                      }));
                    }}
                    onBlur={() => {
                      // FIX: Reset Typing-Flag
                      setIsUserTyping(false);
                    }}
                    placeholder=""
                    className={`w-20 pl-2 pr-6 py-1.5 input-gradient-border rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      editState.equityPercent === null || editState.equityPercent === undefined
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  />
                  <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">%</span>
                </span>

                {/* Betrag Input */}
                <span className="relative inline-flex items-center">
                  <input
                    type="number"
                    value={editState.eigenkapitalBetrag !== null && editState.eigenkapitalBetrag !== undefined
                      ? Math.round(editState.eigenkapitalBetrag)
                      : Math.round(values.eigenkapital)}
                    onChange={(e) => {
                      const newAmount = e.target.value === '' ? null : Number(e.target.value);

                      // NUR eigenkapitalBetrag setzen - equityPercent und darlehensbetrag bleiben null
                      // So hat eigenkapitalBetrag Priorität in der Berechnung
                      setEditState((prev) => ({
                        ...prev,
                        eigenkapitalBetrag: newAmount,
                        equityPercent: null,
                        darlehensbetrag: null,
                      }));
                    }}
                    placeholder=""
                    className={`w-28 pl-2 pr-6 py-1.5 input-gradient-border rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      editState.eigenkapitalBetrag === null || editState.eigenkapitalBetrag === undefined
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                    min="0"
                    step="1000"
                  />
                  <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  ({values.effectiveEquityPercent.toFixed(1)}%)
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(values.eigenkapital)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Darlehensbetrag - jetzt editierbar */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Darlehensbetrag</span>
          {isEditMode ? (
            <span className="relative inline-flex items-center">
              <input
                type="number"
                value={editState.darlehensbetrag !== null && editState.darlehensbetrag !== undefined
                  ? Math.round(editState.darlehensbetrag)
                  : Math.round(values.darlehensbetrag)}
                onChange={(e) => {
                  const newDarlehen = e.target.value === '' ? null : Number(e.target.value);

                  // NUR darlehensbetrag setzen - equityPercent und eigenkapitalBetrag bleiben null
                  // So hat darlehensbetrag Priorität in der Berechnung
                  setEditState((prev) => ({
                    ...prev,
                    darlehensbetrag: newDarlehen,
                    eigenkapitalBetrag: null,
                    equityPercent: null,
                  }));
                }}
                placeholder=""
                className={`w-32 pl-2 pr-6 py-1.5 input-gradient-border rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  editState.darlehensbetrag === null || editState.darlehensbetrag === undefined
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-900 dark:text-white'
                }`}
                min="0"
                step="5000"
              />
              <span className="absolute right-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
            </span>
          ) : (
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {formatCurrency(values.darlehensbetrag)}
            </span>
          )}
        </div>

        {/* Zinssatz */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Zinssatz</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <span className="relative inline-flex items-center">
                <input
                  type="number"
                  value={editState.interestRate !== null && editState.interestRate !== undefined ? editState.interestRate : ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    interestRate: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={values.effectiveInterestRate.toFixed(2)}
                  className={`w-20 pl-2 pr-7 py-1.5 input-gradient-border rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    editState.interestRate === null || editState.interestRate === undefined
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-900 dark:text-white'
                  }`}
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
                  value={editState.amortizationRate !== null && editState.amortizationRate !== undefined ? editState.amortizationRate : ''}
                  onChange={(e) => setEditState((prev) => ({
                    ...prev,
                    amortizationRate: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  placeholder={values.effectiveAmortizationRate.toFixed(1)}
                  className={`w-[74px] pl-2 pr-7 py-1.5 input-gradient-border rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    editState.amortizationRate === null || editState.amortizationRate === undefined
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-900 dark:text-white'
                  }`}
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
        <div className="flex items-center justify-between pt-3 border-t border-gray-300 dark:border-gray-700 mt-auto">
          <span className="text-gray-900 dark:text-white font-bold">Kapitaldienst / Monat</span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(values.monatlicheRate)}</span>
        </div>
        </div>
      )}
    </div>
  );
}
