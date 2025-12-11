/**
 * Investment Evaluation Helper Functions
 * Utility functions for property investment evaluation
 */
import { openai } from './logger.js'./openai.js';
import {
  AI_CONFIG,
  SCORE_WEIGHTS,
  COLOR_RATING_THRESHOLDS,
  YIELD_THRESHOLDS,
  YIELD_SCORES,
  PRICE_THRESHOLDS,
  PRICE_SCORES,
  OPERATING_COSTS,
  FEATURES,
} from './logger.js'../constants/evaluation.js';
import { AIError, ErrorCode, logError } from './logger.js'./errors.js';
import type {
  Property,
  LocationAnalysis,
  AppreciationAnalysis,
  MarketPriceAnalysis,
  RentEstimation,
  FinancingTerms,
} from './logger.js'../types/investment-evaluation.js';

/**
 * Call OpenAI API with retry logic
 */
export async function callOpenAI<T>(prompt: string): Promise<T> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Immobilien-Investitions-Experte.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_CONFIG.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AIError('Keine Antwort von OpenAI erhalten', ErrorCode.AI_INVALID_RESPONSE);
    }

    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    logError(error as Error, { context: 'OpenAI API call failed' });
    throw new AIError('Fehler bei der AI-Analyse', ErrorCode.AI_API_ERROR);
  }
}

/**
 * Analyze location using AI
 */
export async function analyzeLocation(property: Property): Promise<LocationAnalysis> {
  const locationPrompt = `Du bist ein Immobilien-Investitions-Experte. Analysiere die LAGE dieser Immobilie aus Investorensicht.

Immobilie: ${property.title}
Adresse: ${property.address || 'Nicht angegeben'}
Lage: ${property.location}
Beschreibung: ${property.description}

Bewerte die Lage auf einer Skala von 0-100 basierend auf:
1. Infrastruktur (ÖPNV, Schulen, Ärzte, Einkaufsmöglichkeiten)
2. Nachbarschaft & Sicherheit
3. Entwicklungspotential der Region

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "score": 0-100,
  "reasoning": "Kurze Begründung (2-3 Sätze)",
  "infrastructure_rating": 0-100,
  "neighborhood_rating": 0-100,
  "development_potential": 0-100
}`;

  return await callOpenAI<LocationAnalysis>(locationPrompt);
}

/**
 * Analyze current market price using AI with current 2025 data
 */
export async function analyzeMarketPriceWithAI(property: Property): Promise<MarketPriceAnalysis> {
  const marketPricePrompt = `Du bist ein Immobilien-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

WICHTIG: Verwende AKTUELLE Immobilienpreise aus Dezember 2025 für diese spezifische Lage in Deutschland!

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${property.address || 'Nicht angegeben'}
Objekttyp: Wohnung
Größe: ${property.sqm} m²
Zimmer: ${property.rooms}
Baujahr: ${property.year_built || 'Unbekannt'}

Ermittle den AKTUELLEN durchschnittlichen Marktpreis pro m² für vergleichbare Immobilien in dieser spezifischen Lage im Dezember 2025.

Berücksichtige:
1. Aktuelle Kaufpreise in dieser konkreten Lage (${property.location})
2. Objekttyp und Zustand (Altbau/Neubau)
3. Aktuelle Markttrends 2025

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "average_price_per_sqm": <Zahl>, // Durchschnittlicher Marktpreis pro m² in EUR
  "price_range_min": <Zahl>, // Untere Preisspanne pro m²
  "price_range_max": <Zahl>, // Obere Preisspanne pro m²
  "reasoning": "Kurze Begründung mit Verweis auf aktuelle 2025 Marktpreise (2-3 Sätze)"
}`;

  return await callOpenAI<MarketPriceAnalysis>(marketPricePrompt);
}

/**
 * Generate comprehensive market analysis including rent and price justifications
 */
