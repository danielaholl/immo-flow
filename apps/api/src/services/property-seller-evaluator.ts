/**
 * Property Seller Evaluator Service
 * AI-powered property evaluation from seller perspective
 * Provides market value estimation and selling recommendations
 */
import { queryOne } from '../db.js';
import { createLogger } from '../utils/logger.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';

const log = createLogger('property-seller-evaluator');

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

    // Calculate realistic market value range based on price per sqm
    const marketAvgPricePerSqm = pricePerSqm; // Use current price as baseline
    const minPricePerSqm = Math.round(marketAvgPricePerSqm * 0.85); // -15%
    const maxPricePerSqm = Math.round(marketAvgPricePerSqm * 1.10); // +10%
    const calculatedMinValue = Math.round(property.sqm * minPricePerSqm);
    const calculatedMaxValue = Math.round(property.sqm * maxPricePerSqm);

    const prompt = `Analysiere diese Immobilie aus VERKÄUFER-Sicht und erstelle eine REALISTISCHE Marktwertschätzung:

IMMOBILIE:
- Titel: ${property.title}
- Aktueller Angebotspreis: ${property.price.toLocaleString('de-DE')} €
- Fläche: ${property.sqm} m²
- Preis/m²: ${pricePerSqm.toFixed(0)} €/m²
- Zimmer: ${property.rooms}
- Ort: ${property.location}
${property.address ? `- Adresse: ${property.address}` : ''}
${property.year_built ? `- Baujahr: ${property.year_built}` : ''}
${property.condition ? `- Zustand: ${property.condition}` : ''}
${property.features && property.features.length > 0 ? `- Ausstattung: ${property.features.slice(0, 10).join(', ')}` : ''}

BESCHREIBUNG:
${property.description?.substring(0, 1000) || 'Keine Beschreibung'}

KRITISCH WICHTIG - REALISTISCHE MARKTWERTBERECHNUNG:
1. Der Marktwert MUSS auf Basis der FLÄCHE (${property.sqm} m²) berechnet werden!
2. Formel: Marktwert = Fläche × Preis pro m²
3. Der aktuelle Preis/m² ist: ${pricePerSqm.toFixed(0)} €/m²
4. Realistischer Marktwert-BEREICH für diese ${property.sqm} m² Immobilie:
   - Minimum (bei -15%): ca. ${calculatedMinValue.toLocaleString('de-DE')} €
   - Maximum (bei +10%): ca. ${calculatedMaxValue.toLocaleString('de-DE')} €
5. Dein geschätzter Marktwert MUSS in diesem Bereich liegen!
6. NIEMALS einen Marktwert angeben der mehr als 20% vom Angebotspreis abweicht!

PRÜFUNG:
- Angebotspreis: ${property.price.toLocaleString('de-DE')} €
- Dein Marktwert muss zwischen ${Math.round(property.price * 0.80).toLocaleString('de-DE')} € und ${Math.round(property.price * 1.20).toLocaleString('de-DE')} € liegen!

Antworte im folgenden JSON-Format:
{
  "marketValueMin": (Unterer Marktwert - MUSS zwischen ${Math.round(property.price * 0.80)} und ${Math.round(property.price * 0.95)} liegen),
  "marketValueMax": (Oberer Marktwert - MUSS zwischen ${Math.round(property.price * 0.95)} und ${Math.round(property.price * 1.15)} liegen),
  "recommendedPrice": (Empfohlener Preis - realistisch, nahe am Angebotspreis von ${property.price}),
  "comparableSales": (Geschätzte Anzahl vergleichbarer Verkäufe, 5-30),
  "marketingDurationMin": (Minimale Vermarktungsdauer in Wochen),
  "marketingDurationMax": (Maximale Vermarktungsdauer in Wochen),
  "priceAssessment": "unter Marktwert" | "marktgerecht" | "über Marktwert",
  "summary": "Ehrliche Zusammenfassung (2-3 Sätze)",
  "sellingPoints": ["Stärke 1", "Stärke 2", ...] (3-5 Stärken),
  "improvementSuggestions": ["Verbesserung 1", "Verbesserung 2", ...] (2-4 Vorschläge)
}

WICHTIG: Alle Zahlenwerte müssen echte Zahlen sein, keine Strings, keine null-Werte, keine NaN.`;

    const openai = getOpenAIClient();
    const systemPrompt = buildSystemPrompt('seller');
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
      throw new Error('No response from OpenAI');
    }

    const evaluation = JSON.parse(content);

    log.info('Seller evaluation raw response', { evaluation });

    // CRITICAL: Validate and FORCE realistic values based on actual property price
    // The AI often returns unrealistic values - we must correct them
    const minAllowed = Math.round(property.price * 0.80); // -20%
    const maxAllowed = Math.round(property.price * 1.20); // +20%

    let marketValueMin = parseFloat(evaluation.marketValueMin) || property.price * 0.9;
    let marketValueMax = parseFloat(evaluation.marketValueMax) || property.price * 1.1;
    let recommendedPrice = parseFloat(evaluation.recommendedPrice) || property.price;

    // Force values within realistic bounds
    if (marketValueMin < minAllowed || marketValueMin > maxAllowed) {
      log.warn('Correcting unrealistic marketValueMin', { original: marketValueMin, corrected: Math.round(property.price * 0.88) });
      marketValueMin = Math.round(property.price * 0.88); // -12%
    }
    if (marketValueMax < minAllowed || marketValueMax > maxAllowed) {
      log.warn('Correcting unrealistic marketValueMax', { original: marketValueMax, corrected: Math.round(property.price * 1.05) });
      marketValueMax = Math.round(property.price * 1.05); // +5%
    }
    if (recommendedPrice < minAllowed || recommendedPrice > maxAllowed) {
      log.warn('Correcting unrealistic recommendedPrice', { original: recommendedPrice, corrected: Math.round(property.price * 0.95) });
      recommendedPrice = Math.round(property.price * 0.95); // -5%
    }

    // Ensure min < recommended < max
    if (marketValueMin > recommendedPrice) marketValueMin = Math.round(recommendedPrice * 0.92);
    if (marketValueMax < recommendedPrice) marketValueMax = Math.round(recommendedPrice * 1.08);

    const validatedEvaluation: SellerEvaluation = {
      marketValueMin,
      marketValueMax,
      recommendedPrice,
      comparableSales: parseInt(evaluation.comparableSales) || 10,
      marketingDurationMin: parseInt(evaluation.marketingDurationMin) || 4,
      marketingDurationMax: parseInt(evaluation.marketingDurationMax) || 12,
      priceAssessment: evaluation.priceAssessment || 'marktgerecht',
      summary: evaluation.summary || 'Keine Zusammenfassung verfügbar',
      sellingPoints: Array.isArray(evaluation.sellingPoints) ? evaluation.sellingPoints : [],
      improvementSuggestions: Array.isArray(evaluation.improvementSuggestions) ? evaluation.improvementSuggestions : [],
    };

    log.info('Seller evaluation validated', { validatedEvaluation });

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
