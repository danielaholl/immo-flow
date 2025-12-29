'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';

// Grunderwerbsteuer nach Bundesland
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
  if (locationLower.includes('münchen') || locationLower.includes('nürnberg')) return 'bayern';
  if (locationLower.includes('berlin')) return 'berlin';
  if (locationLower.includes('hamburg')) return 'hamburg';
  if (locationLower.includes('frankfurt') || locationLower.includes('wiesbaden')) return 'hessen';
  if (locationLower.includes('köln') || locationLower.includes('düsseldorf')) return 'nordrhein-westfalen';
  if (locationLower.includes('stuttgart')) return 'baden-württemberg';
  if (locationLower.includes('dresden') || locationLower.includes('leipzig')) return 'sachsen';
  return null;
}

export interface BuyVsRentTeaserCardProps {
  propertyId: string;
  purchasePrice: number;
  sqm: number;
  location?: string;
  monthlyRent?: number;
  avgRentPerSqm?: number;
  monthlyFee?: number;
  yearBuilt?: number;
  interestRate?: number;
  amortizationRate?: number;
  equityPercentage?: number;
  commissionRate?: number;
  userParams?: {
    purchase_price?: string | number | null;
    monthly_rent?: string | number | null;
    monthly_fee?: string | number | null;
    equity_percentage?: string | number | null;
    interest_rate?: string | number | null;
    amortization_rate?: string | number | null;
    broker_commission?: string | number | null;
  } | null;
  className?: string;
}

