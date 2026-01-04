/**
 * Negotiation Calculator Service
 * Calculates optimal negotiation price based on market data and property metrics
 */

export interface NegotiationStrategy {
  targetPrice: number;
  minPrice: number;
  maxPrice: number;
  reasoning: string;
  discount: number; // Percentage discount from listing price
}

export interface FairValueCalculation {
  fairValue: number;
  marketValue: number;
  yieldBasedValue: number;
  breakEvenValue: number;
  actualYield: number;
  valueDeviation: number; // Percentage: (inputPrice - fairValue) / fairValue * 100
  reasoning: string;
}

/**
 * Calculate optimal negotiation price for property investment
 *
 * Strategy:
 * - Price >20% over market: Target 15% discount
 * - Price 10-20% over market: Target 10% discount
 * - Price at market: Target 5-20% discount for top deal
 * - Price under market: Act fast, target 3-5% discount
 * - Additional 5% discount if cashflow is negative
 *
 * @param listingPrice - Advertised purchase price
 * @param marketAvgPricePerSqm - Market average price per sqm from PLZ data
 * @param sqm - Living area in square meters
 * @param cashflow - Monthly cashflow after all costs
 * @param breakEvenPrice - Price at which cashflow would be zero
 * @returns Negotiation strategy with target price and reasoning
 */
export function calculateOptimalNegotiationPrice(
  listingPrice: number,
  marketAvgPricePerSqm: number | null,
  sqm: number,
  cashflow: number,
  breakEvenPrice: number | null
): NegotiationStrategy {
  // Calculate market price if market data available
  const marketPrice = marketAvgPricePerSqm && sqm > 0
    ? marketAvgPricePerSqm * sqm
    : null;

  // Calculate price deviation from market
  let priceVsMarketPercent = 0;
  if (marketPrice && marketPrice > 0) {
    priceVsMarketPercent = ((listingPrice - marketPrice) / marketPrice) * 100;
  }

  // Determine base discount based on market deviation
  let baseDiscount = 0;
  let reasoning = '';

  if (!marketPrice) {
    // No market data available - conservative approach
    baseDiscount = 0.05;
    reasoning = 'Keine Marktdaten verfügbar - konservative 5% Verhandlung empfohlen';
  } else if (priceVsMarketPercent > 20) {
    // Significantly over market
    baseDiscount = 0.15;
    reasoning = `Preis liegt ${priceVsMarketPercent.toFixed(1)}% über Marktwert - aggressive Verhandlung mit 15% Rabatt empfohlen`;
  } else if (priceVsMarketPercent > 10) {
    // Over market
    baseDiscount = 0.10;
    reasoning = `Preis liegt ${priceVsMarketPercent.toFixed(1)}% über Marktwert - moderate Verhandlung mit 10% Rabatt`;
  } else if (priceVsMarketPercent > -5) {
    // At or near market
    baseDiscount = 0.08;
    reasoning = `Preis marktgerecht (${priceVsMarketPercent >= 0 ? '+' : ''}${priceVsMarketPercent.toFixed(1)}%) - 5-10% Verhandlungsspielraum für Top-Deal`;
  } else {
    // Under market - act fast
    baseDiscount = 0.03;
    reasoning = `Preis ${Math.abs(priceVsMarketPercent).toFixed(1)}% unter Marktwert - schnelles Handeln empfohlen, kleine Verhandlung`;
  }

  // Additional discount if cashflow is negative
  let cashflowAdjustment = 0;
  if (cashflow < 0) {
    cashflowAdjustment = 0.05;
    reasoning += `. Negativer Cashflow (${cashflow.toFixed(0)}€/Mo) erfordert zusätzliche 5% Preisreduktion`;
  }

  const totalDiscount = baseDiscount + cashflowAdjustment;
  const targetPrice = Math.round(listingPrice * (1 - totalDiscount));

  // Calculate bounds
  // Min price: Break-even price with 20% safety margin, or 50% of listing price
  const minPrice = breakEvenPrice !== null
    ? Math.round(Math.max(breakEvenPrice * 0.8, listingPrice * 0.5))
    : Math.round(listingPrice * 0.7);

  // Max price: 5% below listing (always try to negotiate at least something)
  const maxPrice = Math.round(listingPrice * 0.95);

  // Ensure target is within bounds
  const boundedTargetPrice = Math.max(minPrice, Math.min(targetPrice, maxPrice));

  return {
    targetPrice: boundedTargetPrice,
    minPrice,
    maxPrice,
    reasoning,
    discount: totalDiscount * 100, // Convert to percentage
  };
}