export async function generateComprehensiveMarketAnalysis(
  property: Property,
  rentEstimation: RentEstimation,
  marketPriceAnalysis: MarketPriceAnalysis
): Promise<string> {
  const marketAnalysisPrompt = `Du bist ein Immobilien-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

Erstelle eine umfassende MARKTANALYSE für diese Immobilie, die sowohl die Mietpreise als auch die Kaufpreise mit Begründungen analysiert.

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${property.address || 'Nicht angegeben'}
Größe: ${property.sqm} m²
Zimmer: ${property.rooms}
Baujahr: ${property.year_built || 'Unbekannt'}
Ausstattung: ${property.features?.join(', ') || 'Standard'}

AI-ERMITTELTE MARKTDATEN (Dezember 2025):
- Geschätzte Marktmiete: ${rentEstimation.estimated_monthly_rent.toLocaleString('de-DE')} €/Monat (${rentEstimation.estimated_rent_per_sqm.toLocaleString('de-DE')} €/m²)
- Durchschnittlicher Kaufpreis: ${marketPriceAnalysis.average_price_per_sqm.toLocaleString('de-DE')} €/m²
- Tatsächlicher Kaufpreis dieser Immobilie: ${(property.price / property.sqm).toFixed(0)} €/m²

WICHTIG: Erstelle eine KURZE, prägnante Marktanalyse in MAXIMAL 3 SÄTZEN!

Fokussiere dich auf:
1. Lage-Charakteristik und Mietpreis-Rechtfertigung
2. Kaufpreis-Rechtfertigung und Marktattraktivität
3. Wertsteigerungspotential

Beispiel-Struktur (3 Sätze):
"[Lage] ist eine [Beschreibung], die durch [Qualitäten] besticht. Die Mietpreise von [X €/m²] spiegeln [Nachfrage/Ausstattung] wider, die Kaufpreise von [Y €/m²] rechtfertigen sich durch [Marktentwicklung]. Das Wertsteigerungspotential ist [Bewertung], da [Begründung]."

Antworte NUR mit dem Text (MAX 3 SÄTZE), KEIN JSON!`;

  // Call OpenAI and get the text response directly
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: marketAnalysisPrompt
    }],
    temperature: AI_CONFIG.temperature,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Analyze appreciation potential using AI
 */
export async function analyzeAppreciation(property: Property): Promise<AppreciationAnalysis> {
  const appreciationPrompt = `Du bist ein Immobilien-Investitions-Experte. Analysiere das WERTSTEIGERUNGS-POTENTIAL dieser Immobilie.

Immobilie: ${property.title}
Lage: ${property.location}
Preis: ${property.price.toLocaleString('de-DE')} €
Baujahr: ${property.year_built || 'Unbekannt'}

Bewerte das Wertsteigerungs-Potential auf einer Skala von 0-100 basierend auf:
1. Regionale Marktentwicklung
2. Geplante Infrastrukturprojekte in der Region
3. Nachfrage-Trends

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "score": 0-100,
  "reasoning": "Kurze Begründung (2-3 Sätze)",
  "market_trend": "steigend" | "stabil" | "fallend",
  "growth_potential": 0-100
}`;

  return await callOpenAI<AppreciationAnalysis>(appreciationPrompt);
}

/**
 * Estimate current financing terms using AI with current 2025 market data
 */
export async function estimateFinancingTermsWithAI(): Promise<FinancingTerms> {
  const financingPrompt = `Du bist ein Immobilienfinanzierungs-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

Ermittle die AKTUELLSTEN Zinssätze für Immobilienfinanzierung in Deutschland (Dezember 2025) für:
- 90% Beleihungsauslauf (LTV)
- 80% Beleihungsauslauf (LTV)
- Zinsbindung: 10 Jahre
- Tilgung: 1% pro Jahr

Berücksichtige die aktuelle EZB-Politik, Marktsituation und Zinsentwicklung.

Erkläre in MAXIMAL 1 SATZ die aktuelle Zinssituation.

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "interest_rate_90": 4.1,
  "interest_rate_80": 3.8,
  "loan_to_value": 90,
  "amortization_rate": 1,
  "loan_term_years": 10,
  "reasoning": "Sehr kurze Erklärung in MAXIMAL 1 SATZ"
}`;

  return await callOpenAI<FinancingTerms>(financingPrompt);
}

/**
 * Calculate monthly loan payment using annuity formula
 */
export function calculateMonthlyLoanPayment(
  purchasePrice: number,
  ltv: number,
  annualInterestRate: number,
  amortizationRate: number
): number {
  const loanAmount = purchasePrice * (ltv / 100);
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const monthlyAmortizationRate = amortizationRate / 100 / 12;

  // Monthly payment = loan amount * (monthly interest rate + monthly amortization rate)
  const monthlyPayment = loanAmount * (monthlyInterestRate + monthlyAmortizationRate);

  return monthlyPayment;
}

