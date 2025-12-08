/**
 * AI Property Q&A Service
 * Answers user questions about properties using AI
 */
import OpenAI from 'openai';
import { db } from '../db.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PropertyQAResponse {
  answer: string;
  confidence: number; // 0-1 scale
  shouldForwardToSeller: boolean;
  relatedFields: string[]; // Which property fields were used
}

/**
 * Answer a question about a property using AI
 */
export async function answerPropertyQuestion(
  propertyId: string,
  question: string
): Promise<PropertyQAResponse> {
  try {
    // Fetch complete property data
    const property = await db.query(
      `SELECT
        p.*,
        up.first_name as owner_first_name,
        up.last_name as owner_last_name,
        up.company as owner_company,
        up.user_type as owner_type
      FROM properties p
      LEFT JOIN user_profiles up ON p.user_id = up.id
      WHERE p.id = $1`,
      [propertyId]
    );

    if (property.rows.length === 0) {
      return {
        answer: 'Diese Immobilie konnte nicht gefunden werden.',
        confidence: 0,
        shouldForwardToSeller: false,
        relatedFields: [],
      };
    }

    const prop = property.rows[0];

    // Build comprehensive property context
    const propertyContext = buildPropertyContext(prop);

    // Create AI prompt
    const prompt = `Du bist ein KI-Assistent für eine Immobilienplattform. Ein Nutzer stellt eine Frage zu folgender Immobilie:

IMMOBILIEN-DATEN:
${propertyContext}

NUTZERFRAGE:
"${question}"

AUFGABE:
Beantworte die Frage basierend AUSSCHLIESSLICH auf den vorhandenen Immobilien-Daten. Sei präzise und hilfreich.

WICHTIGE REGELN:
1. Wenn die Information EXPLIZIT in den Daten vorhanden ist → beantworte mit hoher Confidence (0.9-1.0)
2. Wenn die Information ABLEITBAR ist → beantworte mit mittlerer Confidence (0.7-0.9)
3. Wenn die Information TEILWEISE vorhanden ist → beantworte mit niedriger Confidence (0.5-0.7)
4. Wenn die Information FEHLT → gib Confidence < 0.5 und eine kurze Antwort, dass die Info fehlt

WICHTIG:
- Bei Confidence < 0.5 wird die Frage AUTOMATISCH an den Verkäufer weitergeleitet
- Sage NIEMALS "Bitte kontaktieren Sie den Verkäufer" oder ähnliches
- Sage stattdessen einfach: "Ich leite Ihre Frage an den Verkäufer weiter."

Antworte im JSON-Format:
{
  "answer": "Deine Antwort auf die Frage (freundlich und präzise)",
  "confidence": 0.0-1.0 (wie sicher bist du?),
  "relatedFields": ["feldname1", "feldname2", ...] (welche Felder wurden verwendet?)
}

BEISPIELE:

Frage: "Hat die Wohnung einen Balkon?"
- Wenn "balkon" in features → confidence: 0.95, answer: "Ja, die Wohnung verfügt über einen Balkon."
- Wenn nicht in features → confidence: 0.3, answer: "Diese Information finde ich leider nicht in den Unterlagen. Ich leite Ihre Frage an den Verkäufer weiter."

Frage: "Wie hoch ist die monatliche Belastung?"
- Wenn hausgeld + heizkosten vorhanden → confidence: 0.9, answer: "Die monatliche Belastung beträgt ca. X€ (Hausgeld + Heizkosten)."
- Wenn nur teilweise vorhanden → confidence: 0.6, answer: "Das Hausgeld beträgt X€. Für die vollständigen Nebenkosten leite ich Ihre Frage weiter."

Frage: "Wann wurde das Bad renoviert?"
- Wenn nicht in Daten → confidence: 0.2, answer: "Diese Information liegt mir nicht vor. Ich leite Ihre Frage an den Verkäufer weiter."

WICHTIG: Bei Confidence < 0.5 wird die Frage an den Verkäufer weitergeleitet!`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher KI-Assistent für Immobilien. Du beantwortest Fragen präzise und gibst ehrlich zu, wenn dir Informationen fehlen.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more factual responses
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const qaResponse: PropertyQAResponse = {
      answer: result.answer || 'Entschuldigung, ich konnte Ihre Frage nicht beantworten.',
      confidence: parseFloat(result.confidence) || 0,
      shouldForwardToSeller: parseFloat(result.confidence) < 0.5,
      relatedFields: result.relatedFields || [],
    };

    console.log(`[PropertyQA] Question: "${question}"`);
    console.log(`[PropertyQA] Confidence: ${qaResponse.confidence}`);
    console.log(`[PropertyQA] Forward to seller: ${qaResponse.shouldForwardToSeller}`);

    return qaResponse;
  } catch (error) {
    console.error('[PropertyQA] Error:', error);
    return {
      answer: 'Entschuldigung, es ist ein technischer Fehler aufgetreten. Ich leite Ihre Frage an den Verkäufer weiter.',
      confidence: 0,
      shouldForwardToSeller: true,
      relatedFields: [],
    };
  }
}

/**
 * Build comprehensive property context for AI
 */
