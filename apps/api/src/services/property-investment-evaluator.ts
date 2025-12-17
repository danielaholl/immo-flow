/**
 * Property Investment Evaluator Service
 * AI-powered property evaluation from investor perspective
 * Evaluates: Location, Price, Yield, Appreciation, Features
 */
import { query, queryOne } from '../db.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  price: number;
  rooms: number;
  sqm: number;
  features?: string[];
  year_built?: number;
}

interface LocationAnalysis {
  score: number; // 0-100
  reasoning: string;
  infrastructure_rating: number;
  neighborhood_rating: number;
  development_potential: number;
}

interface AppreciationAnalysis {
  score: number; // 0-100
  reasoning: string;
  market_trend: 'steigend' | 'stabil' | 'fallend';
  growth_potential: number;
}

interface MarketPriceAnalysis {
  average_price_per_sqm: number; // Current market average price per sqm
  price_range_min: number; // Lower range
  price_range_max: number; // Upper range
  negotiation_price: number; // Realistic negotiation target price (total)
  negotiation_discount_percent: number; // Expected discount in %
  negotiation_reasoning: string; // Why this discount is achievable
  reasoning: string;
}

interface RentEstimation {
  estimated_rent_per_sqm: number;
  estimated_monthly_rent: number;
  reasoning: string;
  market_comparison: string;
}

interface FinancingTerms {
  interest_rate?: number; // Annual interest rate in % (deprecated, use interest_rate_90 or interest_rate_80)
  interest_rate_90?: number; // Interest rate for 90% LTV
  interest_rate_80?: number; // Interest rate for 80% LTV
  loan_to_value: number; // LTV in % (e.g., 90)
  amortization_rate: number; // Tilgung in % (e.g., 1)
  loan_term_years: number; // Loan term in years
  reasoning: string;
}

export interface InvestmentEvaluationResult {
  overall_score: number;
  color_rating: 'green' | 'yellow' | 'red';
  location_score: number;
  price_score: number;
  yield_score: number;
  appreciation_score: number;
  features_score: number;
  price_per_sqm: number;
  estimated_monthly_rent: number;
  estimated_market_rent_per_sqm: number;
  annual_rent: number;
  gross_yield_percentage: number;
}

/**
 * Call OpenAI API with retry logic
 * Uses centralized master prompt with investor context
 */
async function callOpenAI<T>(prompt: string, additionalSystemInstructions?: string): Promise<T> {
  try {
    const openai = getOpenAIClient();
    const systemPrompt = buildSystemPrompt('investor', additionalSystemInstructions);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten');
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Fehler bei der AI-Analyse');
  }
}

/**
 * Analyze location using AI
 */