/**
 * Estimate market rent using AI with current 2025 data
 */
export async function estimateRentWithAI(property: Property): Promise<RentEstimation> {
  const rentPrompt = `Du bist ein Immobilien-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

WICHTIG: Verwende AKTUELLE Mietpreise aus 2025, NICHT veraltete Daten!

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${property.address || 'Nicht angegeben'}
Größe: ${property.sqm} m²
Zimmer: ${property.rooms}
Baujahr: ${property.year_built || 'Unbekannt'}
Ausstattung: ${property.features?.join(', ') || 'Standard'}
Beschreibung: ${property.description}

Schätze die AKTUELLE MARKTMIETE für Dezember 2025 basierend auf:
1. Aktuelle Mietpreise in dieser spezifischen Lage (2025)
2. Zustand und Ausstattung der Immobilie
3. Größe und Zimmeranzahl
4. Aktuelle Markttrends 2025

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "estimated_rent_per_sqm": <Zahl>,
  "estimated_monthly_rent": <Zahl>,
  "reasoning": "Kurze Begründung mit Verweis auf aktuelle 2025 Marktdaten (2-3 Sätze)",
  "market_comparison": "Vergleich zum lokalen Durchschnitt"
}`;

  return await callOpenAI<RentEstimation>(rentPrompt);
}

/**
 * Calculate price score based on price per sqm
 */
export function calculatePriceScore(pricePerSqm: number): number {
  const { averagePricePerSqm, significantlyBelow, below, average, slightlyAbove, above } = PRICE_THRESHOLDS;
  const scores = PRICE_SCORES;

  if (pricePerSqm <= averagePricePerSqm * significantlyBelow) return scores.significantlyBelow;
  if (pricePerSqm <= averagePricePerSqm * below) return scores.below;
  if (pricePerSqm <= averagePricePerSqm * average) return scores.average;
  if (pricePerSqm <= averagePricePerSqm * slightlyAbove) return scores.slightlyAbove;
  if (pricePerSqm <= averagePricePerSqm * above) return scores.above;
  return scores.significantlyAbove;
}

/**
 * Calculate yield score based on gross yield percentage
 */
export function calculateYieldScore(grossYieldPercentage: number): number {
  const thresholds = YIELD_THRESHOLDS;
  const scores = YIELD_SCORES;

  if (grossYieldPercentage >= thresholds.excellent) return scores.excellent;
  if (grossYieldPercentage >= thresholds.veryGood) return scores.veryGood;
  if (grossYieldPercentage >= thresholds.good) return scores.good;
  if (grossYieldPercentage >= thresholds.moderate) return scores.moderate;
  if (grossYieldPercentage >= thresholds.low) return scores.low;
  return scores.veryLow;
}

/**
 * Calculate features score
 */
export function calculateFeaturesScore(features: string[]): number {
  const { desirableFeatures, scoreMultiplier, maxScore } = FEATURES;

  const matchedFeatures = features.filter((f) =>
    desirableFeatures.some(df => f.toLowerCase().includes(df.toLowerCase()))
  );

  return Math.min(maxScore, (matchedFeatures.length / desirableFeatures.length) * 100 * scoreMultiplier);
}

/**
 * Generate highlights and red flags using AI
 */