function buildPropertyContext(property: any): string {
  const sections: string[] = [];

  // Basic Information
  sections.push('GRUNDDATEN:');
  sections.push(`- Titel: ${property.title || 'Keine Angabe'}`);
  sections.push(`- Typ: ${property.property_type || 'Keine Angabe'}`);
  sections.push(`- Preis: ${property.price ? property.price.toLocaleString('de-DE') + ' €' : 'Keine Angabe'}`);
  sections.push(`- Wohnfläche: ${property.living_space || 'Keine Angabe'} m²`);
  sections.push(`- Zimmer: ${property.rooms || 'Keine Angabe'}`);
  if (property.bedrooms) sections.push(`- Schlafzimmer: ${property.bedrooms}`);
  if (property.bathrooms) sections.push(`- Badezimmer: ${property.bathrooms}`);
  sections.push('');

  // Location
  sections.push('LAGE:');
  sections.push(`- Straße: ${property.street || 'Keine Angabe'}`);
  sections.push(`- Stadt: ${property.city || 'Keine Angabe'}`);
  sections.push(`- PLZ: ${property.zip_code || 'Keine Angabe'}`);
  sections.push(`- Bundesland: ${property.state || 'Keine Angabe'}`);
  sections.push('');

  // Property Details
  sections.push('OBJEKT-DETAILS:');
  if (property.year_built) sections.push(`- Baujahr: ${property.year_built}`);
  if (property.condition) sections.push(`- Zustand: ${property.condition}`);
  if (property.floor) sections.push(`- Etage: ${property.floor}`);
  if (property.total_floors) sections.push(`- Gesamt-Etagen: ${property.total_floors}`);
  if (property.plot_size) sections.push(`- Grundstücksfläche: ${property.plot_size} m²`);
  if (property.usable_area) sections.push(`- Nutzfläche: ${property.usable_area} m²`);
  if (property.number_of_floors) sections.push(`- Anzahl Etagen (Haus): ${property.number_of_floors}`);
  sections.push('');

  // Energy & Costs
  sections.push('ENERGIE & KOSTEN:');
  if (property.energy_certificate_type) sections.push(`- Energieausweis-Typ: ${property.energy_certificate_type}`);
  if (property.energy_consumption) sections.push(`- Energieverbrauch: ${property.energy_consumption} kWh/(m²·a)`);
  if (property.energy_efficiency_class) sections.push(`- Energieeffizienzklasse: ${property.energy_efficiency_class}`);
  if (property.heating_type) sections.push(`- Heizungsart: ${property.heating_type}`);
  if (property.monthly_fee) sections.push(`- Hausgeld: ${property.monthly_fee} €/Monat`);
  if (property.heating_costs) sections.push(`- Heizkosten: ${property.heating_costs} €/Monat`);
  if (property.additional_costs) sections.push(`- Zusätzliche Kosten: ${property.additional_costs} €/Monat`);
  if (property.commission) sections.push(`- Provision: ${property.commission}`);
  sections.push('');

  // Features & Amenities
  if (property.features && property.features.length > 0) {
    sections.push('AUSSTATTUNG:');
    property.features.forEach((feature: string) => {
      sections.push(`- ${feature}`);
    });
    sections.push('');
  }

  // Parking
  if (property.parking_type || property.parking_spaces) {
    sections.push('PARKMÖGLICHKEITEN:');
    if (property.parking_type) sections.push(`- Art: ${property.parking_type}`);
    if (property.parking_spaces) sections.push(`- Anzahl Stellplätze: ${property.parking_spaces}`);
    sections.push('');
  }

  // Rental Information
  if (property.rental_status || property.current_rent || property.tenant_count) {
    sections.push('VERMIETUNGS-INFO:');
    if (property.rental_status) sections.push(`- Status: ${property.rental_status}`);
    if (property.current_rent) sections.push(`- Aktuelle Miete: ${property.current_rent} €/Monat`);
    if (property.tenant_count) sections.push(`- Anzahl Mieter: ${property.tenant_count}`);
    sections.push('');
  }

  // Description
  if (property.description) {
    sections.push('BESCHREIBUNG:');
    sections.push(property.description.substring(0, 1500)); // Limit to 1500 chars
    sections.push('');
  }

  // Owner Information
  sections.push('ANBIETER:');
  if (property.owner_company) {
    sections.push(`- Firma: ${property.owner_company}`);
  } else if (property.owner_first_name || property.owner_last_name) {
    sections.push(`- Name: ${property.owner_first_name || ''} ${property.owner_last_name || ''}`);
  }
  sections.push(`- Typ: ${property.owner_type || 'private'}`);

  return sections.join('\n');
}

/**
 * Generate AI greeting message for new conversation
 */
export async function generateGreetingMessage(propertyTitle: string): Promise<string> {
  return `Hallo! Ich bin Ihr KI-Assistent für die Immobilie "${propertyTitle}".

Ich kann Ihnen Fragen zu dieser Immobilie beantworten, z.B.:
• Ausstattungsdetails (Balkon, Keller, etc.)
• Kosten und Nebenkosten
• Lage und Umgebung
• Zustand und Baujahr
• Energieeffizienz

Wenn ich eine Frage nicht beantworten kann, leite ich sie automatisch an den Verkäufer weiter. Wie kann ich Ihnen helfen?`;
}
