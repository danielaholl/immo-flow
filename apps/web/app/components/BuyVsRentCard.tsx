'use client';

import React, { useState, useMemo } from 'react';
import { Home, TrendingUp, Calculator, ChevronDown, Wallet, PiggyBank } from 'lucide-react';

export interface BuyVsRentCardProps {
  purchasePrice: number;
  sqm: number;
  monthlyRent?: number;        // Actual monthly rent if known
  avgRentPerSqm?: number;      // Fallback: rent per sqm from market data
  monthlyFee?: number;         // Hausgeld
  yearBuilt?: number;          // Baujahr (für Hausgeld-Schätzung)
  interestRate?: number;       // Zinssatz in %
  amortizationRate?: number;   // Tilgung in %
  equityPercentage?: number;   // Eigenkapitalquote in %
  className?: string;
}

export function BuyVsRentCard({
  purchasePrice,
  sqm,
  monthlyRent,
  avgRentPerSqm,
  monthlyFee,
  yearBuilt,
  interestRate = 3.5,
  amortizationRate = 2.0,
  equityPercentage = 20,
  className = '',
}: BuyVsRentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate Hausgeld - use provided value or estimate based on sqm and yearBuilt
  const { effectiveHausgeld, isHausgeldEstimated } = useMemo(() => {
    if (monthlyFee && monthlyFee > 0) {
      return { effectiveHausgeld: monthlyFee, isHausgeldEstimated: false };
    }
    if (sqm > 0) {
      // Altbau (<1980): 3.50€/m², Neubau (≥1980): 2.50€/m²
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return { effectiveHausgeld: sqm * hausgeldProQm, isHausgeldEstimated: true };
    }
    return { effectiveHausgeld: 0, isHausgeldEstimated: false };
  }, [monthlyFee, sqm, yearBuilt]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate effective monthly rent
  const effectiveMonthlyRent = useMemo(() => {
    if (monthlyRent && monthlyRent >= 100) {
      return monthlyRent;
    } else if (avgRentPerSqm && sqm > 0) {
      return avgRentPerSqm * sqm;
    } else if (monthlyRent && monthlyRent > 0 && sqm > 0) {
      // monthlyRent is likely €/m², multiply by sqm
      return monthlyRent * sqm;
    }
    return 0;
  }, [monthlyRent, avgRentPerSqm, sqm]);

  // Calculate buy vs rent analysis
  const analysis = useMemo(() => {
    if (effectiveMonthlyRent <= 0 || purchasePrice <= 0) return null;

    // Kaufnebenkosten (~10%)
    const purchaseCosts = purchasePrice * 0.10;
    const totalInvestment = purchasePrice + purchaseCosts;

    // Finanzierung
    const equityAmount = totalInvestment * (equityPercentage / 100);
    const loanAmount = totalInvestment - equityAmount;
    const annualRate = (interestRate + amortizationRate) / 100;
    const monthlyMortgage = (loanAmount * annualRate) / 12;

    // Monatliche Kosten beim Kauf
    const monthlyOwnershipCost = monthlyMortgage + effectiveHausgeld;

    // Instandhaltungsrücklage (~1% p.a. vom Kaufpreis)
    const monthlyMaintenance = (purchasePrice * 0.01) / 12;
    const totalMonthlyCostBuying = monthlyOwnershipCost + monthlyMaintenance;

    // Opportunitätskosten des Eigenkapitals (konservativ 5% p.a.)
    const opportunityCostRate = 0.05;
    const monthlyOpportunityCost = (equityAmount * opportunityCostRate) / 12;

    // Parameter für Langzeitberechnung
    const APPRECIATION_RATE = 0.025;   // 2.5% Wertsteigerung p.a.
    const RENT_INCREASE_RATE = 0.025;  // 2.5% Mietsteigerung p.a.

    let propertyValue = purchasePrice;
    let remainingLoan = loanAmount;
    let currentYearlyRent = effectiveMonthlyRent * 12;
    let breakEvenYears = 0;

    // Mieter accumulated savings (invested capital + monthly savings)
    let renterAccumulatedSavings = equityAmount; // Starts with equity not spent

    for (let year = 1; year <= 40; year++) {
      // Yearly costs for buyer
      const yearlyMortgage = monthlyMortgage * 12;
      const yearlyMaintenance = monthlyMaintenance * 12;
      const yearlyHausgeld = effectiveHausgeld * 12;
      const yearlyBuyerCost = yearlyMortgage + yearlyMaintenance + yearlyHausgeld;

      // Yearly rent (increases each year)
      currentYearlyRent *= (1 + RENT_INCREASE_RATE);

      // Monthly savings for renter (if buying costs more than renting)
      const yearlySavingsFromRenting = Math.max(0, yearlyBuyerCost - currentYearlyRent);

      // Renter's accumulated savings grow with opportunity cost rate
      renterAccumulatedSavings = renterAccumulatedSavings * (1 + opportunityCostRate) + yearlySavingsFromRenting;

      // Tilgung reduziert Restschuld
      const yearlyTilgung = loanAmount * (amortizationRate / 100);
      remainingLoan = Math.max(0, remainingLoan - yearlyTilgung);

      // Wertsteigerung
      propertyValue *= (1 + APPRECIATION_RATE);

      // Netto-Vermögen Käufer = Immobilienwert - Restschuld
      const buyerNetWorth = propertyValue - remainingLoan;

      // Break-even wenn Käufer-Vermögen > Mieter-Vermögen (inkl. gesparter Differenz)
      if (buyerNetWorth >= renterAccumulatedSavings && breakEvenYears === 0) {
        breakEvenYears = year;
      }
    }

    // If no breakeven found in 40 years
    if (breakEvenYears === 0) breakEvenYears = 40;

    const isBuyingBetter = breakEvenYears <= 15;
    const monthlySavingsIfRenting = totalMonthlyCostBuying - effectiveMonthlyRent;

    return {
      breakEvenYears,
      effectiveMonthlyRent,
      monthlyMortgage: Math.round(monthlyMortgage),
      monthlyOwnershipCost: Math.round(monthlyOwnershipCost),
      totalMonthlyCostBuying: Math.round(totalMonthlyCostBuying),
      monthlyMaintenance: Math.round(monthlyMaintenance),
      equityAmount: Math.round(equityAmount),
      loanAmount: Math.round(loanAmount),
      isBuyingBetter,
      monthlySavingsIfRenting: Math.round(monthlySavingsIfRenting),
      monthlyOpportunityCost: Math.round(monthlyOpportunityCost),
    };
  }, [effectiveMonthlyRent, purchasePrice, equityPercentage, interestRate, amortizationRate, effectiveHausgeld]);

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
          <div className="rounded-xl p-2 sm:p-3 text-center border bg-purple-50 border-purple-200">
            <span className="text-sm text-gray-500">Kauf/Monat</span>
            <div className="text-base sm:text-lg font-bold text-purple-600">
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

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
          {/* Mieten Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank size={18} className="text-blue-600" />
              <h4 className="font-semibold text-gray-900 text-base">Mieten</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monatliche Miete</span>
                <span className="font-medium text-gray-900">{formatCurrency(analysis.effectiveMonthlyRent)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>+ Entgangene Rendite auf EK (5% p.a.)</span>
                <span>~{formatCurrency(analysis.monthlyOpportunityCost)}/Monat</span>
              </div>
            </div>
          </div>

          {/* Kaufen Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-purple-600" />
              <h4 className="font-semibold text-gray-900 text-base">Kaufen</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Kreditrate ({interestRate}% + {amortizationRate}%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(analysis.monthlyMortgage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">+ Hausgeld{isHausgeldEstimated && ' (KI-geschätzt)'}</span>
                <span className="font-medium text-gray-900">{formatCurrency(effectiveHausgeld)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">+ Instandhaltung (~1% p.a.)</span>
                <span className="font-medium text-gray-900">{formatCurrency(analysis.monthlyMaintenance)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-900 font-semibold">Gesamt/Monat</span>
                <span className="font-bold text-gray-900">{formatCurrency(analysis.totalMonthlyCostBuying)}</span>
              </div>
            </div>
          </div>

          {/* Finanzierung */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={18} className="text-gray-600" />
              <h4 className="font-semibold text-gray-700 text-base">Finanzierung</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Eigenkapital ({equityPercentage}%)</span>
                <p className="font-medium text-gray-900">{formatCurrency(analysis.equityAmount)}</p>
              </div>
              <div>
                <span className="text-gray-500">Darlehen</span>
                <p className="font-medium text-gray-900">{formatCurrency(analysis.loanAmount)}</p>
              </div>
            </div>
          </div>

          {/* Fazit */}
          <div className="p-3 bg-indigo-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="text-indigo-600" />
              <h4 className="font-semibold text-indigo-900 text-base">Fazit</h4>
            </div>
            <p className="text-sm text-indigo-800">
              {analysis.isBuyingBetter ? (
                <>
                  Nach <strong>{analysis.breakEvenYears} Jahren</strong> übersteigt das aufgebaute Immobilienvermögen
                  die alternative Kapitalanlage. Berücksichtigt sind Wertsteigerung (2,5% p.a.),
                  Tilgung und entgangene Rendite auf das Eigenkapital.
                </>
              ) : (
                <>
                  Der Break-Even liegt bei <strong>{analysis.breakEvenYears} Jahren</strong>.
                  Bei diesem Preis-Miete-Verhältnis ist die Immobilie eine sehr langfristige Investition.
                  Prüfen Sie, ob ein niedrigerer Kaufpreis verhandelbar ist.
                </>
              )}
            </p>
          </div>

          {/* Hinweis */}
          <p className="text-xs text-gray-400 mt-3 text-center">
            Annahmen: 2,5% Wertsteigerung, 2,5% Mietsteigerung, 5% alternative Kapitalrendite p.a.
          </p>
        </div>
      )}
    </div>
  );
}
