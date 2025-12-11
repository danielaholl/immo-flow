/**
 * AI Property Analyzer Service
 * Uses OpenAI to analyze properties and provide investment ratings
 */
import OpenAI from 'openai';
import { ScrapedPropertyData } from './property-scraper.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('property-ai-analyzer');

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export type AIRating = 'top_deal' | 'good' | 'average' | 'poor' | 'avoid';

export interface PropertyAnalysis {
  aiRating: AIRating;
  aiRatingExplanation: string;
  investmentScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  // Financial data
  estimatedRent?: number; // Estimated monthly rent
  estimatedOperatingCosts?: number; // Monthly operating costs (Nebenkosten, Hausgeld)
  estimatedMaintenanceCosts?: number; // Monthly maintenance reserve
}

/**
 * Analyze property using AI and generate rating
 */
export async function analyzeProperty(
  propertyData: ScrapedPropertyData
): Promise<PropertyAnalysis> {
  try {
    // Calculate price per sqm for context
    const pricePerSqm = propertyData.price / propertyData.sqm;

    // Build prompt for AI analysis
    const prompt = `Analysiere diese Immobilie als Investment und bewerte sie:

IMMOBILIE:
- Titel: ${propertyData.title}
- Preis: ${propertyData.price.toLocaleString('de-DE')} €
- Fläche: ${propertyData.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(2)} €/m²
- Zimmer: ${propertyData.rooms}
- Ort: ${propertyData.location}
${propertyData.yearBuilt ? `- Baujahr: ${propertyData.yearBuilt}` : ''}
${propertyData.condition ? `- Zustand: ${propertyData.condition}` : ''}
${propertyData.monthlyFee ? `- Hausgeld: ${propertyData.monthlyFee} €/Monat` : ''}
${propertyData.features.length > 0 ? `- Ausstattung: ${propertyData.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${propertyData.description.substring(0, 1000)}

AUFGABE:
Bewerte diese Immobilie als Investment-Objekt. Berücksichtige:
- Preis-Leistungs-Verhältnis
- Lage und Marktpotential
- Zustand und Renovierungsbedarf
- Mietrendite-Potential
- Wertsteigerungspotential
- Risiken und Red Flags

Antworte im folgenden JSON-Format:
{
  "rating": "top_deal" | "good" | "average" | "poor" | "avoid",
  "investmentScore": 0-100,
  "explanation": "Kurze Zusammenfassung der Bewertung (2-3 Sätze)",
  "strengths": ["Stärke 1", "Stärke 2", ...],
  "weaknesses": ["Schwäche 1", "Schwäche 2", ...],
  "opportunities": ["Chance 1", "Chance 2", ...],
  "risks": ["Risiko 1", "Risiko 2", ...],
  "estimatedRent": (Geschätzte monatliche Kaltmiete in Euro),
  "estimatedOperatingCosts": (Geschätzte monatliche Nebenkosten + Hausgeld in Euro),
  "estimatedMaintenanceCosts": (Geschätzte monatliche Rücklage für Instandhaltung in Euro, ca. 1€/m² pro Monat)
}

BEWERTUNGSKRITERIEN:
- top_deal: Außergewöhnlich gutes Investment, deutlich unter Marktwert, hohe Rendite
- good: Gutes Investment mit solidem Potential
- average: Durchschnittliches Investment, Marktkonform
- poor: Überteuert oder mit erheblichen Mängeln
- avoid: Finger weg! Gravierende Probleme oder stark überteuert`;

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Immobilien-Investment-Analyst, der Immobilien objektiv und kritisch bewertet.',
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

    const analysis = JSON.parse(content);

    // Validate and normalize the response
    return {
      aiRating: normalizeRating(analysis.rating),
      aiRatingExplanation: analysis.explanation || 'Keine Erklärung verfügbar',
      investmentScore: Math.min(100, Math.max(0, analysis.investmentScore || 50)),
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities : [],
      risks: Array.isArray(analysis.risks) ? analysis.risks : [],
      estimatedRent: analysis.estimatedRent ? parseFloat(analysis.estimatedRent) : undefined,
      estimatedOperatingCosts: analysis.estimatedOperatingCosts ? parseFloat(analysis.estimatedOperatingCosts) : undefined,
      estimatedMaintenanceCosts: analysis.estimatedMaintenanceCosts ? parseFloat(analysis.estimatedMaintenanceCosts) : undefined,
    };

  } catch (error) {
    console.error('AI Analysis error:', error);

    // Fallback analysis based on price/sqm ratio
    return generateFallbackAnalysis(propertyData);
  }
}

/**
 * Normalize rating to valid values
 */
function normalizeRating(rating: string): AIRating {
  const normalized = rating.toLowerCase();
  if (['top_deal', 'topdeal', 'top deal'].includes(normalized)) return 'top_deal';
  if (['good', 'gut'].includes(normalized)) return 'good';
  if (['average', 'durchschnitt', 'durchschnittlich'].includes(normalized)) return 'average';
  if (['poor', 'schlecht'].includes(normalized)) return 'poor';
  if (['avoid', 'meiden', 'finger weg'].includes(normalized)) return 'avoid';
  return 'average'; // Default
}

/**
 * Generate fallback analysis when AI is not available
 */
function generateFallbackAnalysis(propertyData: ScrapedPropertyData): PropertyAnalysis {
  const pricePerSqm = propertyData.price / propertyData.sqm;

  // Simple heuristic based on price per sqm
  // These are rough estimates and should be adjusted based on market data
  let rating: AIRating;
  let investmentScore: number;

  if (pricePerSqm < 3000) {
    rating = 'top_deal';
    investmentScore = 85;
  } else if (pricePerSqm < 4000) {
    rating = 'good';
    investmentScore = 70;
  } else if (pricePerSqm < 5000) {
    rating = 'average';
    investmentScore = 55;
  } else if (pricePerSqm < 6000) {
    rating = 'poor';
    investmentScore = 35;
  } else {
    rating = 'avoid';
    investmentScore = 20;
  }

  // Estimate rent based on simple heuristic (adjust for your market)
  // Typical rental yield in Germany: 3-5% gross per year
  // Monthly rent = (Purchase Price * Annual Yield) / 12
  const annualGrossYield = 0.04; // 4% gross yield
  const estimatedRent = Math.round((propertyData.price * annualGrossYield) / 12);

  // Estimate operating costs
  const estimatedOperatingCosts = propertyData.monthlyFee || Math.round(propertyData.sqm * 3); // 3€/m² if not provided

  // Maintenance reserve: 1€/m² per month
  const estimatedMaintenanceCosts = Math.round(propertyData.sqm * 1);

  return {
    aiRating: rating,
    aiRatingExplanation: `Automatische Bewertung basierend auf dem Preis pro m² (${pricePerSqm.toFixed(2)} €/m²). Für eine detaillierte Analyse wird OpenAI benötigt.`,
    investmentScore,
    strengths: [
      'Immobilie erfolgreich analysiert',
    ],
    weaknesses: [
      'Detaillierte AI-Analyse nicht verfügbar',
    ],
    opportunities: [
      'Weitere Prüfung empfohlen',
    ],
    risks: [
      'Automatische Bewertung - bitte manuell prüfen',
    ],
    estimatedRent,
    estimatedOperatingCosts,
    estimatedMaintenanceCosts,
  };
}