export async function generateHighlightsAndRedFlags(
  property: Property,
  locationAnalysis: LocationAnalysis,
  appreciationAnalysis: AppreciationAnalysis,
  rentEstimation: RentEstimation,
  marketPriceAnalysis: MarketPriceAnalysis,
  grossYieldPercentage: number,
  pricePerSqm: number,
  overallScore: number
): Promise<{ highlights: string[]; red_flags: string[] }> {
  const prompt = `Du bist ein Immobilien-Investitions-Experte. Erstelle eine prägnante Liste von HIGHLIGHTS (positive Aspekte) und ZU BEACHTEN (Warnsignale/Red Flags) für diese Immobilie aus Investorensicht.

Immobilie: ${property.title}
Lage: ${property.location}
Preis: ${property.price.toLocaleString('de-DE')} €
Größe: ${property.sqm} m²
Zimmer: ${property.rooms}
Preis pro m²: ${pricePerSqm.toFixed(0)} €/m²
Marktpreis: ${marketPriceAnalysis.average_price_per_sqm.toFixed(0)} €/m²

BEWERTUNG:
- Gesamtscore: ${overallScore}/100
- Lage-Score: ${locationAnalysis.score}/100
- Wertsteigerungs-Potential: ${appreciationAnalysis.score}/100 (Trend: ${appreciationAnalysis.market_trend})
- Geschätzte Marktmiete: ${rentEstimation.estimated_monthly_rent.toLocaleString('de-DE')} €/Monat
- Bruttorendite: ${grossYieldPercentage.toFixed(2)}%

Ausstattung: ${property.features?.join(', ') || 'Standard'}
Baujahr: ${property.year_built || 'Unbekannt'}

Erstelle:
1. HIGHLIGHTS (3-5 kurze, prägnante Stichpunkte über die POSITIVEN Aspekte der Investition)
2. ZU BEACHTEN (2-4 kurze, prägnante Stichpunkte über RISIKEN oder Nachteile)

WICHTIG:
- Jeder Punkt sollte MAXIMAL 6-8 Wörter haben
- Sei konkret und zahlenbasiert wo möglich
- Fokus auf Investment-Perspektive

Beispiele für gute Highlights:
- "Attraktiver Preis 15% unter Marktwert"
- "Top-Lage mit hervorragender Anbindung"
- "Hohe Bruttorendite von 4,8%"
- "Starkes Wertsteigerungspotential"

Beispiele für gute Red Flags:
- "Preis 20% über regionalem Durchschnitt"
- "Niedrige Rendite unter 3%"
- "Renovierungsbedarf nicht kalkuliert"
- "Rückläufige Marktentwicklung in der Region"

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "highlights": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "red_flags": ["Punkt 1", "Punkt 2"]
}`;

  return await callOpenAI<{ highlights: string[]; red_flags: string[] }>(prompt);
}

/**
 * Calculate overall investment score
 */
export function calculateOverallScore(
  locationScore: number,
  priceScore: number,
  yieldScore: number,
  appreciationScore: number,
  featuresScore: number
): number {
  return Math.round(
    locationScore * SCORE_WEIGHTS.location +
    priceScore * SCORE_WEIGHTS.price +
    yieldScore * SCORE_WEIGHTS.yield +
    appreciationScore * SCORE_WEIGHTS.appreciation +
    featuresScore * SCORE_WEIGHTS.features
  );
}

/**
 * Determine color rating from './logger.js'verall score
 */
export function determineColorRating(overallScore: number): 'green' | 'yellow' | 'red' {
  if (overallScore >= COLOR_RATING_THRESHOLDS.green) {
    return 'green'; // Excellent investment
  } else if (overallScore >= COLOR_RATING_THRESHOLDS.yellow) {
    return 'yellow'; // Moderate investment
  } else {
    return 'red'; // Risky investment
  }
}

/**
 * Calculate operating costs estimates
 */
export function calculateOperatingCosts(sqm: number): {
  estimatedHausgeld: number;
  estimatedMaintenance: number;
} {
  return {
    estimatedHausgeld: sqm * OPERATING_COSTS.hausgeldPerSqm,
    estimatedMaintenance: sqm * OPERATING_COSTS.maintenancePerSqm,
  };
}

/**
 * Calculate yield metrics
 */
export function calculateYieldMetrics(
  estimatedMonthlyRent: number,
  estimatedHausgeld: number,
  estimatedMaintenance: number,
  purchasePrice: number,
  monthlyCashflow: number,
  equityAmount: number
): {
  annualRent: number;
  grossYieldPercentage: number;
  netYieldPercentage: number;
  equityReturnPercentage: number;
} {
  const annualRent = estimatedMonthlyRent * 12;
  const grossYieldPercentage = (annualRent / purchasePrice) * 100;

  const annualNetIncome = (estimatedMonthlyRent - estimatedHausgeld - estimatedMaintenance) * 12;
  const netYieldPercentage = (annualNetIncome / purchasePrice) * 100;

  const annualCashflow = monthlyCashflow * 12;
  const equityReturnPercentage = equityAmount > 0 ? (annualCashflow / equityAmount) * 100 : 0;

  return {
    annualRent,
    grossYieldPercentage,
    netYieldPercentage,
    equityReturnPercentage,
  };
}
