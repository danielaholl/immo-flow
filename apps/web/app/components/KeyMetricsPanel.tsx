'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Wallet, ChevronDown, Sparkles, Receipt, Landmark, Pencil, RotateCcw, Check } from 'lucide-react';

// Grunderwerbsteuer nach Bundesland (Stand 2024)
const GRUNDERWERBSTEUER_BY_STATE: Record<string, number> = {
  'bayern': 3.5,
  'sachsen': 3.5,
  'hamburg': 5.5,
  'baden-württemberg': 5.0,
  'niedersachsen': 5.0,
  'rheinland-pfalz': 5.0,
  'sachsen-anhalt': 5.0,
  'berlin': 6.0,
  'hessen': 6.0,
  'mecklenburg-vorpommern': 6.0,
  'bremen': 5.0,
  'brandenburg': 6.5,
  'nordrhein-westfalen': 6.5,
  'saarland': 6.5,
  'schleswig-holstein': 6.5,
  'thüringen': 5.0,
};

// Stadt/Region zu Bundesland Mapping (häufige Städte)
const CITY_TO_STATE: Record<string, string> = {
  'münchen': 'bayern',
  'nürnberg': 'bayern',
  'augsburg': 'bayern',
  'regensburg': 'bayern',
  'berlin': 'berlin',
  'hamburg': 'hamburg',
  'bremen': 'bremen',
  'frankfurt': 'hessen',
  'wiesbaden': 'hessen',
  'darmstadt': 'hessen',
  'köln': 'nordrhein-westfalen',
  'düsseldorf': 'nordrhein-westfalen',
  'dortmund': 'nordrhein-westfalen',
  'essen': 'nordrhein-westfalen',
  'duisburg': 'nordrhein-westfalen',
  'bochum': 'nordrhein-westfalen',
  'stuttgart': 'baden-württemberg',
  'karlsruhe': 'baden-württemberg',
  'mannheim': 'baden-württemberg',
  'freiburg': 'baden-württemberg',
  'heidelberg': 'baden-württemberg',
  'hannover': 'niedersachsen',
  'braunschweig': 'niedersachsen',
  'oldenburg': 'niedersachsen',
  'dresden': 'sachsen',
  'leipzig': 'sachsen',
  'chemnitz': 'sachsen',
  'mainz': 'rheinland-pfalz',
  'koblenz': 'rheinland-pfalz',
  'potsdam': 'brandenburg',
  'magdeburg': 'sachsen-anhalt',
  'halle': 'sachsen-anhalt',
  'erfurt': 'thüringen',
  'jena': 'thüringen',
  'kiel': 'schleswig-holstein',
  'lübeck': 'schleswig-holstein',
  'rostock': 'mecklenburg-vorpommern',
  'schwerin': 'mecklenburg-vorpommern',
  'saarbrücken': 'saarland',
};

// Funktion: Bundesland aus Location ermitteln
const getStateFromLocation = (location?: string): string | null => {
  if (!location) return null;
  const locationLower = location.toLowerCase();

  // Direkt nach Bundesland suchen
  for (const state of Object.keys(GRUNDERWERBSTEUER_BY_STATE)) {
    if (locationLower.includes(state)) {
      return state;
    }
  }

  // Nach Stadt suchen
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (locationLower.includes(city)) {
      return state;
    }
  }

  return null;
};

export interface KeyMetricsPanelProps {
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
  estimatedMaintenanceCosts?: number; // Instandhaltungskosten (entfernt - im Hausgeld enthalten)
  loanPayment?: number;             // Fallback: Kreditrate (wird durch monatlicheRate ersetzt)
  loanDetails?: string;             // z.B. "(3.5% Zins, 2% Tilgung)"

  // Callbacks
  onTriggerEvaluation?: () => void;
  isLoading?: boolean;

