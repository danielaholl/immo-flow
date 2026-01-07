/**
 * Quick Break-Even Calculation Utility
 *
 * Berechnet die Break-Even-Jahre für "Kaufen vs Mieten" Entscheidung
 * mit verfügbaren Property-Daten und Standardwerten.
 *
 * Nutzt die gleiche Logik wie useCalculatorState.ts für Konsistenz.
 */

export interface QuickBreakEvenParams {
  purchasePrice: number;
  sqm: number;
  yearBuilt?: number;
  estimatedRentPerSqm?: number;
  plzCode?: string;
  // Optional overrides
  equityPercentage?: number;
  interestRate?: number;
}

export interface BreakEvenResult {
  years: number;
  isQuickCalculation: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Standardwerte (aus useCalculatorState.ts)
const DEFAULTS = {
  EQUITY_PERCENTAGE: 20,
  INTEREST_RATE: 4.25,
  AMORTIZATION_RATE: 2.0,
  HAUSGELD_MODERN: 2.50, // €/qm (nach 1980)
  HAUSGELD_OLD: 3.50,    // €/qm (vor 1980)
  MAINTENANCE: 10,        // €/qm/Jahr
  GRUNDERWERBSTEUER: 6.0, // % (Durchschnitt)
  NOTAR: 1.5,            // %
  GRUNDBUCH: 0.5,        // %
  MAKLER: 0,             // % (Standard 0, falls nicht angegeben)
};

/**
 * Berechnet die Break-Even-Jahre für Eigennutzer
 *
 * @param params - Berechnungsparameter
 * @returns BreakEvenResult oder null bei ungültigen Inputs
 */
export function calculateQuickBreakEven(params: QuickBreakEvenParams): BreakEvenResult | null {
  const {
    purchasePrice,
    sqm,
    yearBuilt,
    estimatedRentPerSqm,
    equityPercentage = DEFAULTS.EQUITY_PERCENTAGE,
    interestRate = DEFAULTS.INTEREST_RATE,
  } = params;

  // Validation
  if (!purchasePrice || purchasePrice <= 0 || !sqm || sqm <= 0) {
    return null;
  }

  // 1. Kaufnebenkosten berechnen
  const grunderwerbsteuer = purchasePrice * (DEFAULTS.GRUNDERWERBSTEUER / 100);
  const notarkosten = purchasePrice * (DEFAULTS.NOTAR / 100);
  const grundbuchkosten = purchasePrice * (DEFAULTS.GRUNDBUCH / 100);
  const maklergebuehren = purchasePrice * (DEFAULTS.MAKLER / 100);
  const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren;

  // 2. Finanzierung berechnen
  const eigenkapital = purchasePrice * (equityPercentage / 100);
  const darlehensbetrag = purchasePrice - eigenkapital;

  // 3. Monatliche Kosten berechnen
  const hausgeldPerSqm = yearBuilt && yearBuilt > 1980
    ? DEFAULTS.HAUSGELD_MODERN
    : DEFAULTS.HAUSGELD_OLD;
  const hausgeld = sqm * hausgeldPerSqm;
  const instandhaltung = sqm * (DEFAULTS.MAINTENANCE / 12);

  const jaehrlicheZinsen = darlehensbetrag * (interestRate / 100);

  // 4. Miete schätzen
  const geschaetzteMiete = estimatedRentPerSqm
    ? estimatedRentPerSqm * sqm
    : sqm * 10; // Fallback: 10€/qm

  // 5. Break-Even berechnen
  // Formel: kaufnebenkosten / (jaehrlicheMiete - jaehrlicheKaeuferKosten)
  const jaehrlicheKaeuferKosten = jaehrlicheZinsen + (hausgeld * 12) + (instandhaltung * 12);
  const jaehrlicheMiete = geschaetzteMiete * 12;
  const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;

  if (jaehrlicheErsparnis <= 0) {
    return { years: 99, isQuickCalculation: true, confidence: 'low' };
  }

  const breakEvenJahre = Math.ceil(kaufnebenkosten / jaehrlicheErsparnis);
  const finalYears = Math.min(breakEvenJahre, 99);

  // 6. Confidence Level bestimmen
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (estimatedRentPerSqm && yearBuilt) {
    confidence = 'high';
  } else if (!estimatedRentPerSqm || !yearBuilt) {
    confidence = 'low';
  }

  return {
    years: finalYears,
    isQuickCalculation: true,
    confidence,
  };
}
