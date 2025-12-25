'use client';

import React, { useState } from 'react';
import { ChevronDown, Sparkles, Calculator } from 'lucide-react';
import { InvestmentCalculator, UserParams, SavedParams } from './InvestmentCalculator';

export interface KeyMetricsPanelProps {
  // AI Score
  aiScore?: number;           // AI Investment Score (0-100)

  // Daten aus BuyerEvaluation
  grossYield?: number;        // Brutto Rendite in %
  rentMultiplier?: number;    // Faktor (Kaufpreis / Jahresmiete)
  monthlyCashflow?: number;   // Monatlicher Cashflow in € (wird intern berechnet wenn nicht übergeben)
  purchasePrice?: number;     // Für Breakeven-Berechnung

  // Daten für Kaufnebenkosten
  commissionRate?: number;    // Maklergebühr in % (aus Property)
  location?: string;          // Für Bundesland-Erkennung (Grunderwerbsteuer)

  // Daten für Kapitaldienst (aus AI-Evaluation)
  financingTerms?: {
    interestRate?: number;      // Zinssatz in %
    amortizationRate?: number;  // Tilgung in %
    loanToValue?: number;       // LTV in % (z.B. 90)
  };

  // Daten für Cashflow-Berechnung
  sqm?: number;                     // Wohnfläche in qm
  estimatedRentPerSqm?: number;     // KI-geschätzte Miete pro qm für die Region
  monthlyFee?: number;              // Hausgeld aus Property Details
  yearBuilt?: number;               // Baujahr (für Hausgeld-Berechnung)

  // Legacy Props (werden durch berechnete Werte ersetzt)
  estimatedRent?: number;           // Fallback: Geschätzte Kaltmiete
  estimatedOperatingCosts?: number; // Fallback: Hausgeld (nicht umlagefähig)

  // Callbacks
  onTriggerEvaluation?: () => void;
  isLoading?: boolean;

  // User Property Parameters (für Edit-Modus)
  propertyId?: string;
  userParams?: UserParams | null;
  onSaveParams?: (params: SavedParams) => void;
  isSavingParams?: boolean;

  // UI
  defaultExpanded?: boolean;
  className?: string;
}

// Utility: Preis formatieren
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Utility: Rendite-Farbe bestimmen
const getYieldColor = (yieldPercent: number): string => {
  if (yieldPercent >= 4) return 'text-green-600';
  if (yieldPercent >= 2) return 'text-yellow-600';
  return 'text-red-600';
};

// Utility: Cashflow-Farbe bestimmen
const getCashflowColor = (cashflow: number): string => {
  return cashflow >= 0 ? 'text-green-600' : 'text-red-600';
};

