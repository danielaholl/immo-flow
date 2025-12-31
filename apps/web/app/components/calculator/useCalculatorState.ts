'use client';

import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { trpc } from '@/app/providers/TRPCProvider';
import {
  CalculatorProps,
  EditState,
  CalculatedValues,
  CalculatorContextValue,
} from './types';
import {
  GRUNDERWERBSTEUER_SAETZE,
  detectStateFromLocation,
  formatCurrency,
  getAfaRate,
  getBuildingRatio,
} from '@/app/property/[id]/utils/calculator-utils';

const NICHT_UMLEGBAR_ANTEIL = 0.30;

// Context for sharing calculator state across cards
export const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculatorContext() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculatorContext must be used within a CalculatorProvider');
  }
  return context;
}

export function useCalculatorState(props: CalculatorProps): CalculatorContextValue {
  const {
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
    onPurchasePriceChange,
    startInEditMode = false,
  } = props;

  // Tax profile for marginal tax rate
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(startInEditMode);
  const [editState, setEditState] = useState<EditState>({
    purchasePrice: null,
    equityPercent: null,
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
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (startInEditMode && !hasInitialized && purchasePrice > 0) {
      setEditState({
        purchasePrice: purchasePrice,
        equityPercent: equityPercentage,
        interestRate: interestRate,
        amortizationRate: amortizationRate,
        brokerCommission: commissionRate,
        renovationCosts: renovationCosts,
        monthlyFee: monthlyFee ?? null,
        monthlyRent: monthlyRent ?? null,
        maintenanceCosts: null,
        afaRate: null,
        grenzsteuersatz: null,
      });
      setHasInitialized(true);
    }
  }, [startInEditMode, hasInitialized, purchasePrice, equityPercentage, interestRate, amortizationRate, commissionRate, renovationCosts, monthlyFee, monthlyRent]);

  // Detect state for Grunderwerbsteuer
  const detectedState = detectStateFromLocation(location);
  const grunderwerbsteuerRate = detectedState
    ? GRUNDERWERBSTEUER_SAETZE[detectedState]
    : 5.0;

  // Effective values (edit takes priority)
  const effectivePurchasePrice = Number(editState.purchasePrice ?? purchasePrice) || 0;
  const effectiveEquityPercent = Number(editState.equityPercent ?? equityPercentage) || 20;
  const effectiveInterestRate = Number(editState.interestRate ?? interestRate ?? 3.5) || 3.5;
  const effectiveAmortizationRate = Number(editState.amortizationRate ?? amortizationRate ?? 2.0) || 2.0;
  const effectiveBrokerCommission = Number(editState.brokerCommission ?? commissionRate) || 0;
  const effectiveRenovationCosts = Number(editState.renovationCosts ?? renovationCosts) || 0;

  // Calculate Hausgeld
  const calculateHausgeld = (): number => {
    if (monthlyFee && monthlyFee > 0) return monthlyFee;
    if (sqm) {
      const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
      return sqm * hausgeldProQm;
    }
    return 0;
  };

  // Calculate Rent
  const calculateRent = (): number => {
    if (mode === 'eigennutzer') {
      return marketRent ?? 0;
    }
    if (monthlyRent && monthlyRent > 0) return monthlyRent;
    if (estimatedRentPerSqm && sqm) return estimatedRentPerSqm * sqm;
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

    // Finanzierung
    const eigenkapital = gesamtinvestition * (effectiveEquityPercent / 100);
    const darlehensbetrag = gesamtinvestition - eigenkapital;
    const monatlicheZinsen = Math.round(darlehensbetrag * (effectiveInterestRate / 100 / 12));
    const monatlicheTilgung = Math.round(darlehensbetrag * (effectiveAmortizationRate / 100 / 12));
    const monatlicheRate = monatlicheZinsen + monatlicheTilgung;

    // Hausgeld
    const hausgeld = Math.ceil(editState.monthlyFee ?? calculateHausgeld());
    const isHausgeldEstimated = !monthlyFee && sqm !== undefined;

    // Instandhaltung (1% p.a.)
    const defaultInstandhaltungskosten = Math.ceil(effectivePurchasePrice * 0.01 / 12);
    const instandhaltungskosten = editState.maintenanceCosts !== null
      ? Math.ceil(editState.maintenanceCosts)
      : defaultInstandhaltungskosten;

    // Nicht-umlegbar (30%)
    const hausgeldNichtUmlegbar = Math.ceil(hausgeld * NICHT_UMLEGBAR_ANTEIL);

    // Monatliche Ausgaben
    const monatlicheAusgabenOhneKredit = hausgeld + instandhaltungskosten;
    const monatlicheAusgabenOhneKreditEffektiv = hausgeldNichtUmlegbar + instandhaltungskosten;

    // Mieteinnahmen
    const mieteinnahmen = Math.ceil(editState.monthlyRent ?? calculateRent());

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
      const cashflowJaehrlich = calculatedCashflow * 12;
      const steuerlichesErgebnis = cashflowJaehrlich - afaJaehrlich;
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
      };
    };

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
      breakEvenEK: calculateBreakEvenEK(),
      breakEvenYears: calculateBreakEvenYears(),
      steuereffekt: calculateSteuereffekt(),
      effectivePurchasePrice,
      effectiveEquityPercent,
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
  ]);

  // Reset edit mode
  const handleReset = () => {
    setEditState({
      purchasePrice: null,
      equityPercent: null,
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
    handleReset,
    handleSave,
    startSimulation,
    formatCurrency,
  };
}
