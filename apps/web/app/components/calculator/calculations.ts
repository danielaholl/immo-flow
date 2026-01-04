import { CalculatedValues } from './types';
import {
  GRUNDERWERBSTEUER_SAETZE,
  detectStateFromLocation,
  getAfaRate,
  getBuildingRatio
} from '@/app/property/[id]/utils/calculator-utils';

export interface CalculationInputs {
  mode: 'investor' | 'eigennutzer';
  purchasePrice: number;
  location: string;
  sqm?: number;
  yearBuilt?: number;
  monthlyRent: number;
  monthlyFee?: number;
  equityPercentage: number;
  interestRate: number;
  amortizationRate: number;
  commissionRate: number;
  renovationCosts: number;

  // DB Defaults
  nonAllocableHausgeldRatio?: number;
  maintenanceCostPerSqm?: number;
  hausgeldPerSqmModern?: number;
  hausgeldPerSqmOld?: number;
  grunderwerbsteuerRate?: number;

  // Tax
  marginalTaxRate?: number;
}

/**
 * Zentrale Berechnungsfunktion für alle Calculator-Metriken
 * Wird von useCalculatorState und calculator/page.tsx verwendet
 */
export function calculateMetrics(inputs: CalculationInputs): Partial<CalculatedValues> {
  const {
    mode,
    purchasePrice,
    location,
    sqm,
    yearBuilt,
    monthlyRent,
    monthlyFee,
    equityPercentage,
    interestRate,
    amortizationRate,
    commissionRate,
    renovationCosts,
    nonAllocableHausgeldRatio = 0.30,
    maintenanceCostPerSqm = 10,
    hausgeldPerSqmModern = 2.50,
    hausgeldPerSqmOld = 3.50,
    grunderwerbsteuerRate,
    marginalTaxRate = 0.42,
  } = inputs;

  // Kaufnebenkosten
  const detectedState = detectStateFromLocation(location);
  const effectiveGrunderwerbsteuerRate = grunderwerbsteuerRate ??
    (detectedState ? GRUNDERWERBSTEUER_SAETZE[detectedState] : 5.0);

  const grunderwerbsteuer = purchasePrice * (effectiveGrunderwerbsteuerRate / 100);
  const notarkosten = purchasePrice * 0.015;
  const grundbuchkosten = purchasePrice * 0.005;
  const maklergebuehren = purchasePrice * (commissionRate / 100);
  const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren + renovationCosts;
  const gesamtinvestition = purchasePrice + kaufnebenkosten;

  // Finanzierung
  const eigenkapital = gesamtinvestition * (equityPercentage / 100);
  const darlehensbetrag = gesamtinvestition - eigenkapital;
  const monatlicheZinsen = Math.round(darlehensbetrag * (interestRate / 100 / 12));
  const monatlicheTilgung = Math.round(darlehensbetrag * (amortizationRate / 100 / 12));
  const monatlicheRate = monatlicheZinsen + monatlicheTilgung;

  // Hausgeld
  const hausgeld = monthlyFee && monthlyFee > 0
    ? monthlyFee
    : sqm
      ? sqm * (yearBuilt && yearBuilt >= 1980 ? hausgeldPerSqmModern : hausgeldPerSqmOld)
      : 0;

  const hausgeldNichtUmlegbar = Math.ceil(hausgeld * nonAllocableHausgeldRatio);

  // Instandhaltung
  const instandhaltungskosten = sqm
    ? Math.ceil((sqm * maintenanceCostPerSqm) / 12)
    : Math.ceil(purchasePrice * 0.01 / 12);

  // Ausgaben
  const monatlicheAusgabenOhneKredit = hausgeld + instandhaltungskosten;
  const monatlicheAusgabenOhneKreditEffektiv = hausgeldNichtUmlegbar + instandhaltungskosten;

  // Cashflow
  const calculatedCashflow = mode === 'investor'
    ? monthlyRent - monatlicheRate - monatlicheAusgabenOhneKreditEffektiv
    : monthlyRent - monatlicheRate - monatlicheAusgabenOhneKredit;

  // Rendite
  const grossYield = monthlyRent > 0 && purchasePrice > 0
    ? (monthlyRent * 12 / purchasePrice) * 100
    : undefined;

  const rentMultiplier = monthlyRent > 0 && purchasePrice > 0
    ? purchasePrice / (monthlyRent * 12)
    : undefined;

  // Steuereffekt (nur Investor)
  let steuereffekt = null;
  if (mode === 'investor' && monthlyRent > 0) {
    const afaRate = getAfaRate(yearBuilt);
    const buildingRatio = getBuildingRatio(yearBuilt);
    const gebaeudewert = purchasePrice * buildingRatio;
    const afaJaehrlich = gebaeudewert * afaRate;
    const afaMonatlich = afaJaehrlich / 12;

    const cashflowVorFinanzierung = monthlyRent - monatlicheAusgabenOhneKreditEffektiv;
    const cashflowVorFinanzierungJaehrlich = cashflowVorFinanzierung * 12;
    const jaehrlicheZinsen = monatlicheZinsen * 12;
    const steuerlichesErgebnis = cashflowVorFinanzierungJaehrlich - jaehrlicheZinsen - afaJaehrlich;
    const jaehrlich = steuerlichesErgebnis * marginalTaxRate;

    steuereffekt = {
      monatlich: Math.round(jaehrlich / 12),
      jaehrlich: Math.round(jaehrlich),
      afaJaehrlich: Math.round(afaJaehrlich),
      afaMonatlich: Math.round(afaMonatlich),
      gebaeudewert: Math.round(gebaeudewert),
      steuerlichesErgebnis: Math.round(steuerlichesErgebnis),
      grenzsteuersatz: Math.round(marginalTaxRate * 100),
      afaRate,
      buildingRatio,
      cashflowVorFinanzierung: Math.round(cashflowVorFinanzierung),
      cashflowVorFinanzierungJaehrlich: Math.round(cashflowVorFinanzierungJaehrlich),
    };
  }

  return {
    grunderwerbsteuerRate: effectiveGrunderwerbsteuerRate,
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
    hausgeld: Math.ceil(hausgeld),
    isHausgeldEstimated: !monthlyFee && !!sqm,
    instandhaltungskosten,
    hausgeldNichtUmlegbar,
    monatlicheAusgabenOhneKredit,
    monatlicheAusgabenOhneKreditEffektiv,
    mieteinnahmen: Math.ceil(monthlyRent),
    calculatedCashflow,
    grossYield,
    rentMultiplier,
    steuereffekt,
    effectivePurchasePrice: purchasePrice,
    effectiveEquityPercent: equityPercentage,
    effectiveInterestRate: interestRate,
    effectiveAmortizationRate: amortizationRate,
    effectiveBrokerCommission: commissionRate,
    effectiveRenovationCosts: renovationCosts,
    effectiveAfaRate: mode === 'investor' ? getAfaRate(yearBuilt) : 0,
    effectiveGrenzsteuersatz: marginalTaxRate,
    defaultAfaRate: mode === 'investor' ? getAfaRate(yearBuilt) : 0,
    defaultGrenzsteuersatz: marginalTaxRate * 100,
  };
}