const parseNum = (val: unknown, fallback: number): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function BuyVsRentTeaserCard({
  propertyId,
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
  userParams,
  className = '',
}: BuyVsRentTeaserCardProps) {
  const interestRate = parseNum(userParams?.interest_rate ?? interestRateProp, 3.5);
  const amortizationRate = parseNum(userParams?.amortization_rate ?? amortizationRateProp, 2.0);
  const equityPercentage = parseNum(userParams?.equity_percentage ?? equityPercentageProp, 20);
  const effectivePurchasePrice = parseNum(userParams?.purchase_price ?? purchasePrice, purchasePrice);

  const effectiveMonthlyRent = useMemo(() => {
    const userRent = parseNum(userParams?.monthly_rent, 0);
    if (userRent >= 100) return userRent;
    if (monthlyRent && monthlyRent >= 100) return monthlyRent;
    if (avgRentPerSqm && sqm > 0) return avgRentPerSqm * sqm;
    if (monthlyRent && monthlyRent > 0 && sqm > 0) return monthlyRent * sqm;
    return 0;
  }, [userParams?.monthly_rent, monthlyRent, avgRentPerSqm, sqm]);

  const effectiveHausgeld = useMemo(() => {
    const userHausgeld = parseNum(userParams?.monthly_fee, 0);
    if (userHausgeld > 0) return userHausgeld;
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm > 0) {
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return sqm * hausgeldProQm;
    }
    return 0;
  }, [userParams?.monthly_fee, monthlyFee, sqm, yearBuilt]);

  const detectedState = detectStateFromLocation(location);
  const grunderwerbsteuerRate = detectedState ? GRUNDERWERBSTEUER_SAETZE[detectedState] : 5.0;
  const effectiveCommissionRate = parseNum(userParams?.broker_commission ?? commissionRate, 0);

  const analysis = useMemo(() => {
    if (effectiveMonthlyRent <= 0 || effectivePurchasePrice <= 0) return null;

    const grunderwerbsteuer = effectivePurchasePrice * (grunderwerbsteuerRate / 100);
    const notarkosten = effectivePurchasePrice * 0.015;
    const grundbuchkosten = effectivePurchasePrice * 0.005;
    const maklergebuehren = effectivePurchasePrice * (effectiveCommissionRate / 100);
    const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren;
    const totalInvestment = effectivePurchasePrice + kaufnebenkosten;

    const equityAmount = totalInvestment * (equityPercentage / 100);
    const loanAmount = totalInvestment - equityAmount;
    const monatlicheZinsen = loanAmount * (interestRate / 100 / 12);
    const monatlicheTilgung = loanAmount * (amortizationRate / 100 / 12);
    const monthlyMortgage = Math.ceil(monatlicheZinsen + monatlicheTilgung);

    const monthlyMaintenance = Math.ceil(effectivePurchasePrice * 0.01 / 12);
    const totalMonthlyCostBuying = monthlyMortgage + effectiveHausgeld + monthlyMaintenance;

    // Break-Even ohne Wertsteigerung - reiner Kostenvergleich
    // Jährliche Kosten Käufer (ohne Tilgung, da Tilgung Vermögensaufbau ist)
    const jaehrlicheZinsen = loanAmount * (interestRate / 100);
    const jaehrlicheInstandhaltung = monthlyMaintenance * 12;
    const jaehrlichesHausgeld = effectiveHausgeld * 12;
    const jaehrlicheKaeuferKosten = jaehrlicheZinsen + jaehrlicheInstandhaltung + jaehrlichesHausgeld;

    // Jährliche Kosten Mieter
    const jaehrlicheMiete = effectiveMonthlyRent * 12;

    // Jährliche Ersparnis durch Kaufen
    const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;

    let breakEvenYears: number;
    if (jaehrlicheErsparnis <= 0) {
      breakEvenYears = 99; // Kaufen lohnt sich nie (ohne Wertsteigerung)
    } else {
      breakEvenYears = Math.min(Math.ceil(kaufnebenkosten / jaehrlicheErsparnis), 99);
    }

    const isBuyingBetter = breakEvenYears <= 10;

    return {
      breakEvenYears,
      effectiveMonthlyRent: Math.round(effectiveMonthlyRent),
      totalMonthlyCostBuying: Math.round(totalMonthlyCostBuying),
      isBuyingBetter,
    };
  }, [effectiveMonthlyRent, effectivePurchasePrice, equityPercentage, interestRate, amortizationRate, effectiveHausgeld, grunderwerbsteuerRate, effectiveCommissionRate]);

  if (!analysis) return null;

  return (
    <Link href={`/property/${propertyId}/calculator?tab=eigennutzer`} className="block group">
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-300 ${className}`}>
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <Home size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Kaufen vs. Mieten</h3>
                <p className="text-xs text-gray-500">Für Eigennutzer</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium hidden sm:inline-block ${
                analysis.isBuyingBetter
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {analysis.isBuyingBetter ? 'Kaufen lohnt sich' : 'Langfristig'}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-violet-600 transition-colors">
                <span className="hidden sm:inline font-medium">Details</span>
                <ArrowRight size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid - Airbnb style */}
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-3">
            {/* Break-Even */}
            <div className={`rounded-xl p-3 text-center ${
              analysis.breakEvenYears <= 10
                ? 'bg-emerald-50'
                : analysis.breakEvenYears <= 20
                  ? 'bg-amber-50'
                  : 'bg-rose-50'
            }`}>
              <p className="text-xs text-gray-500 mb-1">Break-Even</p>
              <p className={`text-lg font-semibold ${
                analysis.breakEvenYears <= 10
                  ? 'text-emerald-600'
                  : analysis.breakEvenYears <= 20
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}>
                {analysis.breakEvenYears} Jahre
              </p>
            </div>

            {/* Miete */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Miete/Monat</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(analysis.effectiveMonthlyRent)}
              </p>
            </div>

            {/* Kaufkosten */}
            <div className={`rounded-xl p-3 text-center ${
              analysis.totalMonthlyCostBuying < analysis.effectiveMonthlyRent
                ? 'bg-emerald-50'
                : 'bg-rose-50'
            }`}>
              <p className="text-xs text-gray-500 mb-1">Kauf/Monat</p>
              <p className={`text-lg font-semibold ${
                analysis.totalMonthlyCostBuying < analysis.effectiveMonthlyRent
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}>
                {formatCurrency(analysis.totalMonthlyCostBuying)}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Status Badge */}
        <div className="px-5 pb-4 sm:hidden">
          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium ${
            analysis.isBuyingBetter
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {analysis.isBuyingBetter ? 'Kaufen lohnt sich' : 'Langfristige Investition'}
          </span>
        </div>
      </div>
    </Link>
  );
}
