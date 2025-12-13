/**
 * Property Seller Evaluator Service
 * AI-powered property evaluation from seller perspective
 * Provides market value estimation and selling recommendations
 */
import OpenAI from 'openai';
import { queryOne } from '../db.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('property-seller-evaluator');

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface SellerEvaluation {
  marketValueMin: number;
  marketValueMax: number;
  recommendedPrice: number;
  comparableSales: number;
  marketingDurationMin: number;
  marketingDurationMax: number;
  priceAssessment: string;
  summary: string;
  sellingPoints: string[];
  improvementSuggestions: string[];
}

/**
 * Evaluate property from seller perspective
 */
export async function evaluatePropertyForSeller(propertyId: string): Promise<SellerEvaluation> {
  try {
    log.info('Starting seller evaluation for property:', { propertyId });

    // Get property from database
    const property = await queryOne('SELECT * FROM properties WHERE id = $1', [propertyId]);

    if (!property) {
      throw new Error('Property not found');
    }

    // Build evaluation prompt
    const pricePerSqm = property.sqm > 0 ? property.price / property.sqm : 0;

    const prompt = `Analysiere diese Immobilie aus VERKÄUFER-Sicht und erstelle eine Marktwertschätzung:

IMMOBILIE:
- Titel: ${property.title}
- Preis: ${property.price.toLocaleString('de-DE')} €
- Fläche: ${property.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(2)} €/m²
- Zimmer: ${property.rooms}
- Ort: ${property.location}
${property.address ? `- Adresse: ${property.address}` : ''}
${property.year_built ? `- Baujahr: ${property.year_built}` : ''}
${property.condition ? `- Zustand: ${property.condition}` : ''}
${property.features && property.features.length > 0 ? `- Ausstattung: ${property.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${property.description?.substring(0, 1000) || 'Keine Beschreibung'}

AUFGABE:
Erstelle eine Verkäufer-Bewertung mit Marktwertschätzung für den deutschen Immobilienmarkt in 2025.
Berücksichtige aktuelle Marktpreise und Trends.

Antworte im folgenden JSON-Format:
{
  "marketValueMin": (Unterer Marktwert in Euro - realistisch geschätzt),
  "marketValueMax": (Oberer Marktwert in Euro - realistisch geschätzt),
  "recommendedPrice": (Empfohlener Angebotspreis in Euro - sollte zwischen min und max liegen),
  "comparableSales": (Geschätzte Anzahl vergleichbarer Verkäufe in den letzten 6 Monaten in der Region, realistisch zwischen 5-50),
  "marketingDurationMin": (Minimale erwartete Vermarktungsdauer in Wochen, z.B. 4),
  "marketingDurationMax": (Maximale erwartete Vermarktungsdauer in Wochen, z.B. 12),
  "priceAssessment": "unter Marktwert" | "marktgerecht" | "über Marktwert",
  "summary": "Kurze Zusammenfassung für den Verkäufer (2-3 Sätze)",
  "sellingPoints": ["Verkaufsargument 1", "Verkaufsargument 2", "Verkaufsargument 3", ...] (3-5 Argumente),
  "improvementSuggestions": ["Verbesserungsvorschlag 1", "Verbesserungsvorschlag 2", ...] (2-4 Vorschläge)
}

WICHTIG: Alle Zahlenwerte müssen echte Zahlen sein, keine Strings, keine null-Werte, keine NaN.`;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Immobilienmakler mit Fokus auf Verkaufsberatung im deutschen Markt.',
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
      throw new Error('No response from OpenAI');
    }

    const evaluation = JSON.parse(content);

    log.info('Seller evaluation completed', { evaluation });

    // Validate and ensure all numeric fields are valid
    const validatedEvaluation: SellerEvaluation = {
      marketValueMin: parseFloat(evaluation.marketValueMin) || property.price * 0.9,
      marketValueMax: parseFloat(evaluation.marketValueMax) || property.price * 1.1,
      recommendedPrice: parseFloat(evaluation.recommendedPrice) || property.price,
      comparableSales: parseInt(evaluation.comparableSales) || 10,
      marketingDurationMin: parseInt(evaluation.marketingDurationMin) || 4,
      marketingDurationMax: parseInt(evaluation.marketingDurationMax) || 12,
      priceAssessment: evaluation.priceAssessment || 'marktgerecht',
      summary: evaluation.summary || 'Keine Zusammenfassung verfügbar',
      sellingPoints: Array.isArray(evaluation.sellingPoints) ? evaluation.sellingPoints : [],
      improvementSuggestions: Array.isArray(evaluation.improvementSuggestions) ? evaluation.improvementSuggestions : [],
    };

    // Store evaluation in database
    await queryOne(
      `UPDATE properties
       SET seller_evaluation = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(validatedEvaluation), propertyId]
    );

    return validatedEvaluation;
  } catch (error) {
    log.error('Error in seller evaluation', { error });
    throw new Error('Fehler bei der Verkäufer-Bewertung');
  }
}
