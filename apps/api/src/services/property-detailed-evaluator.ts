/**
 * Detailed Property Evaluator Service
 * Uses OpenAI with master prompt for in-depth property evaluation
 */
import { createLogger } from '../utils/logger.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';

const log = createLogger('property-detailed-evaluator');

export type RatingColor = 'green' | 'orange' | 'red';

export interface DetailedEvaluation {
  // Kurzprofil
  summary: string;

  // Lage
  location_rating: RatingColor;
  location_explanation: string;

  // Rendite
  yield_rating: RatingColor;
  yield_explanation: string;

  // Entwicklungspotenzial
  potential_rating: RatingColor;
  potential_points: string[];

  // Gesamtbewertung
  overall_rating: RatingColor;
  overall_summary: string;

  // Verhandlungspreis
  asking_price: number;
  recommended_price: number;
  discount_percentage: number;
  price_justification: string;
}

// Spezifische Anweisungen für detaillierte Bewertung (zusätzlich zum Master-Prompt)
const DETAILED_EVALUATION_INSTRUCTIONS = `Analysiere ausschließlich die Informationen aus dem Exposé und deiner Markterfahrung, ohne dir etwas auszudenken.

Deine Aufgaben:

**Lagebewertung**
- Beurteile die Lage (Mikro- und Makrolage) kurz und knapp
- Gehe auf Infrastruktur, ÖPNV, Nachfrage, Umfeld und Vermietbarkeit ein
- Vergib eine Ampelbewertung: green = sehr gute / gefragte Lage | orange = solide / durchschnittliche Lage | red = schwache / problematische Lage

**Rendite & Wirtschaftlichkeit**
- Schätze knapp die Bruttorendite (auf Basis von Kaufpreis vs. Ist-/Soll-Miete aus dem Exposé)
- Beurteile in 1–2 Sätzen, ob die Rendite im Verhältnis zur Lage attraktiv, okay oder schwach ist
- Vergib eine Ampelbewertung (green / orange / red)

**Entwicklungspotenzial**
- Prüfe kurz Ansatzpunkte für: Mietsteigerung / Indexierung, Aufteilung, Sanierung, Umnutzung, möblierte Vermietung, Aufwertung der Ausstattung etc.
- Fasse das Entwicklungspotenzial in 2–3 sehr knappen Stichpunkten zusammen
- Vergib eine Ampelbewertung (green / orange / red)

**Gesamtbewertung & Empfehlung**
- Fasse die Immobilie in max. 3 Sätzen zusammen (Lage, Rendite, Potenzial)
- Gib eine Gesamt-Ampelbewertung: green = Top-Investment | orange = Kann man machen / selektiv interessant | red = Nicht attraktiv / Risiko zu hoch

**Verhandlungspreis (Top-Deal-Empfehlung)**
- Empfiehl einen konkreten Verhandlungspreis, bei dem es aus Investorensicht ein wirklich guter Deal ist
- Gib den Preis in Euro und den prozentualen Abschlag zum Angebotspreis an
- Begründe den Abschlag in max. 2 Sätzen (z.B. Zustand, Mietniveau, Lage, Sanierungsbedarf, Leerstand, Risiken)

Antworte im folgenden JSON-Format:
{
  "summary": "1 Satz zur Immobilie (Art, Lage, grobe Kennzahl)",
  "location_rating": "green" | "orange" | "red",
  "location_explanation": "1 kurzer Satz Begründung",
  "yield_rating": "green" | "orange" | "red",
  "yield_explanation": "1–2 kurze Sätze zur Bruttorendite und Attraktivität",
  "potential_rating": "green" | "orange" | "red",
  "potential_points": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "overall_rating": "green" | "orange" | "red",
  "overall_summary": "max. 3 Sätze Gesamtfazit",
  "asking_price": Angebotspreis in Euro,
  "recommended_price": Empfohlener Verhandlungspreis in Euro,
  "discount_percentage": Prozentualer Abschlag,
  "price_justification": "1–2 Sätze Kurzbegründung"
}`;

/**
 * Generate detailed property evaluation using master prompt
 */
export async function generateDetailedEvaluation(
  exposeText: string,
  propertyPrice: number
): Promise<DetailedEvaluation> {
  try {
    const userPrompt = `${DETAILED_EVALUATION_INSTRUCTIONS}

EXPOSÉ-TEXT:
${exposeText.substring(0, 8000)}

Kaufpreis laut Exposé: ${propertyPrice.toLocaleString('de-DE')} €`;

    const client = getOpenAIClient();
    const systemPrompt = buildSystemPrompt('investor');
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten');
    }

    const evaluation = JSON.parse(content);

    // Validate and normalize the response
    return {
      summary: evaluation.summary || 'Keine Zusammenfassung verfügbar',
      location_rating: normalizeRating(evaluation.location_rating),
      location_explanation: evaluation.location_explanation || '',
      yield_rating: normalizeRating(evaluation.yield_rating),
      yield_explanation: evaluation.yield_explanation || '',
      potential_rating: normalizeRating(evaluation.potential_rating),
      potential_points: Array.isArray(evaluation.potential_points) ? evaluation.potential_points : [],
      overall_rating: normalizeRating(evaluation.overall_rating),
      overall_summary: evaluation.overall_summary || '',
      asking_price: parseFloat(evaluation.asking_price) || propertyPrice,
      recommended_price: parseFloat(evaluation.recommended_price) || propertyPrice * 0.9,
      discount_percentage: parseFloat(evaluation.discount_percentage) || 10,
      price_justification: evaluation.price_justification || '',
    };

  } catch (error) {
    console.error('Detailed evaluation error:', error);
    throw new Error('Fehler bei der detaillierten Bewertung');
  }
}

/**
 * Normalize rating to valid color values
 */
function normalizeRating(rating: string): RatingColor {
  const normalized = rating.toLowerCase();
  if (normalized.includes('green') || normalized.includes('grün')) return 'green';
  if (normalized.includes('orange') || normalized.includes('gelb')) return 'orange';
  if (normalized.includes('red') || normalized.includes('rot')) return 'red';
  return 'orange'; // Default
}
