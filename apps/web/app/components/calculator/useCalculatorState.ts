'use client';

import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { trpc } from '@/app/providers/TRPCProvider';
import {
  CalculatorProps,
  EditState,
  CalculatedValues,
  CalculatorContextValue,
  CardId,
} from './types';
import {
  GRUNDERWERBSTEUER_SAETZE,
  detectStateFromLocation,
  formatCurrency,
  getAfaRate,
  getBuildingRatio,
  extractPLZFromLocation,
} from '@/app/property/[id]/utils/calculator-utils';

// Fallback constant (will be replaced by DB value when available)
const DEFAULT_NICHT_UMLEGBAR_ANTEIL = 0.30;
const DEFAULT_MAINTENANCE_PER_SQM = 10; // EUR/m²/Jahr
const DEFAULT_HAUSGELD_MODERN = 2.50;
const DEFAULT_HAUSGELD_OLD = 3.50;

// Context for sharing calculator state across cards
export const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculatorContext() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculatorContext must be used within a CalculatorProvider');
  }
  return context;
}

// Helper function to calculate default Hausgeld value
function calculateDefaultHausgeld(
  monthlyFee: number | null | undefined,
  sqm: number | null | undefined,
  yearBuilt: number | null | undefined,
  calculatorDefaults: any
): number {
  if (monthlyFee && monthlyFee > 0) return monthlyFee;
  if (sqm) {
    const hausgeldModern = calculatorDefaults?.hausgeldPerSqmModern ?? DEFAULT_HAUSGELD_MODERN;
    const hausgeldOld = calculatorDefaults?.hausgeldPerSqmOld ?? DEFAULT_HAUSGELD_OLD;
    const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? hausgeldModern : hausgeldOld;
    return sqm * hausgeldProQm;
  }
  return 0;
}

// Helper function to calculate all default EditState values
function calculateDefaultEditState(
  props: CalculatorProps,
  userParams: any,
  currentMarketRate: { interestRate: number } | undefined,
  plzMarketRent: number | null,
  calculatorDefaults: any
): EditState {
  const {
    purchasePrice,
    equityPercentage,
    interestRate = 4.25,
    amortizationRate,
    commissionRate = 0,
    renovationCosts = 0,
    monthlyFee,
    monthlyRent,
    estimatedRentPerSqm,
    sqm,
    yearBuilt,
    mode,
    marketRent,
  } = props;

  // Calculate monthly rent with priority chain
  const defaultMonthlyRent =
    userParams?.monthly_rent ??
    (mode === 'eigennutzer'
      ? (marketRent ?? plzMarketRent ?? null)
      : (
        plzMarketRent ??
        (estimatedRentPerSqm && sqm ? estimatedRentPerSqm * sqm : null) ??
        monthlyRent ??
        (sqm ? sqm * 10 : null)
      )
    );

  // Calculate default Hausgeld
  const defaultHausgeld = calculateDefaultHausgeld(
    userParams?.monthly_fee ?? monthlyFee,
    sqm,
    yearBuilt,
    calculatorDefaults
  );

  return {
    purchasePrice: userParams?.purchase_price ?? purchasePrice ?? null,
    equityPercent: userParams?.equity_percentage ?? equityPercentage ?? 20,
    eigenkapitalBetrag: null, // Will be calculated from equityPercent
    darlehensbetrag: null, // Will be calculated from equityPercent
    interestRate: userParams?.interest_rate ?? currentMarketRate?.interestRate ?? interestRate ?? 4.25,
    amortizationRate: userParams?.amortization_rate ?? amortizationRate ?? 2.0,
    brokerCommission: userParams?.broker_commission ?? commissionRate ?? 0,
    renovationCosts: userParams?.renovation_costs ?? renovationCosts ?? 0,
    monthlyFee: userParams?.monthly_fee ?? (defaultHausgeld > 0 ? defaultHausgeld : monthlyFee) ?? null,
    monthlyRent: defaultMonthlyRent,
    maintenanceCosts: null, // Will be calculated from sqm
    afaRate: null, // Will be calculated from yearBuilt
    grenzsteuersatz: null, // Will be calculated from tax profile
  };
}