async function analyzeLocation(property: Property): Promise<LocationAnalysis> {
  const locationPrompt = `Du bist ein Immobilien-Investitions-Experte. Analysiere die LAGE dieser Immobilie aus Investorensicht.

Immobilie: ${property.title}
Adresse: ${(property as any).full_address || 'Nicht angegeben'}
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
async function analyzeMarketPriceWithAI(property: Property): Promise<MarketPriceAnalysis> {
  const marketPricePrompt = `Es ist DEZEMBER 2025. Du analysierst diese Immobilie für einen Kaufinteressenten.

WICHTIG: Verwende AKTUELLE Immobilienpreise aus Dezember 2025 für diese spezifische Lage in Deutschland!

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${(property as any).full_address || 'Nicht angegeben'}
Objekttyp: Wohnung
Größe: ${property.sqm} m²
Zimmer: ${property.rooms}
Baujahr: ${property.year_built || 'Unbekannt'}
ANGEBOTSPREIS: ${property.price.toLocaleString('de-DE')} € (${Math.round(property.price / property.sqm).toLocaleString('de-DE')} €/m²)

AUFGABE 1: Ermittle den AKTUELLEN durchschnittlichen Marktpreis pro m² für vergleichbare Immobilien.

AUFGABE 2: Ermittle einen REALISTISCHEN VERHANDLUNGSPREIS.
Als erfahrener Investor weißt du, dass fast jeder Preis verhandelbar ist. Berücksichtige:
- Wie lange ist das Objekt schon inseriert? (Längere Zeit = mehr Verhandlungsspielraum)
- Liegt der Preis über oder unter dem Marktwert?
- Aktuelle Marktlage (Käufer- oder Verkäufermarkt?)
- Typische Verhandlungsspielräume in dieser Region (meist 5-15%)
- Besondere Umstände (Sanierungsbedarf, Leerstand, etc.)

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "average_price_per_sqm": <Zahl>,
  "price_range_min": <Zahl>,
  "price_range_max": <Zahl>,
  "negotiation_price": <Zahl>, // Realistischer Zielpreis nach Verhandlung (Gesamtpreis in EUR)
  "negotiation_discount_percent": <Zahl>, // Erwarteter Rabatt in % (z.B. 8 für 8%)
  "negotiation_reasoning": "Begründung warum dieser Verhandlungspreis realistisch ist (1-2 Sätze)",
  "reasoning": "Kurze Begründung für Marktpreise (1-2 Sätze)"
}`;

  return await callOpenAI<MarketPriceAnalysis>(marketPricePrompt);
}

/**
 * Generate comprehensive market analysis including rent and price justifications
 */
async function generateComprehensiveMarketAnalysis(
  property: Property,
  rentEstimation: RentEstimation,
  marketPriceAnalysis: MarketPriceAnalysis
): Promise<string> {
  const marketAnalysisPrompt = `Du bist ein Immobilien-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

Erstelle eine umfassende MARKTANALYSE für diese Immobilie, die sowohl die Mietpreise als auch die Kaufpreise mit Begründungen analysiert.

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${(property as any).full_address || 'Nicht angegeben'}
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
  const systemPrompt = buildSystemPrompt('investor');
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: marketAnalysisPrompt,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Analyze appreciation potential using AI
 */