export function KeyMetricsPanel({
  grossYield,
  rentMultiplier,
  monthlyCashflow: externalCashflow,
  purchasePrice,
  commissionRate,
  location,
  financingTerms,
  sqm,
  estimatedRentPerSqm,
  monthlyFee,
  yearBuilt,
  estimatedRent,
  onTriggerEvaluation,
  isLoading = false,
  propertyId,
  userParams,
  onSaveParams,
  isSavingParams = false,
  defaultExpanded = false,
  className = '',
}: KeyMetricsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Zeige Edit-Button nur wenn propertyId und onSaveParams vorhanden
  const canEdit = !!propertyId && !!onSaveParams;

  // Check if we have external data
  const hasExternalData = grossYield !== undefined || rentMultiplier !== undefined || externalCashflow !== undefined;

  // ============================================
  // BERECHNUNGEN FÜR HEADER-CARDS
  // ============================================

  // Effektive Werte (userParams hat Priorität)
  const effectivePurchasePrice = Number(userParams?.purchase_price ?? purchasePrice ?? 0);

  // Mieteinnahmen berechnen
  const calculatedRent = estimatedRentPerSqm && sqm
    ? Number(estimatedRentPerSqm) * Number(sqm)
    : estimatedRent;
  const mieteinnahmen = Number(userParams?.monthly_rent ?? calculatedRent ?? 0);

  // Finanzierungsdaten
  const defaultEKRate = financingTerms?.loanToValue
    ? (100 - Number(financingTerms.loanToValue))
    : 20;
  const eigenkapitalRate = Number(userParams?.equity_percentage ?? defaultEKRate);
  const zinssatz = Number(userParams?.interest_rate ?? financingTerms?.interestRate ?? 3.8);
  const tilgung = Number(userParams?.amortization_rate ?? financingTerms?.amortizationRate ?? 2.0);
  const maklerRate = Number(userParams?.broker_commission ?? commissionRate ?? 0);
  const renovierungskosten = Number(userParams?.renovation_costs ?? 0);

  // Hausgeld berechnen
  const calculateHausgeld = (): number => {
    if (monthlyFee && Number(monthlyFee) > 0) return Number(monthlyFee);
    if (sqm) {
      const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
      return Number(sqm) * hausgeldProQm;
    }
    return 0;
  };
  const hausgeld = Number(userParams?.monthly_fee ?? calculateHausgeld());

  // Gesamtinvestition berechnen (für Eigenkapital)
  const kaufnebenkosten = effectivePurchasePrice * 0.10 + renovierungskosten + (effectivePurchasePrice * maklerRate / 100);
  const gesamtinvestition = effectivePurchasePrice + kaufnebenkosten;
  const eigenkapital = gesamtinvestition * (eigenkapitalRate / 100);
  const darlehensbetrag = gesamtinvestition - eigenkapital;

  // Monatliche Rate und Ausgaben
  const monatlicheZinsen = darlehensbetrag * (zinssatz / 100 / 12);
  const monatlicheTilgung = darlehensbetrag * (tilgung / 100 / 12);
  const monatlicheRate = Math.ceil(monatlicheZinsen + monatlicheTilgung);
  const instandhaltungskosten = Math.ceil(effectivePurchasePrice * 0.01 / 12);
  const hausgeldNichtUmlegbar = Math.ceil(hausgeld * 0.30);
  const monatlicheAusgaben = monatlicheRate + hausgeldNichtUmlegbar + instandhaltungskosten;

  // Cashflow berechnen
  const calculatedCashflow = mieteinnahmen - monatlicheAusgaben;
  const monthlyCashflow = externalCashflow ?? (mieteinnahmen > 0 ? calculatedCashflow : undefined);

  // Rendite und Faktor lokal berechnen
  const localGrossYield = mieteinnahmen > 0 && effectivePurchasePrice > 0
    ? (mieteinnahmen * 12 / effectivePurchasePrice) * 100
    : undefined;
  const localRentMultiplier = mieteinnahmen > 0 && effectivePurchasePrice > 0
    ? effectivePurchasePrice / (mieteinnahmen * 12)
    : undefined;

  const effectiveGrossYield = localGrossYield ?? grossYield;
  const effectiveRentMultiplier = localRentMultiplier ?? rentMultiplier;

  // Finale Prüfung: Haben wir Daten zum Anzeigen?
  const hasData = hasExternalData || monthlyCashflow !== undefined;

  // No data state - show CTA to trigger AI evaluation OR loading state
  if (!hasData) {
    // Loading state (only when no data yet)
    if (isLoading) {
      return (
        <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 rounded-2xl border p-4 sm:p-6 ${className}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 border-4 border-blue-200 rounded-full"></div>
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Kennzahlen werden berechnet...</p>
              <p className="text-xs sm:text-sm text-gray-600">
                KI-Analyse läuft
              </p>
            </div>
          </div>
        </div>
      );
    }

    // CTA state (no data, not loading)
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 rounded-2xl border p-4 sm:p-6 ${className}`}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:font-semibold text-gray-900">
                Deal-Insights
              </h4>
              <p className="text-gray-600 text-sm">
                Erhalte eine KI-basierte Berechnung der wichtigsten Investment-Kennzahlen.
              </p>
            </div>
          </div>
          {onTriggerEvaluation && (
            <button
              onClick={onTriggerEvaluation}
              className="w-full md:w-auto flex-shrink-0 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles size={18} />
              <span className="whitespace-nowrap">KI-Analyse starten</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Results view - collapsible accordion (has data)
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Accordion Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full p-4 sm:p-5 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator size={18} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              Deal-Insights
            </h3>
          </div>
          <ChevronDown
            size={20}
            className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Key Metrics Cards - always shown */}
        <div className="grid gap-2 sm:gap-3 grid-cols-4">
          {/* Rendite */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${
            effectiveGrossYield !== undefined && Number(effectiveGrossYield) >= 4
              ? 'bg-green-50 border-green-200'
              : effectiveGrossYield !== undefined && Number(effectiveGrossYield) >= 2
                ? 'bg-yellow-50 border-yellow-200'
                : effectiveGrossYield !== undefined && Number(effectiveGrossYield) > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-100'
          }`}>
            <span className="text-sm text-gray-500">Rendite</span>
            <div className={`text-base sm:text-lg font-bold ${effectiveGrossYield !== undefined ? getYieldColor(Number(effectiveGrossYield)) : 'text-gray-400'}`}>
              {effectiveGrossYield !== undefined ? `${Number(effectiveGrossYield).toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Faktor */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${
            effectiveRentMultiplier !== undefined && Number(effectiveRentMultiplier) <= 20
              ? 'bg-green-50 border-green-200'
              : effectiveRentMultiplier !== undefined && Number(effectiveRentMultiplier) <= 25
                ? 'bg-yellow-50 border-yellow-200'
                : effectiveRentMultiplier !== undefined && Number(effectiveRentMultiplier) > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-100'
          }`}>
            <span className="text-sm text-gray-500">Faktor</span>
            <div className={`text-base sm:text-lg font-bold ${
              effectiveRentMultiplier !== undefined && Number(effectiveRentMultiplier) <= 20
                ? 'text-green-600'
                : effectiveRentMultiplier !== undefined && Number(effectiveRentMultiplier) <= 25
                  ? 'text-yellow-600'
                  : effectiveRentMultiplier !== undefined
                    ? 'text-red-600'
                    : 'text-gray-400'
            }`}>
              {effectiveRentMultiplier !== undefined ? `${Number(effectiveRentMultiplier).toFixed(1)}x` : '—'}
            </div>
          </div>

          {/* Cashflow */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${
            monthlyCashflow !== undefined && Number(monthlyCashflow) > 0
              ? 'bg-green-50 border-green-200'
              : monthlyCashflow !== undefined && Number(monthlyCashflow) < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-100'
          }`}>
            <span className="text-sm text-gray-500">Cashflow</span>
            <div className={`text-base sm:text-lg font-bold ${monthlyCashflow !== undefined ? getCashflowColor(Number(monthlyCashflow)) : 'text-gray-400'}`}>
              {monthlyCashflow !== undefined
                ? `${Number(monthlyCashflow) >= 0 ? '+' : ''}${Number(monthlyCashflow).toLocaleString('de-DE')}€`
                : '—'}
            </div>
          </div>

          {/* Cash on Cash */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${
            monthlyCashflow !== undefined && eigenkapital > 0 && monthlyCashflow > 0
              ? 'bg-green-50 border-green-200'
              : monthlyCashflow !== undefined && eigenkapital > 0 && monthlyCashflow < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-100'
          }`}>
            <span className="text-sm text-gray-500 leading-tight block">Cash on Cash</span>
            <div className={`text-base sm:text-lg font-bold ${monthlyCashflow !== undefined && eigenkapital > 0 ? getCashflowColor(monthlyCashflow) : 'text-gray-400'}`}>
              {monthlyCashflow !== undefined && eigenkapital > 0
                ? `${((monthlyCashflow * 12 / eigenkapital) * 100).toFixed(1)}%`
                : '—'}
            </div>
          </div>

        </div>
      </div>

      {/* Expanded Content - InvestmentCalculator */}
      {isExpanded && effectivePurchasePrice > 0 && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
          <InvestmentCalculator
            mode="investor"
            purchasePrice={purchasePrice ?? 0}
            location={location}
            commissionRate={commissionRate}
            equityPercentage={financingTerms?.loanToValue ? (100 - financingTerms.loanToValue) : 20}
            interestRate={financingTerms?.interestRate}
            amortizationRate={financingTerms?.amortizationRate}
            monthlyFee={monthlyFee}
            sqm={sqm}
            yearBuilt={yearBuilt}
            monthlyRent={calculatedRent}
            estimatedRentPerSqm={estimatedRentPerSqm}
            renovationCosts={0}
            userParams={userParams}
            onSaveParams={canEdit ? onSaveParams : undefined}
            isSavingParams={isSavingParams}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}
