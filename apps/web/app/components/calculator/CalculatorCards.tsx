'use client';

import React from 'react';
import { Pencil, RotateCcw, Check } from 'lucide-react';
import { CalculatorProps } from './types';
import { useCalculatorState, CalculatorContext } from './useCalculatorState';
import { InvestmentCostCard } from './InvestmentCostCard';
import { FinancingCard } from './FinancingCard';
import { CashflowCard } from './CashflowCard';
import { TaxEffectCard } from './TaxEffectCard';
import { BreakEvenCard } from './BreakEvenCard';
import { EigennutzerMetrics } from './EigennutzerMetrics';

interface CalculatorCardsProps extends CalculatorProps {
  className?: string;
  /** Optional toggle element to render in the header row */
  toggleElement?: React.ReactNode;
  /** Optional metrics element to render after the header row */
  metricsElement?: React.ReactNode;
}

export function CalculatorCards(props: CalculatorCardsProps) {
  const { className = '', canEdit = true, onSaveParams, isSavingParams = false, toggleElement, metricsElement, startInEditMode = false } = props;
  const calculatorState = useCalculatorState(props);
  const { isEditMode, setIsEditMode, handleReset, handleSave, startSimulation, values } = calculatorState;

  if (values.effectivePurchasePrice <= 0) return null;

  // Don't show simulation buttons when startInEditMode is true (permanent edit mode)
  const showSimulationButtons = canEdit && !startInEditMode;

  return (
    <CalculatorContext.Provider value={calculatorState}>
      <div className={`space-y-6 ${className}`}>
        {/* Header Row: Toggle links, Simulation Button rechts */}
        {showSimulationButtons && toggleElement && (
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Toggle links */}
            <div className="flex-shrink-0">
              {toggleElement}
            </div>

            {/* Simulation Button rechts */}
            <div className="flex-shrink-0">
              {isEditMode ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleReset();
                      setIsEditMode(false);
                    }}
                    className="py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <RotateCcw size={16} />
                    Abbrechen
                  </button>
                  <button
                    onClick={onSaveParams ? handleSave : () => setIsEditMode(false)}
                    disabled={isSavingParams}
                    className="py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full transition-colors flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {isSavingParams ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {onSaveParams ? 'Speichern' : 'Fertig'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startSimulation}
                  className="py-3 px-6 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:from-[#E31C5F] hover:to-[#C81E4E] text-white rounded-full transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Pencil size={16} />
                  Simulation starten
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toggle element without buttons when in permanent edit mode */}
        {startInEditMode && toggleElement && (
          <div className="flex items-center justify-start gap-4 mb-2">
            <div className="flex-shrink-0">
              {toggleElement}
            </div>
          </div>
        )}

        {/* Metrics Element after header */}
        {props.mode === 'eigennutzer' ? <EigennutzerMetrics /> : metricsElement}

        {/* Fallback: Button zentriert wenn kein Toggle */}
        {showSimulationButtons && !toggleElement && (
          <div className="flex justify-center pt-2">
            {isEditMode ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleReset();
                    setIsEditMode(false);
                  }}
                  className="py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <RotateCcw size={16} />
                  Abbrechen
                </button>
                <button
                  onClick={onSaveParams ? handleSave : () => setIsEditMode(false)}
                  disabled={isSavingParams}
                  className="py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full transition-colors flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                >
                  {isSavingParams ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {onSaveParams ? 'Speichern' : 'Fertig'}
                </button>
              </div>
            ) : (
              <button
                onClick={startSimulation}
                className="py-3 px-6 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:from-[#E31C5F] hover:to-[#C81E4E] text-white rounded-full transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Pencil size={16} />
                Simulation starten
              </button>
            )}
          </div>
        )}

        {/* 2-Spalten Grid für die Karten */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gesamtinvestition */}
          <InvestmentCostCard />

          {/* Finanzierung */}
          <FinancingCard />

          {/* Cashflow (inkl. Ausgaben, Break-Even nur bei Investor) */}
          <CashflowCard />

          {/* Steuereffekt (nur Investor) */}
          {props.mode === 'investor' && <TaxEffectCard />}

          {/* Break-Even (nur Eigennutzer) */}
          <BreakEvenCard />
        </div>
      </div>
    </CalculatorContext.Provider>
  );
}