async function analyzeAppreciation(property: Property): Promise<AppreciationAnalysis> {
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
async function estimateFinancingTermsWithAI(): Promise<FinancingTerms> {
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
function calculateMonthlyLoanPayment(
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
async function estimateRentWithAI(property: Property): Promise<RentEstimation> {
  const rentPrompt = `Du bist ein Immobilien-Experte mit Zugang zu aktuellen Marktdaten. Es ist DEZEMBER 2025.

WICHTIG: Verwende AKTUELLE Mietpreise aus 2025, NICHT veraltete Daten!

Immobilie: ${property.title}
Lage: ${property.location}
Adresse: ${(property as any).full_address || 'Nicht angegeben'}
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
function calculatePriceScore(pricePerSqm: number): number {
  // Average price per sqm in Germany: ~3000-5000 € (varies by location)
  const avgPricePerSqm = 4000;

  if (pricePerSqm <= avgPricePerSqm * 0.7) return 100; // Significantly below average
  if (pricePerSqm <= avgPricePerSqm * 0.85) return 85; // Below average
  if (pricePerSqm <= avgPricePerSqm) return 70; // At average
  if (pricePerSqm <= avgPricePerSqm * 1.15) return 50; // Slightly above average
  if (pricePerSqm <= avgPricePerSqm * 1.3) return 30; // Above average
  return 10; // Significantly above average
}

/**
 * Calculate yield score based on gross yield percentage
 */
function calculateYieldScore(grossYieldPercentage: number): number {
  if (grossYieldPercentage >= 5) return 100; // Excellent yield
  if (grossYieldPercentage >= 4) return 85; // Very good yield
  if (grossYieldPercentage >= 3) return 70; // Good yield
  if (grossYieldPercentage >= 2.5) return 50; // Moderate yield
  if (grossYieldPercentage >= 2) return 30; // Low yield
  return 10; // Very low yield
}

/**
 * Calculate features score
 */
function calculateFeaturesScore(features: string[]): number {
  const desirableFeatures = [
    'Balkon', 'Terrasse', 'Garten', 'Aufzug', 'Parkplatz',
    'Garage', 'Fußbodenheizung', 'Smart Home', 'Neubau', 'barrierefrei',
  ];

  const matchedFeatures = features.filter((f) =>
    desirableFeatures.some(df => f.toLowerCase().includes(df.toLowerCase()))
  );

  return Math.min(100, (matchedFeatures.length / desirableFeatures.length) * 100 * 1.5);
}

/**
 * Generate highlights and red flags using AI
 */
async function generateHighlightsAndRedFlags(
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
2. ZU BEACHTEN (2-4 ausführliche Sätze über RISIKEN oder Nachteile mit konkreter Begründung)

WICHTIG:
- Highlights: MAXIMAL 6-8 Wörter pro Punkt
- Red Flags: Ausführliche Sätze (15-25 Wörter) mit konkreter Erklärung WARUM es ein Risiko ist
- Sei konkret und zahlenbasiert wo möglich
- Fokus auf Investment-Perspektive

Beispiele für gute Highlights:
- "Attraktiver Preis 15% unter Marktwert"
- "Top-Lage mit hervorragender Anbindung"
- "Hohe Bruttorendite von 4,8%"
- "Starkes Wertsteigerungspotential"

Beispiele für gute Red Flags (ausführlich mit Begründung):
- "Der Kaufpreis liegt 20% über dem regionalen Durchschnitt, was die Rendite erheblich schmälert und einen Wiederverkauf erschweren könnte."
- "Die Bruttorendite von nur 2,8% liegt deutlich unter dem Marktdurchschnitt von 4%, wodurch sich die Investition erst nach vielen Jahren amortisiert."
- "Aufgrund des Baujahrs 1965 ist mittelfristig mit erhöhtem Sanierungsbedarf zu rechnen, insbesondere bei Heizung und Fassade."
- "Die stagnierende Bevölkerungsentwicklung in dieser Region könnte langfristig zu sinkender Nachfrage und Wertverlust führen."

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "highlights": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "red_flags": ["Punkt 1", "Punkt 2"]
}`;

  return await callOpenAI<{ highlights: string[]; red_flags: string[] }>(prompt);
}


/**
 * Main evaluation function
 */
export async function evaluatePropertyInvestment(
  propertyId: string
): Promise<InvestmentEvaluationResult> {
  // Fetch property data
  const property = await queryOne<Property>(
    `SELECT id, title, description, location,
     NULLIF(CONCAT_WS(', ', street_address, CONCAT_WS(' ', postal_code, location)), '') as full_address,
     price, rooms, sqm, features, year_built
     FROM properties WHERE id = $1`,
    [propertyId]
  );

  if (!property) {
    throw new Error('Property not found');
  }

  console.log('Evaluating property:', property.title);

  // 1. AI-POWERED LOCATION ANALYSIS (30%)
  const locationAnalysis = await analyzeLocation(property);

  // 2. AI-POWERED APPRECIATION ANALYSIS (15%)
  const appreciationAnalysis = await analyzeAppreciation(property);

  // 3. AI-POWERED RENT ESTIMATION
  const rentEstimation = await estimateRentWithAI(property);

  // 3b. AI-POWERED MARKET PRICE ANALYSIS
  const marketPriceAnalysis = await analyzeMarketPriceWithAI(property);

  // 3c. GENERATE COMPREHENSIVE MARKET ANALYSIS
  const comprehensiveMarketAnalysis = await generateComprehensiveMarketAnalysis(
    property,
    rentEstimation,
    marketPriceAnalysis
  );

  // 4. RULE-BASED PRICE ANALYSIS (25%)
  const pricePerSqm = property.price / property.sqm;
  const marketAveragePricePerSqm = marketPriceAnalysis.average_price_per_sqm;
  const priceScore = calculatePriceScore(pricePerSqm);

  // 5. YIELD ANALYSIS (25%) - based on AI rent estimation
  const estimatedMonthlyRent = rentEstimation.estimated_monthly_rent;
  const estimatedMarketRentPerSqm = rentEstimation.estimated_rent_per_sqm;

  const annualRent = estimatedMonthlyRent * 12;
  const grossYieldPercentage = (annualRent / property.price) * 100;
  const yieldScore = calculateYieldScore(grossYieldPercentage);

  // 6. RULE-BASED FEATURES ANALYSIS (5%)
  const features = property.features || [];
  const featuresScore = calculateFeaturesScore(features);

  // 7. AI-POWERED FINANCING TERMS & CASHFLOW CALCULATION
  const financingTerms = await estimateFinancingTermsWithAI();

  // Use interest_rate_90 if available, otherwise fallback to interest_rate for backward compatibility
  const interestRate = financingTerms.interest_rate_90 || financingTerms.interest_rate || 4.0;

  // Calculate monthly loan payment
  const monthlyLoanPayment = calculateMonthlyLoanPayment(
    property.price,
    financingTerms.loan_to_value,
    interestRate,
    financingTerms.amortization_rate
  );

  // Estimate operating costs (Hausgeld & Maintenance)
  // Conservative estimates: 2 EUR/sqm for Hausgeld, 1 EUR/sqm for maintenance
  const estimatedHausgeld = property.sqm * 2;
  const estimatedMaintenance = property.sqm * 1;

  // Calculate monthly cashflow
  const monthlyCashflow = estimatedMonthlyRent - estimatedHausgeld - estimatedMaintenance - monthlyLoanPayment;

  // Calculate net yield (Nettomietrendite) and equity return (EK-Rendite)
  const annualNetIncome = (estimatedMonthlyRent - estimatedHausgeld - estimatedMaintenance) * 12;
  const netYieldPercentage = (annualNetIncome / property.price) * 100;

  const equityAmount = property.price * (1 - financingTerms.loan_to_value / 100);
  const annualCashflow = monthlyCashflow * 12;
  const equityReturnPercentage = equityAmount > 0 ? (annualCashflow / equityAmount) * 100 : 0;

  // 8. CALCULATE OVERALL SCORE
  const weights = {
    location: 0.30,
    price: 0.25,
    yield: 0.25,
    appreciation: 0.15,
    features: 0.05,
  };

  const overallScore = Math.round(
    locationAnalysis.score * weights.location +
    priceScore * weights.price +
    yieldScore * weights.yield +
    appreciationAnalysis.score * weights.appreciation +
    featuresScore * weights.features
  );

  // Determine color rating
  let colorRating: 'green' | 'yellow' | 'red';
  if (overallScore >= 70) {
    colorRating = 'green'; // Excellent investment
  } else if (overallScore >= 40) {
    colorRating = 'yellow'; // Moderate investment
  } else {
    colorRating = 'red'; // Risky investment
  }

  // 9. GENERATE HIGHLIGHTS AND RED FLAGS
  console.log('Generating highlights and red flags...');
  const { highlights, red_flags } = await generateHighlightsAndRedFlags(
    property,
    locationAnalysis,
    appreciationAnalysis,
    rentEstimation,
    marketPriceAnalysis,
    grossYieldPercentage,
    pricePerSqm,
    overallScore
  );
  console.log('Generated highlights:', highlights);
  console.log('Generated red flags:', red_flags);

  // 7. SAVE TO DATABASE
  const evaluationData = {
    property_id: propertyId,
    overall_score: overallScore,
    color_rating: colorRating,
    location_score: Math.round(locationAnalysis.score),
    price_score: Math.round(priceScore),
    yield_score: Math.round(yieldScore),
    appreciation_score: Math.round(appreciationAnalysis.score),
    features_score: Math.round(featuresScore),
    ai_reasoning: comprehensiveMarketAnalysis, // Only comprehensive market analysis (includes location)
    market_analysis: comprehensiveMarketAnalysis,
    rent_analysis: rentEstimation.reasoning,
    financing_analysis: financingTerms.reasoning,
    estimated_monthly_rent: estimatedMonthlyRent,
    estimated_yearly_rent: annualRent,
    gross_yield_percentage: grossYieldPercentage,
    price_per_sqm: pricePerSqm,
    market_average_price_per_sqm: marketAveragePricePerSqm,
    interest_rate_90: financingTerms.interest_rate_90,
    interest_rate_80: financingTerms.interest_rate_80,
    ai_model: 'gpt-4o',
    evaluation_version: '2.1', // Updated: Removed separate location_analysis
  };

  // Save to property_ai_evaluations table
  await queryOne(
    `INSERT INTO property_ai_evaluations (
      property_id, overall_score, color_rating, location_score, price_score,
      yield_score, appreciation_score, features_score, ai_reasoning,
      market_analysis, rent_analysis, financing_analysis,
      estimated_monthly_rent, estimated_yearly_rent, gross_yield_percentage,
      price_per_sqm, market_average_price_per_sqm, interest_rate_90, interest_rate_80,
      ai_model, evaluation_version
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    ON CONFLICT (property_id)
    DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      color_rating = EXCLUDED.color_rating,
      location_score = EXCLUDED.location_score,
      price_score = EXCLUDED.price_score,
      yield_score = EXCLUDED.yield_score,
      appreciation_score = EXCLUDED.appreciation_score,
      features_score = EXCLUDED.features_score,
      ai_reasoning = EXCLUDED.ai_reasoning,
      market_analysis = EXCLUDED.market_analysis,
      rent_analysis = EXCLUDED.rent_analysis,
      financing_analysis = EXCLUDED.financing_analysis,
      estimated_monthly_rent = EXCLUDED.estimated_monthly_rent,
      estimated_yearly_rent = EXCLUDED.estimated_yearly_rent,
      gross_yield_percentage = EXCLUDED.gross_yield_percentage,
      price_per_sqm = EXCLUDED.price_per_sqm,
      market_average_price_per_sqm = EXCLUDED.market_average_price_per_sqm,
      interest_rate_90 = EXCLUDED.interest_rate_90,
      interest_rate_80 = EXCLUDED.interest_rate_80,
      ai_model = EXCLUDED.ai_model,
      evaluation_version = EXCLUDED.evaluation_version,
      created_at = NOW()`,
    [
      evaluationData.property_id,
      evaluationData.overall_score,
      evaluationData.color_rating,
      evaluationData.location_score,
      evaluationData.price_score,
      evaluationData.yield_score,
      evaluationData.appreciation_score,
      evaluationData.features_score,
      evaluationData.ai_reasoning,
      evaluationData.market_analysis,
      evaluationData.rent_analysis,
      evaluationData.financing_analysis,
      evaluationData.estimated_monthly_rent,
      evaluationData.estimated_yearly_rent,
      evaluationData.gross_yield_percentage,
      evaluationData.price_per_sqm,
      evaluationData.market_average_price_per_sqm,
      evaluationData.interest_rate_90,
      evaluationData.interest_rate_80,
      evaluationData.ai_model,
      evaluationData.evaluation_version,
    ]
  );

  // Update properties table with score, detailed evaluation, highlights and red flags
  await query(
    `UPDATE properties
     SET ai_investment_score = $1,
         score_color = $2,
         score_breakdown = $3,
         score_calculated_at = NOW(),
         ai_detailed_evaluation = $4,
         highlights = $5,
         red_flags = $6,
         buyer_evaluation = $8
     WHERE id = $7`,
    [
      overallScore,
      colorRating,
      JSON.stringify({
        location: Math.round(locationAnalysis.score),
        price: Math.round(priceScore),
        yield: Math.round(yieldScore),
        appreciation: Math.round(appreciationAnalysis.score),
        features: Math.round(featuresScore),
      }),
      JSON.stringify({
        rental_income: {
          // AI-geschätzte Marktmiete (nicht IST-Miete!)
          monthly_rent: estimatedMonthlyRent,
          rent_per_sqm: estimatedMarketRentPerSqm,
          estimated_market_rent: estimatedMarketRentPerSqm,
          annual_rent: annualRent,
        },
        yield_metrics: {
          brutto_rendite: grossYieldPercentage,
          netto_rendite: netYieldPercentage,
          ek_rendite: equityReturnPercentage,
          faktor: property.price / annualRent,
          monthly_cashflow: monthlyCashflow,
        },
        cashflow_calculation: {
          rental_income: estimatedMonthlyRent,
          non_transferable_fee: estimatedHausgeld,
          maintenance_reserve: estimatedMaintenance,
          loan_payment: monthlyLoanPayment,
          loan_details: `(${financingTerms.loan_to_value}% LTV, ${interestRate.toFixed(2)}%, ${financingTerms.amortization_rate}% Tilgung, ${financingTerms.loan_term_years} Jahre)`,
          monthly_cashflow: monthlyCashflow,
        },
        financing_terms: {
          interest_rate: interestRate,
          interest_rate_90: financingTerms.interest_rate_90,
          interest_rate_80: financingTerms.interest_rate_80,
          loan_to_value: financingTerms.loan_to_value,
          amortization_rate: financingTerms.amortization_rate,
          loan_term_years: financingTerms.loan_term_years,
          reasoning: financingTerms.reasoning,
        },
        market_price_analysis: {
          average_price_per_sqm: marketAveragePricePerSqm,
          price_range_min: marketPriceAnalysis.price_range_min,
          price_range_max: marketPriceAnalysis.price_range_max,
          reasoning: marketPriceAnalysis.reasoning,
        },
        evaluation: {
          location_score: Math.round(locationAnalysis.score),
          price_score: Math.round(priceScore),
          yield_score: Math.round(yieldScore),
          appreciation_score: Math.round(appreciationAnalysis.score),
          features_score: Math.round(featuresScore),
          price_per_sqm: pricePerSqm,
          market_average_price_per_sqm: marketAveragePricePerSqm,
          estimated_monthly_rent: estimatedMonthlyRent,
          gross_yield_percentage: grossYieldPercentage,
        },
      }),
      highlights,
      red_flags,
      propertyId,
      // buyer_evaluation for AIEvaluationPanel
      JSON.stringify({
        buyer_investor: {
          viewType: 'buyer_investor',
          investmentScore: overallScore,
          grossYield: grossYieldPercentage,
          netYield: netYieldPercentage,
          monthlyBudget: monthlyCashflow,
          rentMultiplier: annualRent > 0 ? property.price / annualRent : 0,
          microLocation: locationAnalysis.reasoning.substring(0, 100),
          microLocationTrend: appreciationAnalysis.market_trend,
          riskLevel: overallScore >= 70 ? 'niedrig' : overallScore >= 50 ? 'mittel' : 'hoch',
          riskFactors: red_flags.slice(0, 3),
          summary: `Investmentbewertung: ${overallScore}/100 mit ${grossYieldPercentage.toFixed(1)}% Bruttorendite.`,
          strengths: highlights.slice(0, 5),
          weaknesses: red_flags.slice(0, 5),
          // Verhandlungspreis
          negotiationPrice: marketPriceAnalysis.negotiation_price,
          negotiationDiscount: marketPriceAnalysis.negotiation_discount_percent,
          negotiationReasoning: marketPriceAnalysis.negotiation_reasoning,
        },
      }),
    ]
  );

  console.log('✅ Property evaluation completed:', {
    propertyId,
    overallScore,
    colorRating,
  });

  return {
    overall_score: overallScore,
    color_rating: colorRating,
    location_score: Math.round(locationAnalysis.score),
    price_score: Math.round(priceScore),
    yield_score: Math.round(yieldScore),
    appreciation_score: Math.round(appreciationAnalysis.score),
    features_score: Math.round(featuresScore),
    price_per_sqm: pricePerSqm,
    estimated_monthly_rent: estimatedMonthlyRent,
    estimated_market_rent_per_sqm: estimatedMarketRentPerSqm,
    annual_rent: annualRent,
    gross_yield_percentage: grossYieldPercentage,
  };
}