  // User Property Parameters (für Edit-Modus)
  propertyId?: string;
  userParams?: {
    equity_percentage?: number | null;
    interest_rate?: number | null;
    amortization_rate?: number | null;
    broker_commission?: number | null;
    monthly_rent?: number | null;
    monthly_fee?: number | null;
    purchase_price?: number | null;
  } | null;
  onSaveParams?: (params: {
    equityPercentage?: number | null;
    interestRate?: number | null;
    amortizationRate?: number | null;
    brokerCommission?: number | null;
    monthlyRent?: number | null;
    monthlyFee?: number | null;
    purchasePrice?: number | null;
    // Berechnete Kennzahlen
    calculatedGrossYield?: number | null;
    calculatedRentMultiplier?: number | null;
    calculatedMonthlyCashflow?: number | null;
  }) => void;
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

// Utility: Cashflow-Werte aufgerundet formatieren (ohne Nachkommastellen)
const formatCashflowValue = (amount: number): string => {
  const rounded = Math.ceil(Math.abs(amount));
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
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

// Utility: Breakeven berechnen (in Jahren)
const calculateBreakeven = (purchasePrice?: number, monthlyCashflow?: number): number | null => {
  if (!purchasePrice || !monthlyCashflow || monthlyCashflow <= 0) return null;
  const annualCashflow = monthlyCashflow * 12;
  return purchasePrice / annualCashflow;
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
  estimatedOperatingCosts,
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
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit-States - null bedeutet "nutze Default-Wert"
  const [editEquityPercent, setEditEquityPercent] = useState<number | null>(null);
  const [editInterestRate, setEditInterestRate] = useState<number | null>(null);
  const [editAmortizationRate, setEditAmortizationRate] = useState<number | null>(null);
  const [editBrokerCommission, setEditBrokerCommission] = useState<number | null>(null);
  const [editMonthlyRent, setEditMonthlyRent] = useState<number | null>(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState<number | null>(null);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number | null>(null);

  // Initialisiere Edit-States aus userParams wenn vorhanden
  useEffect(() => {
    if (userParams) {
      setEditEquityPercent(userParams.equity_percentage ?? null);
      setEditInterestRate(userParams.interest_rate ?? null);
      setEditAmortizationRate(userParams.amortization_rate ?? null);
      setEditBrokerCommission(userParams.broker_commission ?? null);
      setEditMonthlyRent(userParams.monthly_rent ?? null);
      setEditMonthlyFee(userParams.monthly_fee ?? null);
      setEditPurchasePrice(userParams.purchase_price ?? null);
    }
  }, [userParams]);

  // Zeige Edit-Button nur wenn propertyId und onSaveParams vorhanden
  const canEdit = !!propertyId && !!onSaveParams;

  // Reset alle Edit-States auf Originalwerte
  const handleReset = () => {
    setEditEquityPercent(null);
    setEditInterestRate(null);
    setEditAmortizationRate(null);
    setEditBrokerCommission(null);
    setEditMonthlyRent(null);
    setEditMonthlyFee(null);
    setEditPurchasePrice(null);
  };

  // Speichern-Handler
  // Hinweis: Die berechneten Werte werden im handleSave berechnet und müssen
  // nach den Edit-State Variablen und Berechnungs-Funktionen definiert werden.
  // Die eigentliche Implementierung erfolgt weiter unten nach den Berechnungen.

  // Check if we have external data (vor Cashflow-Berechnung)
  const hasExternalData = grossYield !== undefined || rentMultiplier !== undefined || externalCashflow !== undefined;

  // Kaufnebenkosten berechnen
  const detectedState = getStateFromLocation(location);
  const grunderwerbsteuerRate = detectedState
    ? GRUNDERWERBSTEUER_BY_STATE[detectedState]
    : 6.0; // Default: 6.0%
  const notarkostenRate = 1.5;
  const grundbuchRate = 0.5;
  // Edit-State hat Priorität über Prop (Number() um sicherzustellen dass es eine Zahl ist)
  const maklerRate = Number(editBrokerCommission ?? commissionRate ?? 0);
  // Effektiver Kaufpreis: Edit-State hat Priorität über Property-Kaufpreis
  const effectivePurchasePrice = Number(editPurchasePrice ?? purchasePrice ?? 0);

  const grunderwerbsteuer = effectivePurchasePrice ? effectivePurchasePrice * (grunderwerbsteuerRate / 100) : 0;
  const notarkosten = effectivePurchasePrice ? effectivePurchasePrice * (notarkostenRate / 100) : 0;
  const grundbuchkosten = effectivePurchasePrice ? effectivePurchasePrice * (grundbuchRate / 100) : 0;
  const maklergebuehren = effectivePurchasePrice ? effectivePurchasePrice * (maklerRate / 100) : 0;
  const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren;
  const gesamtinvestition = effectivePurchasePrice + kaufnebenkosten;

  // Kapitaldienst berechnen
  const hasFinancingData = financingTerms?.interestRate !== undefined ||
    financingTerms?.amortizationRate !== undefined ||
    financingTerms?.loanToValue !== undefined;

  // Eigenkapital-Quote (Default: 20% EK = 80% LTV)
  // Edit-State hat Priorität über Props (Number() um sicherzustellen dass es eine Zahl ist)
  const defaultEKRate = financingTerms?.loanToValue
    ? (100 - Number(financingTerms.loanToValue))
    : 20;
  const eigenkapitalRate = Number(editEquityPercent ?? defaultEKRate);
  const eigenkapital = gesamtinvestition * (eigenkapitalRate / 100);
  const darlehensbetrag = gesamtinvestition - eigenkapital;

  // Zinsen und Tilgung (Defaults: aktuelle Marktkonditionen)
  // Edit-State hat Priorität über Props (Number() um sicherzustellen dass es eine Zahl ist)
  const zinssatz = Number(editInterestRate ?? financingTerms?.interestRate ?? 3.8);
  const tilgung = Number(editAmortizationRate ?? financingTerms?.amortizationRate ?? 2.0);

  // Monatliche Rate berechnen (aufgerundet für konsistente Anzeige)
  const monatlicheZinsen = darlehensbetrag * (zinssatz / 100 / 12);
  const monatlicheTilgung = darlehensbetrag * (tilgung / 100 / 12);
  const monatlicheRate = Math.ceil(monatlicheZinsen + monatlicheTilgung);

  // ============================================
  // CASHFLOW-BERECHNUNG
  // ============================================

  // 1. Mieteinnahmen berechnen
  // Edit-State hat Priorität, dann: estimatedRentPerSqm * sqm > estimatedRent
  const calculatedRent = estimatedRentPerSqm && sqm
    ? Number(estimatedRentPerSqm) * Number(sqm)
    : estimatedRent;
  const mieteinnahmen = Number(editMonthlyRent ?? calculatedRent ?? 0);
  const hasRentFromAI = !!(estimatedRentPerSqm && sqm);
  const hasEditedRent = editMonthlyRent !== null;

  // 2. Hausgeld berechnen
  // Edit-State hat Priorität, dann: monthlyFee (aus Property) > estimatedOperatingCosts > Formel-Berechnung
  // Formel: Altbau (vor 1980): ~3.50€/qm, Neubau: ~2.50€/qm
  const calculateHausgeld = (): number => {
    if (monthlyFee && Number(monthlyFee) > 0) return Number(monthlyFee);
    if (estimatedOperatingCosts && Number(estimatedOperatingCosts) > 0) return Number(estimatedOperatingCosts);
    if (sqm) {
      // Hausgeld-Schätzung basierend auf Baujahr
      const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
      return Number(sqm) * hausgeldProQm;
    }
    return 0;
  };
  const hausgeld = Number(editMonthlyFee ?? calculateHausgeld());
  const hasHausgeldFromProperty = !!(monthlyFee && Number(monthlyFee) > 0);
  const hasEditedHausgeld = editMonthlyFee !== null;

  // 3. Kreditrate = monatlicheRate aus Kapitaldienst
  const kreditrate = monatlicheRate;

  // 4. Monatlicher Cashflow berechnen
  const calculatedCashflow = mieteinnahmen - hausgeld - kreditrate;

  // Finaler Cashflow-Wert (extern übergeben oder berechnet)
  const monthlyCashflow = externalCashflow ?? (mieteinnahmen > 0 ? calculatedCashflow : undefined);

  // ============================================
  // BREAK-EVEN EIGENKAPITAL BERECHNUNG
  // ============================================
  // Berechnet das nötige EK für Cashflow = 0 bei Marktmiete
  // Formel: Kreditrate = Mieteinnahmen - Hausgeld
  //         Darlehensbetrag = Kreditrate * 12 * 100 / (Zinssatz + Tilgung)
  //         Break-Even EK = Gesamtinvestition - Darlehensbetrag

  const calculateBreakEvenEK = (): { amount: number; percentage: number } | null => {
    if (mieteinnahmen <= 0 || gesamtinvestition <= 0) return null;

    // Maximale Kreditrate für Cashflow = 0
    const maxKreditrate = mieteinnahmen - hausgeld;

    // Wenn maxKreditrate <= 0, dann reicht die Miete nicht mal für Hausgeld
    if (maxKreditrate <= 0) return null;

    // Berechne den maximalen Darlehensbetrag
    const jahreszins = zinssatz + tilgung; // Gesamtbelastung p.a. in %
    const maxDarlehensbetrag = maxKreditrate * 12 * 100 / jahreszins;

    // Berechne das nötige Eigenkapital
    const breakEvenEK = gesamtinvestition - maxDarlehensbetrag;
    const breakEvenEKRate = (breakEvenEK / gesamtinvestition) * 100;

    // Wenn EK negativ oder über 100%, dann nicht sinnvoll
    if (breakEvenEK < 0 || breakEvenEKRate > 100) return null;

    return {
      amount: Math.ceil(breakEvenEK),
      percentage: breakEvenEKRate,
    };
  };

  const breakEvenEK = calculateBreakEvenEK();

  // ============================================
  // RENDITE-BERECHNUNG (lokal)
  // ============================================
  // Brutto-Rendite = (Jahresmiete / Kaufpreis) * 100
  // Wird lokal neu berechnet wenn User Parameter ändert

  const calculateLocalGrossYield = (): number | undefined => {
    if (mieteinnahmen <= 0 || effectivePurchasePrice <= 0) return undefined;
    const jahresmiete = mieteinnahmen * 12;
    return (jahresmiete / effectivePurchasePrice) * 100;
  };

  // Lokale Rendite berechnen wenn User-Werte vorhanden, sonst Prop verwenden
  const hasUserEditedRentOrPrice = editMonthlyRent !== null || editPurchasePrice !== null;
  const localGrossYield = calculateLocalGrossYield();
  const effectiveGrossYield = hasUserEditedRentOrPrice && localGrossYield !== undefined
    ? localGrossYield
    : grossYield;

  // ============================================
  // FAKTOR-BERECHNUNG (lokal)
  // ============================================
  // Faktor = Kaufpreis / Jahresmiete
  // Wird lokal neu berechnet wenn User Parameter ändert

  const calculateLocalRentMultiplier = (): number | undefined => {
    if (mieteinnahmen <= 0 || effectivePurchasePrice <= 0) return undefined;
    const jahresmiete = mieteinnahmen * 12;
    return effectivePurchasePrice / jahresmiete;
  };

  const localRentMultiplier = calculateLocalRentMultiplier();
  const effectiveRentMultiplier = hasUserEditedRentOrPrice && localRentMultiplier !== undefined
    ? localRentMultiplier
    : rentMultiplier;

  // Finale Prüfung: Haben wir Daten zum Anzeigen?
  const hasData = hasExternalData || monthlyCashflow !== undefined;

  // Calculate breakeven (Jahre bis Amortisation - legacy)
  const breakeven = calculateBreakeven(purchasePrice, monthlyCashflow);

  // Speichern-Handler (nach allen Berechnungen definiert)
  const handleSave = () => {
    if (onSaveParams) {
      onSaveParams({
        equityPercentage: editEquityPercent,
        interestRate: editInterestRate,
        amortizationRate: editAmortizationRate,
        brokerCommission: editBrokerCommission,
        monthlyRent: editMonthlyRent,
        monthlyFee: editMonthlyFee,
        purchasePrice: editPurchasePrice,
        // Berechnete Kennzahlen mitspeichern
        calculatedGrossYield: localGrossYield ?? null,
        calculatedRentMultiplier: localRentMultiplier ?? null,
        calculatedMonthlyCashflow: calculatedCashflow ?? null,
      });
    }
    setIsEditMode(false);
  };

  // No data state - show CTA to trigger AI evaluation
  if (!hasData && !isLoading) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 rounded-2xl border p-4 sm:p-6 ${className}`}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Sparkles size={20} className="flex-shrink-0 text-blue-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                Kennzahlen auf einen Blick
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

  // Loading state
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

  // Results view - collapsible accordion
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
            <TrendingUp size={18} className="flex-shrink-0 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              Kennzahlen auf einen Blick
            </h3>
          </div>
          <ChevronDown
            size={20}
            className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Key Metrics Cards - always shown */}
        <div className="grid gap-2 sm:gap-3 grid-cols-3">
          {/* Rendite */}
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <span className="text-xs text-gray-500">Rendite</span>
            <div className={`text-lg font-bold ${effectiveGrossYield !== undefined ? getYieldColor(Number(effectiveGrossYield)) : 'text-gray-400'}`}>
              {effectiveGrossYield !== undefined ? `${Number(effectiveGrossYield).toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Faktor */}
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <span className="text-xs text-gray-500">Faktor</span>
            <div className="text-lg font-bold text-gray-900">
              {effectiveRentMultiplier !== undefined ? `${Number(effectiveRentMultiplier).toFixed(1)}x` : '—'}
            </div>
          </div>

          {/* Cashflow */}
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <span className="text-xs text-gray-500">Cashflow</span>
            <div className={`text-lg font-bold ${monthlyCashflow !== undefined ? getCashflowColor(Number(monthlyCashflow)) : 'text-gray-400'}`}>
              {monthlyCashflow !== undefined
                ? `${Number(monthlyCashflow) >= 0 ? '+' : ''}${Number(monthlyCashflow).toLocaleString('de-DE')}€`
                : '—'}
            </div>
          </div>

        </div>
      </div>

      {/* Expanded Content - Kaufnebenkosten & Cashflow-Übersicht */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
          {/* 1. Kaufnebenkosten-Übersicht */}
          {(effectivePurchasePrice > 0 || isEditMode) && (
            <div className="pt-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Receipt size={16} className="text-blue-600" />
                <h4 className="font-semibold text-gray-900">Kaufnebenkosten</h4>
              </div>
              <div className="space-y-2">
                {/* Kaufpreis */}
                <div className="grid grid-cols-[140px_120px_1fr] items-center gap-2">
                  <span className="text-gray-600">Kaufpreis</span>
                  <div className="flex justify-center">
                    {isEditMode ? (
                      <span className="relative inline-flex items-center">
                        <input
                          type="number"
                          value={editPurchasePrice ?? ''}
                          onChange={(e) => setEditPurchasePrice(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(purchasePrice ?? 0)}
                          className="w-28 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                          min="0"
                          step="1000"
                        />
                        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                      </span>
                    ) : null}
                  </div>
                  <span className="text-base font-semibold text-gray-900 text-right">
                    {formatCurrency(effectivePurchasePrice)}
                  </span>
                </div>

                {/* Grunderwerbsteuer */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    + Grunderwerbsteuer ({grunderwerbsteuerRate.toFixed(1)}%){detectedState ? ` (${detectedState.charAt(0).toUpperCase() + detectedState.slice(1)})` : ''}
                  </span>
                  <span className="text-base font-semibold text-gray-700">
                    {formatCurrency(grunderwerbsteuer)}
                  </span>
                </div>

                {/* Notarkosten */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">+ Notarkosten (~{notarkostenRate}%)</span>
                  <span className="text-base font-semibold text-gray-700">
                    {formatCurrency(notarkosten)}
                  </span>
                </div>

                {/* Grundbuchkosten */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">+ Grundbuch (~{grundbuchRate}%)</span>
                  <span className="text-base font-semibold text-gray-700">
                    {formatCurrency(grundbuchkosten)}
                  </span>
                </div>

                {/* Maklergebühren */}
                <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                  <span className="text-gray-600">+ Maklergebühren</span>
                  <div className="flex justify-center">
                    {isEditMode ? (
                      <span className="relative inline-flex items-center">
                        <input
                          type="number"
                          value={editBrokerCommission ?? ''}
                          onChange={(e) => setEditBrokerCommission(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(commissionRate ?? 0)}
                          className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                          min="0"
                          max="10"
                          step="0.1"
                        />
                        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">({maklerRate.toFixed(2)}%)</span>
                    )}
                  </div>
                  <span className="text-base font-semibold text-gray-700 text-right">
                    {formatCurrency(maklergebuehren)}
                  </span>
                </div>

                {/* Gesamtinvestition */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-bold">Gesamtinvestition</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(gesamtinvestition)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Kapitaldienst */}
          {effectivePurchasePrice > 0 && (
            <div className="pt-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={16} className="text-purple-600" />
                <h4 className="font-semibold text-gray-900">Kapitaldienst</h4>
                {!hasFinancingData && (
                  <span className="text-xs text-gray-400 ml-auto">(Standardwerte)</span>
                )}
              </div>
              <div className="space-y-2">
                {/* Eigenkapital */}
                <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                  <span className="text-gray-600">Eigenkapital</span>
                  <div className="flex justify-center">
                    {isEditMode ? (
                      <span className="relative inline-flex items-center">
                        <input
                          type="number"
                          value={editEquityPercent ?? ''}
                          onChange={(e) => setEditEquityPercent(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(defaultEKRate)}
                          className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                          min="0"
                          max="100"
                          step="1"
                        />
                        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">({eigenkapitalRate.toFixed(0)}%)</span>
                    )}
                  </div>
                  <span className="text-base font-semibold text-gray-900 text-right">
                    {formatCurrency(eigenkapital)}
                  </span>
                </div>

                {/* Darlehensbetrag */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Darlehensbetrag</span>
                  <span className="text-base font-semibold text-gray-700">
                    {formatCurrency(darlehensbetrag)}
                  </span>
                </div>

                {/* Zinssatz mit monatlichem Betrag */}
                <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                  <span className="text-gray-600">Zinssatz</span>
                  <div className="flex justify-center">
                    {isEditMode ? (
                      <span className="relative inline-flex items-center">
                        <input
                          type="number"
                          value={editInterestRate ?? ''}
                          onChange={(e) => setEditInterestRate(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(financingTerms?.interestRate ?? 3.8)}
                          className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                          min="0"
                          max="15"
                          step="0.1"
                        />
                        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">({zinssatz.toFixed(2)}%)</span>
                    )}
                  </div>
                  <span className="text-gray-600 text-right">{formatCurrency(Math.ceil(monatlicheZinsen))}/Monat</span>
                </div>

                {/* Tilgung mit monatlichem Betrag */}
                <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                  <span className="text-gray-600">Tilgung</span>
                  <div className="flex justify-center">
                    {isEditMode ? (
                      <span className="relative inline-flex items-center">
                        <input
                          type="number"
                          value={editAmortizationRate ?? ''}
                          onChange={(e) => setEditAmortizationRate(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(financingTerms?.amortizationRate ?? 2.0)}
                          className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                          min="0"
                          max="10"
                          step="0.5"
                        />
                        <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">({tilgung.toFixed(1)}%)</span>
                    )}
                  </div>
                  <span className="text-gray-600 text-right">{formatCurrency(Math.ceil(monatlicheTilgung))}/Monat</span>
                </div>

                {/* Monatliche Rate */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-bold">Monatliche Rate</span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatCurrency(monatlicheRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Cashflow-Übersicht */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} className="text-green-600" />
              <h4 className="font-semibold text-gray-900">Monatlicher Cashflow</h4>
            </div>

            {/* Mieteinnahmen */}
            {(mieteinnahmen > 0 || isEditMode) && (
              <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                <span className="text-gray-600">Mieteinnahmen</span>
                <div className="flex justify-center">
                  {isEditMode ? (
                    <span className="relative inline-flex items-center">
                      <input
                        type="number"
                        value={editMonthlyRent ?? ''}
                        onChange={(e) => setEditMonthlyRent(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder={String(calculatedRent ?? 0)}
                        className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                        min="0"
                        step="50"
                      />
                      <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                    </span>
                  ) : hasRentFromAI && estimatedRentPerSqm ? (
                    <span className="text-xs text-gray-400">
                      ({Number(estimatedRentPerSqm).toFixed(2)}€/m²)
                    </span>
                  ) : null}
                </div>
                <span className="text-base font-semibold text-green-600 text-right">
                  +{formatCashflowValue(mieteinnahmen)}
                </span>
              </div>
            )}

            {/* Hausgeld */}
            {(hausgeld > 0 || isEditMode) && (
              <div className="grid grid-cols-[140px_100px_1fr] items-center gap-2">
                <span className="text-gray-600">Hausgeld</span>
                <div className="flex justify-center">
                  {isEditMode ? (
                    <span className="relative inline-flex items-center">
                      <input
                        type="number"
                        value={editMonthlyFee ?? ''}
                        onChange={(e) => setEditMonthlyFee(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder={String(calculateHausgeld())}
                        className="w-24 pl-2 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg text-sm focus:ring-1 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none"
                        min="0"
                        step="10"
                      />
                      <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">€</span>
                    </span>
                  ) : !hasHausgeldFromProperty && sqm ? (
                    <span className="text-xs text-gray-400">(geschätzt)</span>
                  ) : null}
                </div>
                <span className="text-base font-semibold text-red-600 text-right">
                  -{formatCashflowValue(hausgeld)}
                </span>
              </div>
            )}

            {/* Kreditrate */}
            {kreditrate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Kreditrate
                  <span className="text-xs text-gray-400 ml-1">
                    ({zinssatz.toFixed(1)}% Zins, {tilgung.toFixed(0)}% Tilgung)
                  </span>
                </span>
                <span className="text-base font-semibold text-red-600">
                  -{formatCashflowValue(kreditrate)}
                </span>
              </div>
            )}

            {/* Summe: Monatlicher Cashflow */}
            {monthlyCashflow !== undefined && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-900 font-bold">Cashflow / Monat</span>
                <span className={`text-lg font-bold ${monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyCashflow >= 0 ? '+' : '-'}{formatCashflowValue(monthlyCashflow)}
                </span>
              </div>
            )}

            {/* Break-Even EK */}
            {breakEvenEK !== null && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-600">
                  Break-Even EK
                  <span className="text-xs text-gray-400 ml-1">(Cashflow = 0)</span>
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {breakEvenEK.percentage.toFixed(0)}% <span className="text-gray-500 font-normal">({formatCurrency(breakEvenEK.amount)})</span>
                </span>
              </div>
            )}

            {/* Fallback wenn keine Daten */}
            {mieteinnahmen === 0 && hausgeld === 0 && kreditrate === 0 && monthlyCashflow === undefined && (
              <div className="text-center text-gray-500 py-4">
                <Wallet size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Keine Cashflow-Daten verfügbar</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Buttons am unteren Rand - nur wenn aufgeklappt */}
      {isExpanded && canEdit && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {isEditMode ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleReset();
                  setIsEditMode(false);
                }}
                className="flex-1 py-2.5 border border-[#DDDDDD] text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <RotateCcw size={16} />
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSavingParams}
                className="flex-1 py-2.5 bg-[#FF385C] text-white rounded-xl hover:bg-[#E31C5F] transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                {isSavingParams ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Speichern
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                // Initialisiere Edit-Werte mit aktuellen berechneten Werten
                setEditEquityPercent(eigenkapitalRate);
                setEditInterestRate(zinssatz);
                setEditAmortizationRate(tilgung);
                setEditBrokerCommission(maklerRate);
                setEditMonthlyRent(mieteinnahmen);
                setEditMonthlyFee(hausgeld);
                setEditPurchasePrice(effectivePurchasePrice);
                setIsEditMode(true);
              }}
              className="w-full py-2.5 text-[#FF385C] hover:text-[#E31C5F] hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Pencil size={16} />
              Annahmen bearbeiten
            </button>
          )}
        </div>
      )}
    </div>
  );
}