/**
 * Format currency for German locale
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate potential savings from negotiation
 */
export function calculateSavings(listingPrice: number, targetPrice: number): string {
  const savings = listingPrice - targetPrice;
  const savingsPercent = (savings / listingPrice) * 100;
  return `${formatCurrency(savings)} (${savingsPercent.toFixed(1)}%)`;
}

/**
 * Calculate fair market value for a property
 *
 * This function calculates an objective property value independent of the input price,
 * using multiple valuation approaches:
 * - Market-based value (PLZ average)
 * - Income-based value (target 4% yield)
 * - Break-even value (cashflow neutral)
 *
 * The final fair value is a weighted average of these approaches.
 *
 * @param sqm - Living area in square meters
 * @param annualRent - Monthly rent (will be converted to annual)
 * @param marketAvgPricePerSqm - Market average price per sqm from PLZ data
 * @param breakEvenPrice - Price at which cashflow would be zero
 * @param inputPrice - The actual/offered price (used for comparison, not calculation)
 * @returns Fair value calculation with multiple metrics
 */
export function calculateFairValue(
  sqm: number,
  annualRent: number,
  marketAvgPricePerSqm: number | null,
  breakEvenPrice: number | null,
  inputPrice: number
): FairValueCalculation {
  // A. Market-Based Value (40% weight)
  const marketValue = marketAvgPricePerSqm && sqm > 0
    ? marketAvgPricePerSqm * sqm
    : inputPrice; // Fallback to input price if no market data

  // B. Income-Based Value (40% weight)
  // Target yield: 4% for German residential real estate
  const targetYield = 0.04;
  const annualRentTotal = annualRent * 12;
  const yieldBasedValue = annualRentTotal > 0
    ? annualRentTotal / targetYield
    : marketValue; // Fallback to market value if no rent data

  // C. Break-Even Value (20% weight)
  // Maximum price for cashflow-neutral investment
  const breakEvenValue = breakEvenPrice && breakEvenPrice > 0
    ? breakEvenPrice
    : marketValue; // Fallback to market value if no break-even data

  // D. Weighted Fair Value
  // 40% market, 40% yield-based, 20% break-even
  const fairValue = Math.round(
    (marketValue * 0.4) +
    (yieldBasedValue * 0.4) +
    (breakEvenValue * 0.2)
  );

  // Calculate actual yield at input price
  const actualYield = inputPrice > 0 && annualRentTotal > 0
    ? annualRentTotal / inputPrice
    : 0;

  // Calculate value deviation: how much is input price over/under fair value
  const valueDeviation = fairValue > 0
    ? ((inputPrice - fairValue) / fairValue) * 100
    : 0;

  // Build reasoning
  let reasoning = `Fair Value ${formatCurrency(fairValue)} berechnet aus: `;
  reasoning += `Markt (${formatCurrency(marketValue)}, 40%), `;
  reasoning += `Rendite-Ziel 4% (${formatCurrency(yieldBasedValue)}, 40%), `;
  reasoning += `Break-Even (${formatCurrency(breakEvenValue)}, 20%). `;

  if (valueDeviation > 0) {
    reasoning += `Aktueller Preis liegt ${valueDeviation.toFixed(1)}% ÜBER Fair Value.`;
  } else if (valueDeviation < 0) {
    reasoning += `Aktueller Preis liegt ${Math.abs(valueDeviation).toFixed(1)}% unter Fair Value.`;
  } else {
    reasoning += `Aktueller Preis entspricht Fair Value.`;
  }

  return {
    fairValue,
    marketValue,
    yieldBasedValue,
    breakEvenValue,
    actualYield,
    valueDeviation,
    reasoning,
  };
}
