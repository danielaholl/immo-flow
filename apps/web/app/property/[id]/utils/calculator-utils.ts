// Grunderwerbsteuer nach Bundesland
export const GRUNDERWERBSTEUER_SAETZE: Record<string, number> = {
  'bayern': 3.5, 'sachsen': 3.5, 'hamburg': 4.5, 'baden-württemberg': 5.0,
  'niedersachsen': 5.0, 'rheinland-pfalz': 5.0, 'sachsen-anhalt': 5.0,
  'berlin': 6.0, 'hessen': 6.0, 'mecklenburg-vorpommern': 6.0, 'bremen': 5.0,
  'nordrhein-westfalen': 6.5, 'saarland': 6.5, 'schleswig-holstein': 6.5,
  'brandenburg': 6.5, 'thüringen': 6.5,
};

export function detectStateFromLocation(location?: string): string | null {
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

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseNum = (val: unknown, fallback: number): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

export const parseEKRate = (val: unknown, fallback: number): number => {
  if (val === null || val === undefined || val === '' || val === 0) return fallback;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? fallback : num;
};

export const getAfaRate = (yearBuilt?: number): number => {
  if (!yearBuilt) return 0.02;
  if (yearBuilt >= 2024) return 0.04;
  if (yearBuilt < 1925) return 0.025;
  return 0.02;
};

export const getBuildingRatio = (yearBuilt?: number): number => {
  if (yearBuilt && yearBuilt >= 2024) return 0.85;
  return 0.80;
};

/**
 * Extract 5-digit German PLZ from location string
 * @returns The PLZ if found, null otherwise
 */
export function extractPLZFromLocation(location?: string): string | null {
  if (!location) return null;
  const match = location.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

// Calculate factor scores from buyer_evaluation data
export interface FactorScores {
  location: number;
  pricePerformance: number;
  appreciation: number;
  rentability: number;
}

export const calculateFactorScores = (
  buyerEvaluation: {
    buyer_investor?: {
      grossYield?: number;
      microLocationTrend?: 'steigend' | 'stabil' | 'fallend';
      riskLevel?: 'niedrig' | 'mittel' | 'hoch';
      investmentScore?: number;
    };
  } | null,
  price?: number,
  sqm?: number | null,
  overallScore?: number | null
): FactorScores => {
  const buyerInvestor = buyerEvaluation?.buyer_investor;
  const grossYield = buyerInvestor?.grossYield;
  const microLocationTrend = buyerInvestor?.microLocationTrend;
  const riskLevel = buyerInvestor?.riskLevel;
  const investmentScore = overallScore ?? buyerInvestor?.investmentScore ?? 50;

  // 1. Vermietbarkeit - based on gross yield
  let rentability = 50;
  if (grossYield !== undefined) {
    if (grossYield >= 5.0) rentability = 100;
    else if (grossYield >= 4.5) rentability = 92;
    else if (grossYield >= 4.0) rentability = 85;
    else if (grossYield >= 3.5) rentability = 77;
    else if (grossYield >= 3.0) rentability = 70;
    else if (grossYield >= 2.5) rentability = 55;
    else if (grossYield >= 2.0) rentability = 40;
    else rentability = 25;
  }

  // 2. Preis-Leistung - based on price per sqm vs market average
  let pricePerformance = 60;
  if (price && sqm && Number(sqm) > 0) {
    const pricePerSqm = price / Number(sqm);
    const avgPricePerSqm = 4000; // German average baseline
    const ratio = pricePerSqm / avgPricePerSqm;

    if (ratio <= 0.7) pricePerformance = 100;
    else if (ratio <= 0.85) pricePerformance = 88;
    else if (ratio <= 1.0) pricePerformance = 75;
    else if (ratio <= 1.15) pricePerformance = 58;
    else if (ratio <= 1.3) pricePerformance = 42;
    else if (ratio <= 1.5) pricePerformance = 28;
    else pricePerformance = 15;
  }

  // 3. Lage & Mikrolage - based on location trend
  let location = 70;
  if (microLocationTrend === 'steigend') location = 92;
  else if (microLocationTrend === 'stabil') location = 72;
  else if (microLocationTrend === 'fallend') location = 45;

  // Adjust location based on risk level
  if (riskLevel === 'niedrig') location = Math.min(100, location + 5);
  else if (riskLevel === 'hoch') location = Math.max(0, location - 10);

  // 4. Wertsteigerungspotential - combination of trend and risk
  let appreciation = 65;
  if (microLocationTrend === 'steigend') {
    appreciation = riskLevel === 'niedrig' ? 95 : riskLevel === 'mittel' ? 85 : 70;
  } else if (microLocationTrend === 'stabil') {
    appreciation = riskLevel === 'niedrig' ? 75 : riskLevel === 'mittel' ? 65 : 50;
  } else {
    appreciation = riskLevel === 'niedrig' ? 55 : riskLevel === 'mittel' ? 40 : 25;
  }

  // Fine-tune scores to align with overall investment score
  // The overall score should roughly be: location*0.30 + price*0.25 + yield*0.25 + appreciation*0.15 + features*0.05
  // We adjust slightly to make the visual representation meaningful
  const calculatedAvg = location * 0.30 + pricePerformance * 0.25 + rentability * 0.25 + appreciation * 0.15;
  const adjustment = (investmentScore - calculatedAvg) / 4;

  return {
    location: Math.round(Math.min(100, Math.max(0, location + adjustment))),
    pricePerformance: Math.round(Math.min(100, Math.max(0, pricePerformance + adjustment))),
    appreciation: Math.round(Math.min(100, Math.max(0, appreciation + adjustment))),
    rentability: Math.round(Math.min(100, Math.max(0, rentability + adjustment))),
  };
};
