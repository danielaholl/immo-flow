'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Home, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { InvestmentCalculator, UserParams, SavedParams } from './InvestmentCalculator';
import { trpc } from '@/app/providers/TRPCProvider';

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

  // Live-Update Callback für Header
  onPurchasePriceChange?: (price: number) => void;
}

export function BuyVsRentCard({
  purchasePrice,
  sqm,
  location,
  monthlyRent,
  avgRentPerSqm,
  monthlyFee,
  yearBuilt,
  interestRate: interestRateProp = 3.5,
  amortizationRate: amortizationRateProp = 2.0,
  equityPercentage: equityPercentageProp = 20,
  commissionRate = 0,
  className = '',
  propertyId,
  userParams,
  onSaveParams,
  isSavingParams = false,
  onPurchasePriceChange,
}: BuyVsRentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isKiFazitExpanded, setIsKiFazitExpanded] = useState(false);

  // Robuste Konvertierung (leere Strings und NaN vermeiden)
  const parseNum = (val: unknown, fallback: number): number => {
    if (val === null || val === undefined || val === '') return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  // Effektive Werte mit Fallbacks
  const interestRate = parseNum(interestRateProp, 3.5);
  const amortizationRate = parseNum(amortizationRateProp, 2.0);
  const equityPercentage = parseNum(equityPercentageProp, 20);

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
      loanAmount: Math.round(loanAmount),
      // Zusätzliche Werte für KI-Analyse
      monthlyMortgage: Math.round(monthlyMortgage),
      monthlyMaintenance: Math.round(monthlyMaintenance),
      equityAmount: Math.round(equityAmount),
      totalInvestment: Math.round(totalInvestment),
    };
  }, [effectiveMonthlyRent, purchasePrice, equityPercentage, interestRate, amortizationRate, effectiveHausgeld, grunderwerbsteuerRate, commissionRate]);

  // Fallback: Regelbasiertes Fazit
  const fallbackFazit = useMemo(() => {
    if (!analysis) return null;

    const { breakEvenYears, effectiveMonthlyRent, totalMonthlyCostBuying } = analysis;
    const monthlySavingsOrCost = effectiveMonthlyRent - totalMonthlyCostBuying;

    let verdict: 'positive' | 'neutral' | 'negative';
    let sentences: string[] = [];

    if (breakEvenYears <= 8) {
      verdict = 'positive';
      sentences.push(`Kaufen lohnt sich: Break-Even bereits nach ${breakEvenYears} Jahren.`);
    } else if (breakEvenYears <= 15) {
      verdict = 'neutral';
      sentences.push(`Break-Even bei ${breakEvenYears} Jahren – langfristige Investition.`);
    } else {
      verdict = 'negative';
      sentences.push(`Break-Even erst nach ${breakEvenYears} Jahren – finanziell wenig attraktiv.`);
    }

    if (monthlySavingsOrCost > 200) {
      sentences.push(`Sie sparen ${formatCurrency(monthlySavingsOrCost)}/Monat gegenüber Miete.`);
    } else if (monthlySavingsOrCost < -300) {
      sentences.push(`Mehrbelastung von ${formatCurrency(Math.abs(monthlySavingsOrCost))}/Monat.`);
    }

    if (equityPercentage < 15) {
      sentences.push(`Niedriges Eigenkapital (${equityPercentage}%) erhöht das Risiko.`);
    }

    if (sentences.length > 3) sentences = sentences.slice(0, 3);

    return {
      verdict,
      text: sentences.join(' '),
      color: verdict === 'positive' ? '#22C55E' : verdict === 'neutral' ? '#F59E0B' : '#EF4444',
    };
  }, [analysis, equityPercentage]);

  // KI-Fazit API Call
  const [aiFazit, setAiFazit] = useState<{
    text: string;
    suggestions?: string[];
    verdict: 'positive' | 'neutral' | 'negative';
    color: string;
  } | null>(null);
  const [fazitRequested, setFazitRequested] = useState(false);
  const [aiFazitError, setAiFazitError] = useState(false);

  const generateAiFazitMutation = trpc.evaluations.generateAiFazit.useMutation({
    onSuccess: (data: { text: string; suggestions?: string[]; verdict: 'positive' | 'neutral' | 'negative'; color: string }) => {
      setAiFazit(data);
    },
    onError: () => {
      setAiFazitError(true);
    },
  });

  // Reset fazitRequested when key values change
  useEffect(() => {
    setFazitRequested(false);
    setAiFazit(null);
  }, [equityPercentage, interestRate, amortizationRate, purchasePrice]);

  // Generate AI Fazit when expanded and we have data
  useEffect(() => {
    if (isExpanded && analysis && !aiFazit && !fazitRequested && !generateAiFazitMutation.isPending && !aiFazitError) {
      // Debug logging
      console.log('🧮 BuyVsRentCard AI Fazit Request:', {
        equityPercentage,
        equityAmount: analysis.equityAmount,
        interestRate,
        amortizationRate,
        purchasePrice,
      });

      setFazitRequested(true);
      // Nur mit propertyId aufrufen (erforderlich für Persistierung)
      if (!propertyId) {
        console.warn('No propertyId - AI Fazit cannot be persisted');
        return;
      }
      generateAiFazitMutation.mutate({
        mode: 'eigennutzer',
        propertyId: propertyId,
        forceRegenerate: false,
        purchasePrice: Number(purchasePrice),
        monthlyRent: Number(analysis.effectiveMonthlyRent),
        breakEvenYears: Number(analysis.breakEvenYears),
        totalMonthlyCostBuying: Number(analysis.totalMonthlyCostBuying),
        equityPercentage: Number(equityPercentage),
        interestRate: Number(interestRate),
        loanAmount: Number(analysis.loanAmount),
        // Neue Felder
        amortizationRate: Number(amortizationRate),
        monthlyMortgage: Number(analysis.monthlyMortgage),
        totalInvestment: Number(analysis.totalInvestment),
        monthlyFee: Number(effectiveHausgeld),
        monthlyMaintenance: Number(analysis.monthlyMaintenance),
        equityAmount: Number(analysis.equityAmount),
        // Immobilie
        location: location,
        sqm: sqm ? Number(sqm) : undefined,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      });
    }
  }, [isExpanded, analysis, aiFazit, fazitRequested, aiFazitError, equityPercentage, interestRate, amortizationRate, purchasePrice, propertyId]);

  // Use AI fazit if available, otherwise fallback
  const displayFazit = aiFazit || (aiFazitError ? fallbackFazit : null);

  // Helper to get bgColor from verdict
  const getFazitBgColor = (verdict: string) => {
    if (verdict === 'positive') return 'bg-green-50 border-green-200';
    if (verdict === 'neutral') return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

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
        className="w-full p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
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
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-700">
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(purchasePrice)}
            </span>
            <ChevronDown
              size={20}
              className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 grid-cols-3">
          {/* Break-Even */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${getBreakEvenBg()}`}>
            <span className="text-sm text-gray-500">Break-Even</span>
            <div className={`text-base sm:text-lg font-bold ${getBreakEvenColor()}`}>
              {analysis.breakEvenYears} <span className="hidden sm:inline">{analysis.breakEvenYears === 1 ? 'Jahr' : 'Jahre'}</span><span className="sm:hidden">J.</span>
            </div>
          </div>

          {/* Miete */}
          <div className="rounded-xl p-2 sm:p-3 text-center border bg-gray-50 border-gray-200">
            <span className="text-sm text-gray-500">Miete/Monat</span>
            <div className="text-base sm:text-lg font-bold text-gray-900">
              {formatCurrency(analysis.effectiveMonthlyRent)}
            </div>
          </div>

          {/* Kaufkosten */}
          <div className={`rounded-xl p-2 sm:p-3 text-center border ${
            analysis.totalMonthlyCostBuying < analysis.effectiveMonthlyRent
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-sm text-gray-500">Kauf/Monat</span>
            <div className={`text-base sm:text-lg font-bold ${
              analysis.totalMonthlyCostBuying < analysis.effectiveMonthlyRent
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
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
          {/* KI-Fazit - Collapsible */}
          {generateAiFazitMutation.isPending ? (
            <div className="mt-4 mb-4 rounded-xl p-4 border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-700">KI-Fazit wird generiert...</p>
              </div>
            </div>
          ) : displayFazit ? (
            <div className="mt-4 mb-4">
              <div className="rounded-xl border overflow-hidden bg-gray-50 border-gray-200">
                {/* Accordion Header */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-100/50 transition-colors"
                  onClick={() => setIsKiFazitExpanded(!isKiFazitExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: displayFazit.color + '20' }}
                    >
                      <Sparkles className="w-4 h-4" style={{ color: displayFazit.color }} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {aiFazitError ? 'Fazit' : 'KI-Fazit'}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-200 ${isKiFazitExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Accordion Content */}
                {isKiFazitExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Fazit Text */}
                    <p className="text-sm text-gray-700 leading-relaxed">{displayFazit.text}</p>

                    {/* Optimierungsvorschläge */}
                    {aiFazit?.suggestions && aiFazit.suggestions.length > 0 && (
                      <div className="rounded-xl p-3 bg-white/50 border border-indigo-100">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
                            <svg className="w-3 h-3 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-900 mb-1.5">
                              Optimierungspotenzial
                            </p>
                            <ul className="space-y-1">
                              {aiFazit.suggestions.map((tip, index) => (
                                <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                                  <span className="text-indigo-500 flex-shrink-0">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Neu generieren Button */}
                    {propertyId && analysis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiFazit(null);
                          setFazitRequested(true);
                          setAiFazitError(false);
                          generateAiFazitMutation.mutate({
                            mode: 'eigennutzer',
                            propertyId: propertyId,
                            forceRegenerate: true,
                            purchasePrice: Number(purchasePrice),
                            monthlyRent: Number(analysis.effectiveMonthlyRent),
                            breakEvenYears: Number(analysis.breakEvenYears),
                            totalMonthlyCostBuying: Number(analysis.totalMonthlyCostBuying),
                            equityPercentage: Number(equityPercentage),
                            interestRate: Number(interestRate),
                            loanAmount: Number(analysis.loanAmount),
                            amortizationRate: Number(amortizationRate),
                            monthlyMortgage: Number(analysis.monthlyMortgage),
                            totalInvestment: Number(analysis.totalInvestment),
                            monthlyFee: Number(effectiveHausgeld),
                            monthlyMaintenance: Number(analysis.monthlyMaintenance),
                            equityAmount: Number(analysis.equityAmount),
                            location: location,
                            sqm: sqm ? Number(sqm) : undefined,
                            yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
                          });
                        }}
                        disabled={generateAiFazitMutation.isPending}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                        </svg>
                        Neu generieren
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
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
            onPurchasePriceChange={onPurchasePriceChange}
            canEdit={true}
          />
        </div>
      )}
    </div>
  );
}