export function useCalculatorState(props: CalculatorProps): CalculatorContextValue {
  const {
    purchasePrice,
    location,
    commissionRate = 0,
    equityPercentage,
    interestRate = 4.25,
    amortizationRate,
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
    onPurchasePriceChange,
    startInEditMode = false,
    onEditStateChange,
    initialEditState,
  } = props;

  // Tax profile for marginal tax rate
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Calculator defaults from database (global + user overrides)
  const { data: calculatorDefaults } = trpc.calculatorDefaults.getDefaults.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minute cache
    refetchOnWindowFocus: false,
  });

  // Edit mode state - must be declared BEFORE effectiveEquityPercent useMemo
  const [isEditMode, setIsEditMode] = useState(startInEditMode);
  const [editState, setEditState] = useState<EditState>({
    purchasePrice: initialEditState?.purchasePrice ?? null,
    equityPercent: initialEditState?.equityPercent ?? null,
    eigenkapitalBetrag: initialEditState?.eigenkapitalBetrag ?? null,
    darlehensbetrag: initialEditState?.darlehensbetrag ?? null,
    interestRate: initialEditState?.interestRate ?? null,
    amortizationRate: initialEditState?.amortizationRate ?? null,
    brokerCommission: initialEditState?.brokerCommission ?? null,
    renovationCosts: initialEditState?.renovationCosts ?? null,
    monthlyFee: initialEditState?.monthlyFee ?? null,
    monthlyRent: initialEditState?.monthlyRent ?? null,
    maintenanceCosts: initialEditState?.maintenanceCosts ?? null,
    afaRate: initialEditState?.afaRate ?? null,
    grenzsteuersatz: initialEditState?.grenzsteuersatz ?? null,
  });

  // Berechne effectiveEquityPercent früh, damit es in der Interest Rate Query verwendet werden kann
  const effectiveEquityPercent = useMemo(() => {
    return Number(
      editState.equityPercent ??
      userParams?.equity_percentage ??
      equityPercentage ??
      10
    ) || 10;
  }, [editState.equityPercent, userParams?.equity_percentage, equityPercentage]);

  // Current market interest rate from weekly Zinsupdate
  const { data: currentMarketRate } = trpc.interestRates.getRateForProperty.useQuery(
    {
      purchasePrice: purchasePrice || 250000,
      equityPercentage: effectiveEquityPercent,
      fixedRateYears: 10,
    },
    {
      enabled: purchasePrice > 0,
      staleTime: 1000 * 60 * 60, // 1 hour cache
      refetchOnWindowFocus: false,
    }
  );

  // PLZ-based market data for rent estimation
  const extractedPLZ = extractPLZFromLocation(location);
  const { data: plzMarketData, isLoading: isLoadingMarketData } = trpc.marketData.getByPLZ.useQuery(
    { plz: extractedPLZ! },
    {
      enabled: !!extractedPLZ && extractedPLZ.length === 5,
      staleTime: 1000 * 60 * 30, // 30 minute cache
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on 404 (PLZ not found)
    }
  );

  // Fallback: Search by city name if no PLZ found
  const { data: cityMarketData } = trpc.marketData.searchByCity.useQuery(
    { city: location || '', limit: 1 },
    {
      enabled: !extractedPLZ && !!location && location.length >= 3,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  // Use PLZ data if available, otherwise use city search result
  const marketData = plzMarketData || (cityMarketData && cityMarketData[0]) || null;

  // Calculate PLZ-based market rent
  const plzMarketRent = useMemo(() => {
    if (!plzMarketData?.avg_rent_sqm || !sqm) return null;
    return Math.ceil(Number(plzMarketData.avg_rent_sqm) * Number(sqm));
  }, [plzMarketData, sqm]);

  // Notify parent when editState changes
  useEffect(() => {
    if (onEditStateChange) {
      onEditStateChange(editState);
    }
  }, [editState, onEditStateChange]);

  // Sync monthlyRent/marketRent prop to editState when prop changes (for manual mode)
  // This allows the mini property card's monthlyRent input to update the calculation
  // For investor mode: use monthlyRent prop
  // For eigennutzer mode: use marketRent prop
  useEffect(() => {
    const rentValue = mode === 'eigennutzer' ? marketRent : monthlyRent;
    if (rentValue !== undefined && rentValue > 0) {
      setEditState(prev => ({ ...prev, monthlyRent: rentValue }));
    }
  }, [monthlyRent, marketRent, mode]);

  // Collapsible cards state - default: all collapsed
  const [expandedCards, setExpandedCards] = useState<Record<CardId, boolean>>({
    investment: false,
    financing: false,
    cashflow: false,
    tax: false,
    breakeven: false,
  });

  // Card pairs: cards in the same row toggle together
  // In eigennutzer mode: Cashflow (Miete vs. Kauf) pairs with Break-Even
  // In investor mode: Cashflow pairs with Tax (Steuereffekt)
  const cardPairs: Partial<Record<CardId, CardId>> = mode === 'eigennutzer'
    ? {
        investment: 'financing',
        financing: 'investment',
        cashflow: 'breakeven',
        breakeven: 'cashflow',
      }
    : {
        investment: 'financing',
        financing: 'investment',
        cashflow: 'tax',
        tax: 'cashflow',
      };

  const toggleCardExpansion = (cardId: CardId) => {
    const pairedCardId = cardPairs[cardId];
    const newState = !expandedCards[cardId];
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: newState,
      ...(pairedCardId ? { [pairedCardId]: newState } : {}),
    }));
  };

  // Initialize edit states from userParams
  useEffect(() => {
    if (userParams) {
      setEditState((prev) => ({
        ...prev,
        purchasePrice: userParams.purchase_price ?? null,
        equityPercent: userParams.equity_percentage ?? null,
        interestRate: userParams.interest_rate ?? null,
        amortizationRate: userParams.amortization_rate ?? null,
        brokerCommission: userParams.broker_commission ?? null,
        renovationCosts: userParams.renovation_costs ?? null,
        monthlyFee: userParams.monthly_fee ?? null,
        monthlyRent: userParams.monthly_rent ?? null,
      }));
    }
  }, [userParams]);

  // Update editPurchasePrice when purchasePrice prop changes
  useEffect(() => {
    if (purchasePrice > 0) {
      setEditState((prev) => ({ ...prev, purchasePrice }));
    }
  }, [purchasePrice]);

  // Initialize edit state when starting in edit mode
  // Use initialEditState if provided (from localStorage), otherwise use props/DB defaults
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    // Wait for calculatorDefaults to load before initializing (or timeout after mount)
    if (startInEditMode && !hasInitialized && purchasePrice > 0) {
      // Check if we have saved values from initialEditState
      const hasSavedValues = initialEditState && (
        initialEditState.equityPercent !== null ||
        initialEditState.interestRate !== null ||
        initialEditState.amortizationRate !== null ||
        initialEditState.brokerCommission !== null
      );

      if (hasSavedValues) {
        // Use saved values, falling back to DB defaults or props for any missing values
        setEditState({
          purchasePrice: initialEditState.purchasePrice ?? purchasePrice ?? null,
          equityPercent: initialEditState.equityPercent ?? equityPercentage ?? null,
          eigenkapitalBetrag: initialEditState.eigenkapitalBetrag ?? null,
          darlehensbetrag: initialEditState.darlehensbetrag ?? null,
          interestRate: initialEditState.interestRate ?? interestRate ?? null,
          amortizationRate: initialEditState.amortizationRate ?? amortizationRate ?? null,
          brokerCommission: initialEditState.brokerCommission ?? commissionRate ?? null,
          renovationCosts: initialEditState.renovationCosts ?? renovationCosts ?? null,
          monthlyFee: initialEditState.monthlyFee ?? monthlyFee ?? null,
          monthlyRent: initialEditState.monthlyRent ?? monthlyRent ?? null,
          maintenanceCosts: initialEditState.maintenanceCosts ?? null,
          afaRate: initialEditState.afaRate ?? null,
          grenzsteuersatz: initialEditState.grenzsteuersatz ?? null,
        });
      } else {
        // No saved values, calculate all defaults from available data
        const defaultState = calculateDefaultEditState(
          props,
          userParams,
          currentMarketRate,
          plzMarketRent,
          calculatorDefaults
        );
        setEditState(defaultState);
      }
      setHasInitialized(true);
    }
  }, [
    startInEditMode,
    hasInitialized,
    purchasePrice,
    equityPercentage,
    interestRate,
    amortizationRate,
    commissionRate,
    renovationCosts,
    monthlyFee,
    monthlyRent,
    initialEditState,
    plzMarketRent,
    currentMarketRate,
    calculatorDefaults,
    sqm,
    yearBuilt,
    estimatedRentPerSqm,
    userParams,
    mode,
    marketRent,
    props,
  ]);

  // Detect state from location (needed for detectedState export)
  const detectedState = detectStateFromLocation(location);

  // Get Grunderwerbsteuer rate with 3-tier fallback: Database > Detection > Default
  const grunderwerbsteuerRate = useMemo(() => {
    // Priority 1: Use rate from market data (PLZ or city search) if available
    if (marketData?.grunderwerbsteuer_rate) {
      return Number(marketData.grunderwerbsteuer_rate);
    }

    // Priority 2: Fallback to location detection
    if (detectedState && GRUNDERWERBSTEUER_SAETZE[detectedState]) {
      return GRUNDERWERBSTEUER_SAETZE[detectedState];
    }

    // Priority 3: Default fallback
    return 5.0;
  }, [marketData, detectedState]);

  // Effective values (edit takes priority)
  const effectivePurchasePrice = Number(editState.purchasePrice ?? purchasePrice) || 0;
  // effectiveEquityPercent is already calculated above before the query (useMemo)
  // Interest rate priority: editState > userParams > current market rate > prop default > fallback
  const effectiveInterestRate = Number(
    editState.interestRate ??
    userParams?.interest_rate ??
    currentMarketRate?.interestRate ??
    interestRate ??
    4.25
  ) || 4.25;
  const effectiveAmortizationRate = Number(
    editState.amortizationRate ??
    userParams?.amortization_rate ??
    amortizationRate ??
    2.0
  ) || 2.0;
  const effectiveBrokerCommission = Number(editState.brokerCommission ?? commissionRate) || 0;
  const effectiveRenovationCosts = Number(editState.renovationCosts ?? renovationCosts) || 0;

  // Calculate Hausgeld (using configurable defaults)
  const calculateHausgeld = (): number => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm) {
      // Use database defaults if available, otherwise use fallback constants
      const hausgeldModern = calculatorDefaults?.hausgeldPerSqmModern ?? DEFAULT_HAUSGELD_MODERN;
      const hausgeldOld = calculatorDefaults?.hausgeldPerSqmOld ?? DEFAULT_HAUSGELD_OLD;
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? hausgeldModern : hausgeldOld;
      return sqm * hausgeldProQm;
    }
    return 0;
  };

  // Calculate Rent (with PLZ market data fallback)
  const calculateRent = (): number => {
    if (mode === 'eigennutzer') {
      // For eigennutzer: use marketRent prop, then PLZ market rent
      return marketRent ?? plzMarketRent ?? 0;
    }
    // Investor mode priority:
    // 1. monthlyRent prop (from property data)
    // 2. estimatedRentPerSqm * sqm (from buyer_evaluation)
    // 3. PLZ market rent (from plz_market_data)
    // 4. Fallback to 0
    if (monthlyRent && monthlyRent > 0) return monthlyRent;
    if (estimatedRentPerSqm && sqm) return estimatedRentPerSqm * sqm;
    if (plzMarketRent) return plzMarketRent;
    return 0;
  };

  // Calculations
  const values = useMemo<CalculatedValues>(() => {
    // Kaufnebenkosten
    const grunderwerbsteuer = effectivePurchasePrice * (grunderwerbsteuerRate / 100);
    const notarkosten = effectivePurchasePrice * 0.015;
    const grundbuchkosten = effectivePurchasePrice * 0.005;
    const maklergebuehren = effectivePurchasePrice * (effectiveBrokerCommission / 100);
    const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren + effectiveRenovationCosts;
    const gesamtinvestition = effectivePurchasePrice + kaufnebenkosten;

    // Finanzierung - mit 3-Wege-Synchronisation
    // Priorität: darlehensbetrag > eigenkapitalBetrag > equityPercent
    const eigenkapital = (() => {
      // Wenn Darlehensbetrag editiert wurde
      if (editState.darlehensbetrag !== null) {
        return gesamtinvestition - Number(editState.darlehensbetrag);
      }
      // Wenn EK-Betrag editiert wurde
      if (editState.eigenkapitalBetrag !== null) {
        return Number(editState.eigenkapitalBetrag);
      }
      // Wenn EK-Prozent editiert wurde (oder Standardwert)
      return effectivePurchasePrice * (effectiveEquityPercent / 100);
    })();

    const darlehensbetrag = editState.darlehensbetrag !== null
      ? Number(editState.darlehensbetrag)
      : gesamtinvestition - eigenkapital;

    // Berechne tatsächlichen EK-Prozentsatz basierend auf dem Betrag
    const actualEquityPercent = effectivePurchasePrice > 0
      ? (eigenkapital / effectivePurchasePrice) * 100
      : effectiveEquityPercent;
    const monatlicheZinsen = Math.round(darlehensbetrag * (effectiveInterestRate / 100 / 12));
    const monatlicheTilgung = Math.round(darlehensbetrag * (effectiveAmortizationRate / 100 / 12));
    const monatlicheRate = monatlicheZinsen + monatlicheTilgung;

    // Hausgeld
    const hausgeld = Math.ceil(editState.monthlyFee ?? calculateHausgeld());
    const isHausgeldEstimated = !monthlyFee && sqm !== undefined;

    // Instandhaltung (EUR/m²/Jahr - using configurable defaults)
    const maintenancePerSqm = calculatorDefaults?.maintenanceCostPerSqm ?? DEFAULT_MAINTENANCE_PER_SQM;
    const defaultInstandhaltungskosten = sqm ? Math.ceil((sqm * maintenancePerSqm) / 12) : Math.ceil(effectivePurchasePrice * 0.01 / 12);
    const instandhaltungskosten = editState.maintenanceCosts !== null
      ? Math.ceil(editState.maintenanceCosts)
      : defaultInstandhaltungskosten;

    // Nicht-umlegbar (configurable percentage of Hausgeld)
    const nichtUmlegbarAnteil = calculatorDefaults?.nonAllocableHausgeldRatio ?? DEFAULT_NICHT_UMLEGBAR_ANTEIL;
    const hausgeldNichtUmlegbar = Math.ceil(hausgeld * nichtUmlegbarAnteil);

    // Monatliche Ausgaben
    const monatlicheAusgabenOhneKredit = hausgeld + instandhaltungskosten;
    const monatlicheAusgabenOhneKreditEffektiv = hausgeldNichtUmlegbar + instandhaltungskosten;

    // Mieteinnahmen
    const mieteinnahmen = Math.ceil(
      (editState.monthlyRent !== null && editState.monthlyRent !== undefined && editState.monthlyRent > 0)
        ? editState.monthlyRent
        : calculateRent()
    );

    // Cashflow
    const calculatedCashflow = mode === 'investor'
      ? mieteinnahmen - monatlicheRate - monatlicheAusgabenOhneKreditEffektiv
      : mieteinnahmen - monatlicheRate - monatlicheAusgabenOhneKredit;

    // Break-Even EK
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

    // Break-Even Jahre
    const calculateBreakEvenYears = (): number | null => {
      if (mieteinnahmen <= 0 || effectivePurchasePrice <= 0) return null;
      const kaufnebenkostenVerlust = kaufnebenkosten;
      const jaehrlicheZinsen = darlehensbetrag * (effectiveInterestRate / 100);
      const jaehrlicheInstandhaltung = instandhaltungskosten * 12;
      const jaehrlichesHausgeld = hausgeld * 12;
      const jaehrlicheKaeuferKosten = jaehrlicheZinsen + jaehrlicheInstandhaltung + jaehrlichesHausgeld;
      const jaehrlicheMiete = mieteinnahmen * 12;
      const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;
      if (jaehrlicheErsparnis <= 0) return 99;
      const breakEvenJahre = Math.ceil(kaufnebenkostenVerlust / jaehrlicheErsparnis);
      return Math.min(breakEvenJahre, 99);
    };

    // Break-Even Preis (bei welchem Kaufpreis ist Cashflow = 0)
    const calculateBreakEvenPrice = (): number | null => {
      if (mieteinnahmen <= 0) return null;

      // Nebenkosten-Rate (ohne Renovierung, da diese fix bleibt)
      const nebenkostenRate = (grunderwerbsteuerRate / 100) + 0.015 + 0.005 + (effectiveBrokerCommission / 100);

      // Finanzierungs-Faktoren - verwende actualEquityPercent für editierte Werte
      const equityFactor = 1 - (actualEquityPercent / 100);
      const annualRate = (effectiveInterestRate + effectiveAmortizationRate) / 100;

      // Fixe Kosten (nicht vom Kaufpreis abhängig)
      let fixedMonthlyCosts = mode === 'investor' ? hausgeldNichtUmlegbar : hausgeld;

      // Instandhaltung: Fix wenn editiert ODER sqm vorhanden, sonst variabel
      let maintenancePerEuro = 0;
      const isMaintenanceEdited = editState.maintenanceCosts !== null;
      const isMaintenanceFixed = isMaintenanceEdited || sqm !== undefined;

      if (isMaintenanceFixed) {
        // Wenn editiert oder sqm vorhanden: Instandhaltung ist fix
        fixedMonthlyCosts += instandhaltungskosten;
      } else {
        // Nur wenn NICHT editiert UND keine sqm: Instandhaltung ist proportional zum Kaufpreis (1% p.a.)
        maintenancePerEuro = 0.01 / 12;
      }

      // Renovierungskosten werden zu 100% finanziert (wie Nebenkosten)
      // Monatliche Finanzierungskosten für Renovierung
      const renovationFinancingPerMonth = effectiveRenovationCosts * (annualRate / 12);

      // Verfügbar für Kaufpreis-abhängige Kosten
      const availableForPrice = mieteinnahmen - fixedMonthlyCosts - renovationFinancingPerMonth;

      if (availableForPrice <= 0) return null;

      // Kosten-Faktor pro € Kaufpreis:
      // Darlehen = kaufpreis * (1 - ekPercent) + nebenkosten
      // Darlehen = kaufpreis * (1 - ekPercent) + kaufpreis * nebenkostenRate
      // Darlehen = kaufpreis * [(1 - ekPercent) + nebenkostenRate]
      // Monatliche Rate = Darlehen * (annualRate / 12)
      const financingPerEuro = (equityFactor + nebenkostenRate) * (annualRate / 12);
      const costPerEuro = financingPerEuro + maintenancePerEuro;

      if (costPerEuro <= 0) return null;

      const breakEvenPrice = availableForPrice / costPerEuro;

      // Nur zurückgeben wenn sinnvoll (positiv und nicht extrem)
      if (breakEvenPrice < 10000 || breakEvenPrice > 10000000) return null;

      return Math.round(breakEvenPrice);
    };

    // AfA and Grenzsteuersatz
    const defaultAfaRate = getAfaRate(yearBuilt);
    const defaultGrenzsteuersatz = taxProfile?.marginal_tax_rate
      ? Number(taxProfile.marginal_tax_rate) * 100
      : 42;
    const effectiveAfaRate = editState.afaRate !== null ? editState.afaRate / 100 : defaultAfaRate;
    const effectiveGrenzsteuersatz = editState.grenzsteuersatz !== null
      ? editState.grenzsteuersatz / 100
      : defaultGrenzsteuersatz / 100;

    // Steuereffekt
    const calculateSteuereffekt = () => {
      if (effectivePurchasePrice <= 0) return null;
      const buildingRatio = getBuildingRatio(yearBuilt);
      const gebaeudewert = effectivePurchasePrice * buildingRatio;
      const afaJaehrlich = gebaeudewert * effectiveAfaRate;
      const afaMonatlich = afaJaehrlich / 12;

      // Cashflow vor Finanzierung (Mieteinnahmen - Ausgaben)
      const cashflowVorFinanzierung = mieteinnahmen - monatlicheAusgabenOhneKreditEffektiv;
      const cashflowVorFinanzierungJaehrlich = cashflowVorFinanzierung * 12;

      // Jährliche Zinsen
      const jaehrlicheZinsen = monatlicheZinsen * 12;

      // Steuerliches Ergebnis: Cashflow vor Finanzierung - Zinsen - AfA
      const steuerlichesErgebnis = cashflowVorFinanzierungJaehrlich - jaehrlicheZinsen - afaJaehrlich;

      // Steuerberechnung
      const jaehrlich = steuerlichesErgebnis * effectiveGrenzsteuersatz;
      const monatlich = jaehrlich / 12;

      return {
        monatlich: Math.round(monatlich),
        jaehrlich: Math.round(jaehrlich),
        afaJaehrlich: Math.round(afaJaehrlich),
        afaMonatlich: Math.round(afaMonatlich),
        gebaeudewert: Math.round(gebaeudewert),
        steuerlichesErgebnis: Math.round(steuerlichesErgebnis),
        grenzsteuersatz: Math.round(effectiveGrenzsteuersatz * 100),
        afaRate: effectiveAfaRate,
        buildingRatio,
        cashflowVorFinanzierung: Math.round(cashflowVorFinanzierung),
        cashflowVorFinanzierungJaehrlich: Math.round(cashflowVorFinanzierungJaehrlich),
      };
    };

    // Rendite-Berechnungen
    const grossYield = mieteinnahmen > 0 && effectivePurchasePrice > 0
      ? (mieteinnahmen * 12 / effectivePurchasePrice) * 100
      : undefined;

    const rentMultiplier = mieteinnahmen > 0 && effectivePurchasePrice > 0
      ? effectivePurchasePrice / (mieteinnahmen * 12)
      : undefined;

    return {
      grunderwerbsteuerRate,
      detectedState,
      grunderwerbsteuer,
      notarkosten,
      grundbuchkosten,
      maklergebuehren,
      kaufnebenkosten,
      gesamtinvestition,
      eigenkapital,
      darlehensbetrag,
      monatlicheZinsen,
      monatlicheTilgung,
      monatlicheRate,
      hausgeld,
      isHausgeldEstimated,
      instandhaltungskosten,
      hausgeldNichtUmlegbar,
      monatlicheAusgabenOhneKredit,
      monatlicheAusgabenOhneKreditEffektiv,
      mieteinnahmen,
      calculatedCashflow,
      grossYield,
      rentMultiplier,
      breakEvenEK: calculateBreakEvenEK(),
      breakEvenYears: calculateBreakEvenYears(),
      breakEvenPrice: calculateBreakEvenPrice(),
      steuereffekt: calculateSteuereffekt(),
      effectivePurchasePrice,
      effectiveEquityPercent: actualEquityPercent,
      effectiveInterestRate,
      effectiveAmortizationRate,
      effectiveBrokerCommission,
      effectiveRenovationCosts,
      effectiveAfaRate,
      effectiveGrenzsteuersatz,
      defaultAfaRate,
      defaultGrenzsteuersatz,
    };
  }, [
    effectivePurchasePrice,
    effectiveEquityPercent,
    effectiveInterestRate,
    effectiveAmortizationRate,
    effectiveBrokerCommission,
    effectiveRenovationCosts,
    editState.monthlyFee,
    editState.monthlyRent,
    editState.maintenanceCosts,
    editState.afaRate,
    editState.grenzsteuersatz,
    grunderwerbsteuerRate,
    detectedState,
    monthlyFee,
    sqm,
    yearBuilt,
    mode,
    monthlyRent,
    estimatedRentPerSqm,
    marketRent,
    taxProfile,
    plzMarketRent,
    calculatorDefaults,
  ]);

  // Check if user has overridden the market rent
  const isRentOverridden = useMemo(() => {
    if (!plzMarketRent) return false;
    const currentRent = editState.monthlyRent ?? values.mieteinnahmen;
    // Consider it overridden if difference > 5%
    return Math.abs(currentRent - plzMarketRent) / plzMarketRent > 0.05;
  }, [plzMarketRent, editState.monthlyRent, values.mieteinnahmen]);

  // Reset edit mode
  const handleReset = () => {
    setEditState({
      purchasePrice: null,
      equityPercent: null,
      eigenkapitalBetrag: null,
      darlehensbetrag: null,
      interestRate: null,
      amortizationRate: null,
      brokerCommission: null,
      renovationCosts: null,
      monthlyFee: null,
      monthlyRent: null,
      maintenanceCosts: null,
      afaRate: null,
      grenzsteuersatz: null,
    });
  };

  // Save handler
  const handleSave = () => {
    if (onSaveParams) {
      const calculatedGrossYield = values.mieteinnahmen > 0 && values.effectivePurchasePrice > 0
        ? (values.mieteinnahmen * 12 / values.effectivePurchasePrice) * 100
        : null;
      const calculatedRentMultiplier = values.mieteinnahmen > 0 && values.effectivePurchasePrice > 0
        ? values.effectivePurchasePrice / (values.mieteinnahmen * 12)
        : null;

      onSaveParams({
        equityPercentage: editState.equityPercent,
        interestRate: editState.interestRate,
        amortizationRate: editState.amortizationRate,
        brokerCommission: editState.brokerCommission,
        renovationCosts: editState.renovationCosts,
        monthlyRent: editState.monthlyRent,
        monthlyFee: editState.monthlyFee,
        purchasePrice: editState.purchasePrice,
        calculatedGrossYield: calculatedGrossYield ?? null,
        calculatedRentMultiplier: calculatedRentMultiplier ?? null,
        calculatedMonthlyCashflow: values.calculatedCashflow ?? null,
      });
    }
    setIsEditMode(false);
  };

  // Start simulation
  const startSimulation = () => {
    setEditState({
      purchasePrice: values.effectivePurchasePrice,
      equityPercent: values.effectiveEquityPercent,
      eigenkapitalBetrag: values.eigenkapital,
      darlehensbetrag: values.darlehensbetrag,
      interestRate: values.effectiveInterestRate,
      amortizationRate: values.effectiveAmortizationRate,
      brokerCommission: values.effectiveBrokerCommission,
      renovationCosts: values.effectiveRenovationCosts,
      monthlyFee: values.hausgeld,
      monthlyRent: values.mieteinnahmen,
      maintenanceCosts: values.instandhaltungskosten,
      afaRate: values.effectiveAfaRate * 100,
      grenzsteuersatz: values.effectiveGrenzsteuersatz * 100,
    });
    setIsEditMode(true);
  };

  return {
    props,
    isEditMode,
    setIsEditMode,
    editState,
    setEditState,
    values,
    expandedCards,
    toggleCardExpansion,
    handleReset,
    handleSave,
    startSimulation,
    formatCurrency,
    // Market interest rate info (from weekly Zinsupdate)
    marketRateInfo: currentMarketRate ? {
      interestRate: currentMarketRate.interestRate,
      calendarWeek: currentMarketRate.calendarWeek,
      year: currentMarketRate.year,
      lastUpdated: currentMarketRate.lastUpdated ? new Date(currentMarketRate.lastUpdated) : null,
    } : null,
    // PLZ-based market rent
    plzMarketRent,
    isLoadingMarketData,
    isRentOverridden,
  };
}
