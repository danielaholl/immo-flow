'use client';

import React, { useState, useMemo } from 'react';
import { Home, ChevronDown } from 'lucide-react';
import { InvestmentCalculator, UserParams, SavedParams } from './InvestmentCalculator';

// Grunderwerbsteuer nach Bundesland (gleiche Werte wie InvestmentCalculator)
const GRUNDERWERBSTEUER_SAETZE: Record<string, number> = {
  'bayern': 3.5,
  'sachsen': 3.5,
  'hamburg': 4.5,
  'baden-württemberg': 5.0,
  'niedersachsen': 5.0,
  'rheinland-pfalz': 5.0,
  'sachsen-anhalt': 5.0,
  'berlin': 6.0,
  'hessen': 6.0,
  'mecklenburg-vorpommern': 6.0,
  'bremen': 5.0,
  'nordrhein-westfalen': 6.5,
  'saarland': 6.5,
  'schleswig-holstein': 6.5,
  'brandenburg': 6.5,
  'thüringen': 6.5,
};

function detectStateFromLocation(location?: string): string | null {
  if (!location) return null;
  const locationLower = location.toLowerCase();
  for (const state of Object.keys(GRUNDERWERBSTEUER_SAETZE)) {
    if (locationLower.includes(state)) return state;
  }
  // Stadt-basierte Erkennung
  if (locationLower.includes('münchen') || locationLower.includes('nürnberg')) return 'bayern';
  if (locationLower.includes('berlin')) return 'berlin';
  if (locationLower.includes('hamburg')) return 'hamburg';
  if (locationLower.includes('frankfurt') || locationLower.includes('wiesbaden')) return 'hessen';
  if (locationLower.includes('köln') || locationLower.includes('düsseldorf')) return 'nordrhein-westfalen';
  if (locationLower.includes('stuttgart')) return 'baden-württemberg';
  if (locationLower.includes('dresden') || locationLower.includes('leipzig')) return 'sachsen';
  return null;
}

export interface BuyVsRentCardProps {
  purchasePrice: number;
  sqm: number;
  location?: string;
  monthlyRent?: number;        // Actual monthly rent if known
  avgRentPerSqm?: number;      // Fallback: rent per sqm from market data
  monthlyFee?: number;         // Hausgeld
  yearBuilt?: number;          // Baujahr (für Hausgeld-Schätzung)
  interestRate?: number;       // Zinssatz in %
  amortizationRate?: number;   // Tilgung in %
  equityPercentage?: number;   // Eigenkapitalquote in %
  commissionRate?: number;     // Maklergebühr in %
  className?: string;

  // Persistenz
  propertyId?: string;
  userParams?: UserParams | null;
  onSaveParams?: (params: SavedParams) => void;
  isSavingParams?: boolean;
}

