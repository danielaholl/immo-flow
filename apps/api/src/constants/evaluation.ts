/**
 * Property Evaluation Constants
 * Centralized magic numbers for property investment evaluation
 */

/**
 * Score calculation weights (must sum to 1.0)
 */
export const SCORE_WEIGHTS = {
  location: 0.30,     // 30% - Most important factor
  price: 0.25,        // 25% - Price competitiveness
  yield: 0.25,        // 25% - Rental yield
  appreciation: 0.15, // 15% - Growth potential
  features: 0.05,     // 5% - Amenities and features
} as const;

/**
 * Color rating breakpoints (0-100 scale)
 */
export const COLOR_RATING_THRESHOLDS = {
  green: 70,   // Excellent investment (>= 70)
  yellow: 40,  // Moderate investment (40-69)
  // red: < 40 - Risky investment
} as const;

/**
 * Gross yield percentage thresholds
 */
export const YIELD_THRESHOLDS = {
  excellent: 5.0,   // >= 5% - Excellent yield (score: 100)
  veryGood: 4.0,    // >= 4% - Very good yield (score: 85)
  good: 3.0,        // >= 3% - Good yield (score: 70)
  moderate: 2.5,    // >= 2.5% - Moderate yield (score: 50)
  low: 2.0,         // >= 2% - Low yield (score: 30)
  // < 2% - Very low yield (score: 10)
} as const;

/**
 * Yield scores by threshold
 */
export const YIELD_SCORES = {
  excellent: 100,
  veryGood: 85,
  good: 70,
  moderate: 50,
  low: 30,
  veryLow: 10,
} as const;

/**
 * Price per sqm thresholds (based on German average)
 */
export const PRICE_THRESHOLDS = {
  averagePricePerSqm: 4000,  // Average price per m² in Germany
  // Price multipliers for scoring
  significantlyBelow: 0.7,   // <= 70% of average (score: 100)
  below: 0.85,               // <= 85% of average (score: 85)
  average: 1.0,              // <= 100% of average (score: 70)
  slightlyAbove: 1.15,       // <= 115% of average (score: 50)
  above: 1.3,                // <= 130% of average (score: 30)
  // > 130% - Significantly above average (score: 10)
} as const;

/**
 * Price scores by threshold
 */
export const PRICE_SCORES = {
  significantlyBelow: 100,
  below: 85,
  average: 70,
  slightlyAbove: 50,
  above: 30,
  significantlyAbove: 10,
} as const;

/**
 * Operating cost estimates (per sqm)
 */
export const OPERATING_COSTS = {
  hausgeldPerSqm: 2,     // 2 EUR/m² for monthly fees
  maintenancePerSqm: 1,  // 1 EUR/m² for maintenance reserve
} as const;

/**
 * Features scoring
 */
export const FEATURES = {
  desirableFeatures: [
    'Balkon',
    'Terrasse',
    'Garten',
    'Aufzug',
    'Parkplatz',
    'Garage',
    'Fußbodenheizung',
    'Smart Home',
    'Neubau',
    'barrierefrei',
  ],
  scoreMultiplier: 1.5, // Multiply matched features percentage by 1.5
  maxScore: 100,
} as const;

/**
 * AI model configuration
 */
export const AI_CONFIG = {
  temperature: 0.7,          // Temperature for most AI calls
  factualTemperature: 0.3,   // Lower temperature for factual responses
  maxTokens: 2048,           // Max tokens for AI responses
} as const;

/**
 * Screenshot analysis configuration
 */
export const SCREENSHOT_CONFIG = {
  batchSize: 3,              // Process 3 screenshots at a time
  batchDelayMs: 1000,        // 1 second delay between batches
  maxTextLength: 8000,       // Max text length from expose
  imageDetailLevel: 'high',  // High resolution for OCR
} as const;

/**
 * Database limits
 */
export const DB_LIMITS = {
  descriptionMaxLength: 1500, // Max description length in property context
} as const;
