'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Landmark,
  Wallet,
  Home,
  TrendingUp,
  ChevronDown,
  RotateCcw,
  Calendar,
  Pencil,
  Check,
} from 'lucide-react';

// Types
export interface UserParams {
  equity_percentage?: number | null;
  interest_rate?: number | null;
  amortization_rate?: number | null;
  broker_commission?: number | null;
  monthly_rent?: number | null;
  monthly_fee?: number | null;
  purchase_price?: number | null;
  renovation_costs?: number | null;
}

export interface SavedParams {
  equityPercentage?: number | null;
  interestRate?: number | null;
  amortizationRate?: number | null;
  brokerCommission?: number | null;
  monthlyRent?: number | null;
  monthlyFee?: number | null;
  purchasePrice?: number | null;
  renovationCosts?: number | null;
  // Berechnete Kennzahlen
  calculatedGrossYield?: number | null;
  calculatedRentMultiplier?: number | null;
  calculatedMonthlyCashflow?: number | null;
}

export interface InvestmentCalculatorProps {
  // Grunddaten
  purchasePrice: number;
  location?: string;
  commissionRate?: number; // Maklergebühr in %

  // Finanzierung
  equityPercentage?: number;
  interestRate?: number;
  amortizationRate?: number;

  // Betriebskosten
  monthlyFee?: number; // Hausgeld
  sqm?: number;
  yearBuilt?: number;

  // Modus
  mode: 'investor' | 'eigennutzer';

  // Für Investor-Modus
  monthlyRent?: number;
  estimatedRentPerSqm?: number;
  renovationCosts?: number; // Renovierungskosten

  // Für Eigennutzer-Modus (Miete als Vergleich)
  marketRent?: number;

  // Persistenz (für DB-Speicherung)
  userParams?: UserParams | null;
  onSaveParams?: (params: SavedParams) => void;
  isSavingParams?: boolean;

  // Optionen
  canEdit?: boolean;
  className?: string;
}

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

