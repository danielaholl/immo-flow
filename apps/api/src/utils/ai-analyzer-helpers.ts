/**
 * AI Analyzer Helper Functions
 * Utility functions for AI-powered property analysis
 */
import { openai } from './logger.js'./openai.js';
import { createLogger } from './logger.js'@immoflow/utils';
import type { ScrapedPropertyData } from './logger.js'@immoflow/types';
import type {
  AIRating,
  PropertyAnalysis,
  AIAnalysisResponse,
} from './logger.js'../types/ai-analyzer-types.js';

const log = createLogger('ai-analyzer-helpers');

/**
 * Normalize rating to valid values
 */
export function normalizeRating(rating: string): AIRating {
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
export function generateFallbackAnalysis(propertyData: ScrapedPropertyData): PropertyAnalysis {
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

/**
 * Build prompt for property analysis
 */
export function buildPropertyAnalysisPrompt(propertyData: ScrapedPropertyData): string {
  const pricePerSqm = propertyData.price / propertyData.sqm;

  return `Analysiere diese Immobilie als Investment und bewerte sie:

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
}

/**
 * Parse and validate AI analysis response
 */
export function parseAnalysisResponse(analysis: AIAnalysisResponse): PropertyAnalysis {
  return {
    aiRating: normalizeRating(analysis.rating),
    aiRatingExplanation: analysis.explanation || 'Keine Erklärung verfügbar',
    investmentScore: Math.min(100, Math.max(0, analysis.investmentScore || 50)),
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
    opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities : [],
    risks: Array.isArray(analysis.risks) ? analysis.risks : [],
    estimatedRent: analysis.estimatedRent ? parseFloat(String(analysis.estimatedRent)) : undefined,
    estimatedOperatingCosts: analysis.estimatedOperatingCosts ? parseFloat(String(analysis.estimatedOperatingCosts)) : undefined,
    estimatedMaintenanceCosts: analysis.estimatedMaintenanceCosts ? parseFloat(String(analysis.estimatedMaintenanceCosts)) : undefined,
  };
}

/**
 * Build seller evaluation prompt
 */
export function buildSellerPrompt(propertyData: ScrapedPropertyData): string {
  const pricePerSqm = propertyData.price / propertyData.sqm;

  return `Analysiere diese Immobilie aus VERKÄUFER-Sicht und schätze den Marktwert:

IMMOBILIE:
- Titel: ${propertyData.title}
- Aktueller Preis: ${propertyData.price.toLocaleString('de-DE')} €
- Fläche: ${propertyData.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(2)} €/m²
- Zimmer: ${propertyData.rooms}
- Ort: ${propertyData.location}
${propertyData.address ? `- Adresse: ${propertyData.address}` : ''}
${propertyData.yearBuilt ? `- Baujahr: ${propertyData.yearBuilt}` : ''}
${propertyData.condition ? `- Zustand: ${propertyData.condition}` : ''}
${propertyData.features.length > 0 ? `- Ausstattung: ${propertyData.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${propertyData.description?.substring(0, 1000) || 'Keine Beschreibung'}

AUFGABE:
Erstelle eine Verkäufer-Bewertung mit Marktwertschätzung.

Antworte im folgenden JSON-Format:
{
  "marketValueMin": (Unterer Marktwert in Euro),
  "marketValueMax": (Oberer Marktwert in Euro),
  "recommendedPrice": (Empfohlener Angebotspreis in Euro),
  "comparableSales": (Geschätzte Anzahl vergleichbarer Verkäufe in den letzten 6 Monaten, 5-20),
  "marketingDurationMin": (Minimale erwartete Vermarktungsdauer in Tagen),
  "marketingDurationMax": (Maximale erwartete Vermarktungsdauer in Tagen),
  "priceAssessment": "unter Marktwert" | "marktgerecht" | "über Marktwert",
  "summary": "Kurze Zusammenfassung für den Verkäufer (2-3 Sätze)",
  "sellingPoints": ["Verkaufsargument 1", "Verkaufsargument 2", ...],
  "improvementSuggestions": ["Verbesserungsvorschlag 1", "Verbesserungsvorschlag 2", ...]
}`;
}

/**
 * Build self-use buyer evaluation prompt
 */
export function buildSelfusePrompt(propertyData: ScrapedPropertyData): string {
  const pricePerSqm = propertyData.price / propertyData.sqm;

  return `Analysiere diese Immobilie aus SELBSTNUTZER-Sicht (jemand der selbst darin wohnen möchte):

IMMOBILIE:
- Titel: ${propertyData.title}
- Preis: ${propertyData.price.toLocaleString('de-DE')} €
- Fläche: ${propertyData.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(2)} €/m²
- Zimmer: ${propertyData.rooms}
- Ort: ${propertyData.location}
${propertyData.address ? `- Adresse: ${propertyData.address}` : ''}
${propertyData.yearBuilt ? `- Baujahr: ${propertyData.yearBuilt}` : ''}
${propertyData.condition ? `- Zustand: ${propertyData.condition}` : ''}
${propertyData.features.length > 0 ? `- Ausstattung: ${propertyData.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${propertyData.description?.substring(0, 1000) || 'Keine Beschreibung'}

AUFGABE:
Erstelle eine Bewertung für Selbstnutzer mit Wohn-Score.

Antworte im folgenden JSON-Format:
{
  "livingScore": (Wohn-Score 0-100),
  "locationQuality": "sehr gut" | "gut" | "durchschnittlich" | "weniger gut",
  "locationDescription": "Kurze Beschreibung der Lage (z.B. 'ruhig, gut angebunden')",
  "shoppingFacilities": "sehr gut" | "gut" | "ausreichend" | "mangelhaft",
  "shoppingDistance": "Entfernung zu Einkaufsmöglichkeiten (z.B. '5 min zu Fuß')",
  "buyVsRentYears": (Ab wie vielen Jahren lohnt sich Kaufen vs Mieten, 5-15),
  "buyVsRentAssessment": "Kurze Einschätzung Kaufen vs Mieten",
  "noiseLevel": "gering" | "mittel" | "hoch",
  "noiseDescription": "Kurze Beschreibung der Lärmbelastung",
  "summary": "Zusammenfassung für Selbstnutzer (2-3 Sätze)",
  "pros": ["Vorteil 1", "Vorteil 2", ...],
  "cons": ["Nachteil 1", "Nachteil 2", ...]
}`;
}

/**
 * Build investor evaluation prompt
 */
export function buildInvestorPrompt(propertyData: ScrapedPropertyData): string {
  const pricePerSqm = propertyData.price / propertyData.sqm;

  return `Analysiere diese Immobilie als INVESTMENT für einen Kapitalanleger:

IMMOBILIE:
- Titel: ${propertyData.title}
- Kaufpreis: ${propertyData.price.toLocaleString('de-DE')} €
- Fläche: ${propertyData.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(2)} €/m²
- Zimmer: ${propertyData.rooms}
- Ort: ${propertyData.location}
${propertyData.address ? `- Adresse: ${propertyData.address}` : ''}
${propertyData.yearBuilt ? `- Baujahr: ${propertyData.yearBuilt}` : ''}
${propertyData.condition ? `- Zustand: ${propertyData.condition}` : ''}
${propertyData.monthlyFee ? `- Hausgeld: ${propertyData.monthlyFee} €/Monat` : ''}
${propertyData.features.length > 0 ? `- Ausstattung: ${propertyData.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${propertyData.description?.substring(0, 1000) || 'Keine Beschreibung'}

AUFGABE:
Erstelle eine Investment-Bewertung mit allen relevanten Kennzahlen.
Schätze die Miete basierend auf Lage, Größe und Ausstattung.
Berechne Renditen basierend auf 80% Finanzierung mit 4% Zinsen.

Antworte im folgenden JSON-Format:
{
  "investmentScore": (Investment-Score 0-100),
  "grossYield": (Bruttorendite in %, z.B. 4.2),
  "netYield": (Nettorendite in %, nach Kosten, z.B. 2.8),
  "monthlyBudget": (Monatlicher Cashflow nach Finanzierung in Euro, kann negativ sein),
  "rentMultiplier": (Mietmultiplikator/Kaufpreisfaktor, z.B. 24),
  "microLocation": "A" | "A-" | "B+" | "B" | "B-" | "C" | "D",
  "microLocationTrend": "aufstrebend" | "stabil" | "rückläufig",
  "riskLevel": "gering" | "mittel" | "hoch",
  "riskFactors": ["Risikofaktor 1", "Risikofaktor 2", ...],
  "summary": "Zusammenfassung für Investoren (2-3 Sätze)",
  "strengths": ["Stärke 1", "Stärke 2", ...],
  "weaknesses": ["Schwäche 1", "Schwäche 2", ...]
}`;
}