export function BuyVsRentCard({
  purchasePrice,
  sqm,
  location,
  monthlyRent,
  avgRentPerSqm,
  monthlyFee,
  yearBuilt,
  interestRate = 3.5,
  amortizationRate = 2.0,
  equityPercentage = 20,
  commissionRate = 0,
  className = '',
  propertyId,
  userParams,
  onSaveParams,
  isSavingParams = false,
}: BuyVsRentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate effective monthly rent (Marktmiete)
  const effectiveMonthlyRent = useMemo(() => {
    if (monthlyRent && monthlyRent >= 100) {
      return monthlyRent;
    } else if (avgRentPerSqm && sqm > 0) {
      return avgRentPerSqm * sqm;
    } else if (monthlyRent && monthlyRent > 0 && sqm > 0) {
      return monthlyRent * sqm;
    }
    return 0;
  }, [monthlyRent, avgRentPerSqm, sqm]);

  // Calculate Hausgeld
  const effectiveHausgeld = useMemo(() => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm > 0) {
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return sqm * hausgeldProQm;
    }
    return 0;
  }, [monthlyFee, sqm, yearBuilt]);

  // Grunderwerbsteuer ermitteln
  const detectedState = detectStateFromLocation(location);
  const grunderwerbsteuerRate = detectedState
    ? GRUNDERWERBSTEUER_SAETZE[detectedState]
    : 5.0; // Default

  // Quick calculation for summary cards (gleiche Logik wie InvestmentCalculator)
  const analysis = useMemo(() => {
    if (effectiveMonthlyRent <= 0 || purchasePrice <= 0) return null;

    // Kaufnebenkosten (detailliert wie InvestmentCalculator)
    const grunderwerbsteuer = purchasePrice * (grunderwerbsteuerRate / 100);
    const notarkosten = purchasePrice * 0.015;
    const grundbuchkosten = purchasePrice * 0.005;
    const maklergebuehren = purchasePrice * (commissionRate / 100);
    const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren;
    const totalInvestment = purchasePrice + kaufnebenkosten;

    // Finanzierung
    const equityAmount = totalInvestment * (equityPercentage / 100);
    const loanAmount = totalInvestment - equityAmount;
    const monatlicheZinsen = loanAmount * (interestRate / 100 / 12);
    const monatlicheTilgung = loanAmount * (amortizationRate / 100 / 12);
    const monthlyMortgage = Math.ceil(monatlicheZinsen + monatlicheTilgung);

    // Instandhaltung (~1% p.a.)
    const monthlyMaintenance = Math.ceil(purchasePrice * 0.01 / 12);

    // Monatliche Kosten beim Kauf (volle Kosten für Eigennutzer)
    const totalMonthlyCostBuying = monthlyMortgage + effectiveHausgeld + monthlyMaintenance;

    // Break-Even Berechnung (gleiche Logik wie InvestmentCalculator)
    const APPRECIATION_RATE = 0.025;
    const RENT_INCREASE_RATE = 0.025;

    let propertyValue = purchasePrice;
    let remainingLoan = loanAmount;
    let currentYearlyRent = effectiveMonthlyRent * 12;
    let breakEvenYears = 0;
    let renterAccumulatedSavings = equityAmount;

    const yearlyMortgage = monthlyMortgage * 12;
    const yearlyMaintenance = monthlyMaintenance * 12;
    const yearlyHausgeld = effectiveHausgeld * 12;
    const yearlyBuyerCost = yearlyMortgage + yearlyMaintenance + yearlyHausgeld;
    const yearlyTilgung = loanAmount * (amortizationRate / 100);

    for (let year = 1; year <= 40; year++) {
      currentYearlyRent *= (1 + RENT_INCREASE_RATE);
      const yearlySavingsFromRenting = Math.max(0, yearlyBuyerCost - currentYearlyRent);
      renterAccumulatedSavings = renterAccumulatedSavings + yearlySavingsFromRenting;

      remainingLoan = Math.max(0, remainingLoan - yearlyTilgung);
      propertyValue *= (1 + APPRECIATION_RATE);

      const buyerNetWorth = propertyValue - remainingLoan;
      if (buyerNetWorth >= renterAccumulatedSavings && breakEvenYears === 0) {
        breakEvenYears = year;
      }
    }

    if (breakEvenYears === 0) breakEvenYears = 40;
    const isBuyingBetter = breakEvenYears <= 10;

    return {
      breakEvenYears,
      effectiveMonthlyRent: Math.round(effectiveMonthlyRent),
      totalMonthlyCostBuying: Math.round(totalMonthlyCostBuying),
      isBuyingBetter,
    };
  }, [effectiveMonthlyRent, purchasePrice, equityPercentage, interestRate, amortizationRate, effectiveHausgeld, grunderwerbsteuerRate, commissionRate]);

  if (!analysis) return null;

  const getBreakEvenColor = () => {
    if (analysis.breakEvenYears <= 10) return 'text-green-600';
    if (analysis.breakEvenYears <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBreakEvenBg = () => {
    if (analysis.breakEvenYears <= 10) return 'bg-green-50 border-green-200';
    if (analysis.breakEvenYears <= 20) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
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
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home size={18} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              Kaufen vs. Mieten
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium hidden sm:inline-block"
              style={{
                backgroundColor: analysis.isBuyingBetter ? '#22C55E20' : '#F59E0B20',
                color: analysis.isBuyingBetter ? '#16A34A' : '#D97706',
              }}
            >
              {analysis.isBuyingBetter ? 'Kaufen lohnt sich' : 'Langfristige Investition'}
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 grid-cols-3">
          {/* Break-Even */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${getBreakEvenBg()}`}>
            <span className="text-sm text-gray-500">Break-Even</span>
            <div className={`text-base sm:text-lg font-bold ${getBreakEvenColor()}`}>
              {analysis.breakEvenYears} J.
            </div>
          </div>

          {/* Miete */}
          <div className="rounded-xl p-2 sm:p-3 text-center border bg-blue-50 border-blue-200">
            <span className="text-sm text-gray-500">Miete/Monat</span>
            <div className="text-base sm:text-lg font-bold text-blue-600">
              {formatCurrency(analysis.effectiveMonthlyRent)}
            </div>
          </div>

          {/* Kaufkosten */}
          <div className="rounded-xl p-2 sm:p-3 text-center border bg-red-50 border-red-200">
            <span className="text-sm text-gray-500">Kauf/Monat</span>
            <div className="text-base sm:text-lg font-bold text-red-600">
              {formatCurrency(analysis.totalMonthlyCostBuying)}
            </div>
          </div>
        </div>

        {/* Status Badge - Mobile only */}
        <div className="mt-3 flex justify-center sm:hidden">
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: analysis.isBuyingBetter ? '#22C55E20' : '#F59E0B20',
              color: analysis.isBuyingBetter ? '#16A34A' : '#D97706',
            }}
          >
            {analysis.isBuyingBetter ? 'Kaufen lohnt sich' : 'Langfristige Investition'}
          </span>
        </div>
      </div>

      {/* Expanded Details - InvestmentCalculator */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
          <InvestmentCalculator
            mode="eigennutzer"
            purchasePrice={purchasePrice}
            location={location}
            commissionRate={commissionRate}
            equityPercentage={equityPercentage}
            interestRate={interestRate}
            amortizationRate={amortizationRate}
            monthlyFee={monthlyFee}
            sqm={sqm}
            yearBuilt={yearBuilt}
            marketRent={effectiveMonthlyRent}
            userParams={userParams}
            onSaveParams={propertyId && onSaveParams ? onSaveParams : undefined}
            isSavingParams={isSavingParams}
            canEdit={true}
          />
        </div>
      )}
    </div>
  );
}