export function InvestmentCalculator({
  purchasePrice,
  location,
  commissionRate = 0,
  equityPercentage = 20,
  interestRate = 3.8,
  amortizationRate = 2.0,
  monthlyFee,
  sqm,
  yearBuilt,
  mode,
  monthlyRent,
  estimatedRentPerSqm,
  renovationCosts = 0,
  marketRent,
  userParams,
  onSaveParams,
  isSavingParams = false,
  canEdit = true,
  className = '',
}: InvestmentCalculatorProps) {
  // Accordion States
  const [isKaufnebenkostenExpanded, setIsKaufnebenkostenExpanded] = useState(false);
  const [isKapitaldienstExpanded, setIsKapitaldienstExpanded] = useState(false);
  const [isAusgabenExpanded, setIsAusgabenExpanded] = useState(false);
  const [isCashflowExpanded, setIsCashflowExpanded] = useState(false);

  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number | null>(null);
  const [editEquityPercent, setEditEquityPercent] = useState<number | null>(null);
  const [editInterestRate, setEditInterestRate] = useState<number | null>(null);
  const [editAmortizationRate, setEditAmortizationRate] = useState<number | null>(null);
  const [editBrokerCommission, setEditBrokerCommission] = useState<number | null>(null);
  const [editRenovationCosts, setEditRenovationCosts] = useState<number | null>(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState<number | null>(null);
  const [editMonthlyRent, setEditMonthlyRent] = useState<number | null>(null);

  // Initialisiere Edit-States aus userParams wenn vorhanden
  useEffect(() => {
    if (userParams) {
      setEditPurchasePrice(userParams.purchase_price ?? null);
      setEditEquityPercent(userParams.equity_percentage ?? null);
      setEditInterestRate(userParams.interest_rate ?? null);
      setEditAmortizationRate(userParams.amortization_rate ?? null);
      setEditBrokerCommission(userParams.broker_commission ?? null);
      setEditRenovationCosts(userParams.renovation_costs ?? null);
      setEditMonthlyFee(userParams.monthly_fee ?? null);
      setEditMonthlyRent(userParams.monthly_rent ?? null);
    }
  }, [userParams]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Detect state for Grunderwerbsteuer
  const detectedState = detectStateFromLocation(location);
  const grunderwerbsteuerRate = detectedState
    ? GRUNDERWERBSTEUER_SAETZE[detectedState]
    : 5.0; // Default

  // ============================================
  // BERECHNUNGEN
  // ============================================

  // Effektive Werte (Edit hat Priorität)
  const effectivePurchasePrice = editPurchasePrice ?? purchasePrice;
  const effectiveEquityPercent = editEquityPercent ?? equityPercentage;
  const effectiveInterestRate = editInterestRate ?? interestRate;
  const effectiveAmortizationRate = editAmortizationRate ?? amortizationRate;

  // Effektive Maklergebühren und Renovierungskosten
  const effectiveBrokerCommission = editBrokerCommission ?? commissionRate;
  const effectiveRenovationCosts = editRenovationCosts ?? renovationCosts;

  // Kaufnebenkosten
  const grunderwerbsteuer = effectivePurchasePrice * (grunderwerbsteuerRate / 100);
  const notarkosten = effectivePurchasePrice * 0.015;
  const grundbuchkosten = effectivePurchasePrice * 0.005;
  const maklergebuehren = effectivePurchasePrice * (effectiveBrokerCommission / 100);
  const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren + effectiveRenovationCosts;
  const gesamtinvestition = effectivePurchasePrice + kaufnebenkosten;

  // Finanzierung
  const eigenkapital = gesamtinvestition * (effectiveEquityPercent / 100);
  const darlehensbetrag = gesamtinvestition - eigenkapital;
  const monatlicheZinsen = darlehensbetrag * (effectiveInterestRate / 100 / 12);
  const monatlicheTilgung = darlehensbetrag * (effectiveAmortizationRate / 100 / 12);
  const monatlicheRate = Math.ceil(monatlicheZinsen + monatlicheTilgung);

  // Hausgeld berechnen
  const calculateHausgeld = (): number => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm) {
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return sqm * hausgeldProQm;
    }
    return 0;
  };
  const hausgeld = Math.ceil(editMonthlyFee ?? calculateHausgeld());
  const isHausgeldEstimated = !monthlyFee && sqm !== undefined;

  // Instandhaltungskosten (1% p.a.)
  const instandhaltungskosten = Math.ceil(effectivePurchasePrice * 0.01 / 12);

  // Nicht-umlegbarer Anteil (30%)
  const NICHT_UMLEGBAR_ANTEIL = 0.30;
  const hausgeldNichtUmlegbar = Math.ceil(hausgeld * NICHT_UMLEGBAR_ANTEIL);

  // Monatliche Ausgaben
  const monatlicheAusgabenGesamt = monatlicheRate + hausgeld + instandhaltungskosten;
  const monatlicheAusgabenEffektiv = monatlicheRate + hausgeldNichtUmlegbar + instandhaltungskosten;

  // Mieteinnahmen / Marktmiete
  const calculateRent = (): number => {
    if (mode === 'eigennutzer') {
      return marketRent ?? 0;
    }
    // Investor-Modus
    if (monthlyRent && monthlyRent > 0) return monthlyRent;
    if (estimatedRentPerSqm && sqm) return estimatedRentPerSqm * sqm;
    return 0;
  };
  const mieteinnahmen = Math.ceil(editMonthlyRent ?? calculateRent());

  // Cashflow / Differenz
  const calculatedCashflow = mode === 'investor'
    ? mieteinnahmen - monatlicheAusgabenEffektiv
    : mieteinnahmen - monatlicheAusgabenGesamt;

  // Break-Even EK Berechnung
  const calculateBreakEvenEK = (): { amount: number; percentage: number } | null => {
    if (mieteinnahmen <= 0 || gesamtinvestition <= 0) return null;

    const monatlicheFixkosten = mode === 'investor'
      ? hausgeldNichtUmlegbar + instandhaltungskosten
      : hausgeld + instandhaltungskosten;

    const maxKreditrate = mieteinnahmen - monatlicheFixkosten;
    if (maxKreditrate <= 0) return null;

    const jahreszins = effectiveInterestRate + effectiveAmortizationRate;
    const maxDarlehensbetrag = maxKreditrate * 12 * 100 / jahreszins;
    const breakEvenEK = gesamtinvestition - maxDarlehensbetrag;
    const breakEvenEKRate = (breakEvenEK / gesamtinvestition) * 100;

    if (breakEvenEK < 0 || breakEvenEKRate > 100) return null;

    return { amount: Math.round(breakEvenEK), percentage: breakEvenEKRate };
  };
  const breakEvenEK = calculateBreakEvenEK();

  // Break-Even Jahre Berechnung (für Eigennutzer: wann lohnt sich Kaufen vs. Mieten)
  const calculateBreakEvenYears = (): number | null => {
    if (mieteinnahmen <= 0 || effectivePurchasePrice <= 0) return null;

    const APPRECIATION_RATE = 0.025;   // 2.5% Wertsteigerung p.a.
    const RENT_INCREASE_RATE = 0.025;  // 2.5% Mietsteigerung p.a.

    let propertyValue = effectivePurchasePrice;
    let remainingLoan = darlehensbetrag;
    let currentYearlyRent = mieteinnahmen * 12;
    let renterAccumulatedSavings = eigenkapital;

    const yearlyMortgage = monatlicheRate * 12;
    const yearlyMaintenance = instandhaltungskosten * 12;
    const yearlyHausgeld = hausgeld * 12;
    const yearlyBuyerCost = yearlyMortgage + yearlyMaintenance + yearlyHausgeld;
    const yearlyTilgung = darlehensbetrag * (effectiveAmortizationRate / 100);

    for (let year = 1; year <= 40; year++) {
      currentYearlyRent *= (1 + RENT_INCREASE_RATE);
      const yearlySavingsFromRenting = Math.max(0, yearlyBuyerCost - currentYearlyRent);
      renterAccumulatedSavings = renterAccumulatedSavings + yearlySavingsFromRenting;

      remainingLoan = Math.max(0, remainingLoan - yearlyTilgung);
      propertyValue *= (1 + APPRECIATION_RATE);

      const buyerNetWorth = propertyValue - remainingLoan;
      if (buyerNetWorth >= renterAccumulatedSavings) {
        return year;
      }
    }

    return 40; // Kein Break-Even in 40 Jahren
  };
  const breakEvenYears = calculateBreakEvenYears();

  // Reset Edit Mode
  const handleReset = () => {
    setEditPurchasePrice(null);
    setEditEquityPercent(null);
    setEditInterestRate(null);
    setEditAmortizationRate(null);
    setEditBrokerCommission(null);
    setEditRenovationCosts(null);
    setEditMonthlyFee(null);
    setEditMonthlyRent(null);
  };

  // Speichern-Handler (für investor-Modus mit Persistenz)
  const handleSave = () => {
    if (onSaveParams) {
      // Brutto-Rendite berechnen
      const calculatedGrossYield = mieteinnahmen > 0 && effectivePurchasePrice > 0
        ? (mieteinnahmen * 12 / effectivePurchasePrice) * 100
        : null;
      // Faktor berechnen
      const calculatedRentMultiplier = mieteinnahmen > 0 && effectivePurchasePrice > 0
        ? effectivePurchasePrice / (mieteinnahmen * 12)
        : null;

      onSaveParams({
        equityPercentage: editEquityPercent,
        interestRate: editInterestRate,
        amortizationRate: editAmortizationRate,
        brokerCommission: editBrokerCommission,
        renovationCosts: editRenovationCosts,
        monthlyRent: editMonthlyRent,
        monthlyFee: editMonthlyFee,
        purchasePrice: editPurchasePrice,
        calculatedGrossYield: calculatedGrossYield ?? null,
        calculatedRentMultiplier: calculatedRentMultiplier ?? null,
        calculatedMonthlyCashflow: calculatedCashflow ?? null,
      });
    }
    setIsEditMode(false);
  };

  if (purchasePrice <= 0) return null;

  return (
    <div className={`space-y-0 ${className}`}>
      {/* 1. Gesamtinvestitionskosten */}
      <div className="pt-4 pb-4 border-b border-gray-100">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsKaufnebenkostenExpanded(!isKaufnebenkostenExpanded)}
        >
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-base">Gesamtinvestitionskosten</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-blue-600">
              {formatCurrency(gesamtinvestition)}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${isKaufnebenkostenExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        {isKaufnebenkostenExpanded && (
          <div className="space-y-2 mt-3 text-sm">
            <div className="grid grid-cols-[155px_120px_1fr] items-center gap-2">
              <span className="text-gray-600">Kaufpreis</span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editPurchasePrice ?? ''}
                      onChange={(e) => setEditPurchasePrice(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(purchasePrice)}
                      className="w-36 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      step="1000"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                  </span>
                ) : null}
              </div>
              <span className="font-semibold text-gray-900 text-right">{formatCurrency(effectivePurchasePrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                + Grunderwerbsteuer ({grunderwerbsteuerRate.toFixed(1)}%)
                {detectedState && ` (${detectedState.charAt(0).toUpperCase() + detectedState.slice(1)})`}
              </span>
              <span className="font-semibold text-gray-700">{formatCurrency(grunderwerbsteuer)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">+ Notar (~1,5%)</span>
              <span className="font-semibold text-gray-700">{formatCurrency(notarkosten)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">+ Grundbuch (~0,5%)</span>
              <span className="font-semibold text-gray-700">{formatCurrency(grundbuchkosten)}</span>
            </div>
            {/* Maklergebühren */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">+ Maklergebühren</span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editBrokerCommission ?? ''}
                      onChange={(e) => setEditBrokerCommission(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(commissionRate)}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      max="10"
                      step="0.1"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                  </span>
                ) : (
                  <span className="text-gray-500">({effectiveBrokerCommission.toFixed(2)}%)</span>
                )}
              </div>
              <span className="font-semibold text-gray-700 text-right">{formatCurrency(maklergebuehren)}</span>
            </div>

            {/* Renovierungskosten (nur im investor-Modus oder wenn > 0) */}
            {(mode === 'investor' || effectiveRenovationCosts > 0 || isEditMode) && (
              <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
                <span className="text-gray-600">+ Renovierung</span>
                <div className="flex justify-center">
                  {isEditMode ? (
                    <span className="relative inline-flex items-center">
                      <input
                        type="number"
                        value={editRenovationCosts ?? ''}
                        onChange={(e) => setEditRenovationCosts(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="0"
                        className="w-28 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                        min="0"
                        step="1000"
                      />
                      <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                    </span>
                  ) : null}
                </div>
                <span className="font-semibold text-gray-700 text-right">{formatCurrency(effectiveRenovationCosts)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-bold">Gesamtinvestition</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(gesamtinvestition)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Monatliche Rate */}
      <div className="pt-4 pb-4 border-b border-gray-100">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsKapitaldienstExpanded(!isKapitaldienstExpanded)}
        >
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-red-600" />
            <h4 className="font-semibold text-gray-900 text-base">Monatliche Rate</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-red-600">
              -{formatCurrency(monatlicheRate)}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${isKapitaldienstExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        {isKapitaldienstExpanded && (
          <div className="space-y-2 mt-3 text-sm">
            {/* Eigenkapital */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">Eigenkapital</span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editEquityPercent ?? ''}
                      onChange={(e) => setEditEquityPercent(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(equityPercentage)}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                  </span>
                ) : (
                  <span className="text-gray-500">({effectiveEquityPercent.toFixed(0)}%)</span>
                )}
              </div>
              <span className="font-semibold text-gray-900 text-right">{formatCurrency(eigenkapital)}</span>
            </div>

            {/* Darlehensbetrag */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Darlehensbetrag</span>
              <span className="font-semibold text-gray-700">{formatCurrency(darlehensbetrag)}</span>
            </div>

            {/* Zinsen */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">Zinssatz</span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editInterestRate ?? ''}
                      onChange={(e) => setEditInterestRate(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(interestRate)}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      max="15"
                      step="0.1"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                  </span>
                ) : (
                  <span className="text-gray-500">({effectiveInterestRate.toFixed(2)}%)</span>
                )}
              </div>
              <span className="font-semibold text-gray-700 text-right">{formatCurrency(Math.ceil(monatlicheZinsen))}/Monat</span>
            </div>

            {/* Tilgung */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">Tilgung</span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editAmortizationRate ?? ''}
                      onChange={(e) => setEditAmortizationRate(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(amortizationRate)}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      max="10"
                      step="0.5"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                  </span>
                ) : (
                  <span className="text-gray-500">({effectiveAmortizationRate.toFixed(1)}%)</span>
                )}
              </div>
              <span className="font-semibold text-gray-700 text-right">{formatCurrency(Math.ceil(monatlicheTilgung))}/Monat</span>
            </div>

            {/* Monatliche Rate */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-bold">Monatliche Rate</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(monatlicheRate)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Monatliche Ausgaben */}
      <div className="pt-4 pb-4 border-b border-gray-100">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsAusgabenExpanded(!isAusgabenExpanded)}
        >
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-orange-600" />
            <h4 className="font-semibold text-gray-900 text-base">Monatliche Ausgaben</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-orange-600">
              -{formatCurrency(monatlicheAusgabenGesamt)}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${isAusgabenExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        {isAusgabenExpanded && (
          <div className="space-y-2 mt-3 text-sm">
            {/* Kreditrate */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Kreditrate
                <span className="text-xs text-gray-400 ml-1">
                  ({effectiveInterestRate.toFixed(1)}% + {effectiveAmortizationRate.toFixed(0)}%)
                </span>
              </span>
              <span className="font-semibold text-gray-700">{formatCurrency(monatlicheRate)}</span>
            </div>

            {/* Hausgeld */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">
                Hausgeld
                {isHausgeldEstimated && !isEditMode && <span className="text-xs text-gray-400 ml-1">(geschätzt)</span>}
              </span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editMonthlyFee ?? ''}
                      onChange={(e) => setEditMonthlyFee(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(calculateHausgeld())}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      step="10"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                  </span>
                ) : null}
              </div>
              <span className="font-semibold text-gray-700 text-right">{formatCurrency(hausgeld)}</span>
            </div>

            {/* Instandhaltung */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Instandhaltung
                <span className="text-xs text-gray-400 ml-1">(1% p.a.)</span>
              </span>
              <span className="font-semibold text-gray-700">{formatCurrency(instandhaltungskosten)}</span>
            </div>

            {/* Summe Gesamt */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-bold">Ausgaben gesamt</span>
              <span className="text-lg font-bold text-orange-600">{formatCurrency(monatlicheAusgabenGesamt)}</span>
            </div>

            {/* Davon nicht umlegbar (nur für Investor) */}
            {mode === 'investor' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  davon nicht umlegbar
                  <span className="text-xs text-gray-400 ml-1">(für Cashflow)</span>
                </span>
                <span className="font-semibold text-gray-700">{formatCurrency(monatlicheAusgabenEffektiv)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Cashflow / Miete vs. Kauf */}
      <div className="pt-4 pb-4 border-b border-gray-100">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCashflowExpanded(!isCashflowExpanded)}
        >
          <div className="flex items-center gap-2">
            {mode === 'investor' ? (
              <Wallet size={18} className="text-green-600" />
            ) : (
              <Home size={18} className="text-indigo-600" />
            )}
            <h4 className="font-semibold text-gray-900 text-base">
              {mode === 'investor' ? 'Monatlicher Cashflow' : 'Miete vs. Kauf'}
            </h4>
          </div>
          <div className="flex items-center gap-3">
            {mieteinnahmen > 0 && (
              <span className={`text-base font-semibold ${calculatedCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculatedCashflow >= 0 ? '+' : ''}{formatCurrency(calculatedCashflow)}
              </span>
            )}
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${isCashflowExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        {isCashflowExpanded && (
          <div className="space-y-2 mt-3 text-sm">
            {/* Mieteinnahmen / Marktmiete */}
            <div className="grid grid-cols-[155px_115px_1fr] items-center gap-2">
              <span className="text-gray-600">
                {mode === 'investor' ? 'Mieteinnahmen' : 'Marktmiete'}
              </span>
              <div className="flex justify-center">
                {isEditMode ? (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      value={editMonthlyRent ?? ''}
                      onChange={(e) => setEditMonthlyRent(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder={String(calculateRent())}
                      className="w-24 pl-2 pr-7 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                      min="0"
                      step="50"
                    />
                    <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                  </span>
                ) : null}
              </div>
              <span className="font-semibold text-green-600 text-right">+{formatCurrency(mieteinnahmen)}</span>
            </div>

            {/* Ausgaben */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {mode === 'investor' ? 'Ausgaben (nicht umlegbar)' : 'Ausgaben / Monat'}
              </span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(mode === 'investor' ? monatlicheAusgabenEffektiv : monatlicheAusgabenGesamt)}
              </span>
            </div>

            {/* Summe */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-bold">
                {mode === 'investor' ? 'Cashflow / Monat' : 'Differenz / Monat'}
              </span>
              <span className={`text-lg font-bold ${calculatedCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculatedCashflow >= 0 ? '+' : ''}{formatCurrency(calculatedCashflow)}
              </span>
            </div>

            {/* Hinweis für Eigennutzer */}
            {mode === 'eigennutzer' && (
              <p className="text-xs text-gray-500 mt-2">
                {calculatedCashflow >= 0
                  ? 'Kaufen ist günstiger als Mieten!'
                  : 'Mieten ist monatlich günstiger. Prüfen Sie den Break-Even.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. Break-Even EK Panel */}
      {breakEvenEK !== null && (
        <div className="pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-600" />
              <h4 className="font-semibold text-gray-900 text-base">Break-Even EK</h4>
              <span className="text-xs text-gray-400">
                ({mode === 'investor' ? 'Cashflow = 0' : 'Miete = Kauf'})
              </span>
            </div>
            <span className="text-base font-semibold text-purple-600">
              {breakEvenEK.percentage.toFixed(0)}% <span className="text-gray-500 font-normal">({formatCurrency(breakEvenEK.amount)})</span>
            </span>
          </div>
        </div>
      )}

      {/* 6. Break-Even Jahre Panel (nur Eigennutzer) */}
      {mode === 'eigennutzer' && breakEvenYears !== null && (
        <>
          <div className="pt-4 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <h4 className="font-semibold text-gray-900 text-base">Break-Even</h4>
                <span className="text-xs text-gray-400">(Kaufen vs. Mieten)</span>
              </div>
              <span className={`text-base font-semibold ${breakEvenYears <= 15 ? 'text-green-600' : breakEvenYears <= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                {breakEvenYears} Jahre
              </span>
            </div>
          </div>
          {/* Annahmen */}
          <p className="text-xs text-gray-400 text-center pt-3">
            Annahmen: 2,5% Wertsteigerung, 2,5% Mietsteigerung p.a.
          </p>
        </>
      )}

      {/* Simulation Button */}
      {canEdit && (
        <div className={`pt-4 mt-4 ${mode !== 'eigennutzer' ? 'border-t border-gray-100' : ''}`}>
          {isEditMode ? (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleReset();
                  setIsEditMode(false);
                }}
                className="py-3 px-6 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-100 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <RotateCcw size={16} />
                Abbrechen
              </button>
              <button
                onClick={onSaveParams ? handleSave : () => setIsEditMode(false)}
                disabled={isSavingParams}
                className="py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
            <div className="flex justify-center pt-2">
              <button
                onClick={() => {
                  // Alle Bereiche aufklappen
                  setIsKaufnebenkostenExpanded(true);
                  setIsKapitaldienstExpanded(true);
                  setIsAusgabenExpanded(true);
                  setIsCashflowExpanded(true);
                  // Edit-States mit aktuellen Werten initialisieren
                  setEditPurchasePrice(effectivePurchasePrice);
                  setEditEquityPercent(effectiveEquityPercent);
                  setEditInterestRate(effectiveInterestRate);
                  setEditAmortizationRate(effectiveAmortizationRate);
                  setEditBrokerCommission(effectiveBrokerCommission);
                  setEditRenovationCosts(effectiveRenovationCosts);
                  setEditMonthlyFee(hausgeld);
                  setEditMonthlyRent(mieteinnahmen);
                  setIsEditMode(true);
                }}
                className="py-3 px-6 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:from-[#E31C5F] hover:to-[#C81E4E] text-white rounded-full transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-[#FF385C]/30 hover:shadow-xl hover:shadow-[#FF385C]/40 hover:-translate-y-0.5"
              >
                <Pencil size={16} />
                Simulation starten
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
