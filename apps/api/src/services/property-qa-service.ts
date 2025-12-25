/**
 * AI Property Q&A Service
 * Answers user questions about properties using AI
 */
import OpenAI from 'openai';
import { db } from '../db.js';
import { createLogger } from '../utils/logger.js';
import { getKnowledgeForProperty } from './knowledge-learner-service.js';

const log = createLogger('property-qa-service');

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

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
        NULLIF(CONCAT_WS(', ', p.street_address, CONCAT_WS(' ', p.postal_code, p.location)), '') as full_address,
        up.first_name as owner_first_name,
        up.last_name as owner_last_name,
        up.company as owner_company
      FROM properties p
      LEFT JOIN user_profiles up ON p.user_id = up.user_id
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

    // Fetch seller knowledge base entries
    const sellerKnowledge = await getKnowledgeForProperty(propertyId);

    // Build comprehensive property context including seller knowledge
    const propertyContext = buildPropertyContext(prop, sellerKnowledge);

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

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
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

    log.info('Question answered', {
      question,
      confidence: qaResponse.confidence,
      forwardToSeller: qaResponse.shouldForwardToSeller,
    });

    return qaResponse;
  } catch (error) {
    log.error('Failed to answer question', { error });
    return {
      answer: 'Entschuldigung, es ist ein technischer Fehler aufgetreten. Ich leite Ihre Frage an den Verkäufer weiter.',
      confidence: 0,
      shouldForwardToSeller: true,
      relatedFields: [],
    };
  }
}

interface KnowledgeEntry {
  topic: string;
  content: string;
  category: string;
}

/**
 * Build comprehensive property context for AI
 */
function buildPropertyContext(
  property: any,
  sellerKnowledge: KnowledgeEntry[] = []
): string {
  const sections: string[] = [];

  // Basic Information
  sections.push('GRUNDDATEN:');
  sections.push(`- Titel: ${property.title || 'Keine Angabe'}`);
  sections.push(`- Typ: ${property.property_type || 'Keine Angabe'}`);
  sections.push(`- Preis: ${property.price ? Number(property.price).toLocaleString('de-DE') + ' €' : 'Keine Angabe'}`);
  sections.push(`- Wohnfläche: ${property.sqm || 'Keine Angabe'} m²`);
  sections.push(`- Zimmer: ${property.rooms || 'Keine Angabe'}`);
  if (property.bathrooms) sections.push(`- Badezimmer: ${property.bathrooms}`);
  sections.push('');

  // Location
  sections.push('LAGE:');
  sections.push(`- Ort: ${property.location || 'Keine Angabe'}`);
  if (property.full_address) sections.push(`- Adresse: ${property.full_address}`);
  sections.push('');

  // Property Details
  sections.push('OBJEKT-DETAILS:');
  if (property.year_built) sections.push(`- Baujahr: ${property.year_built}`);
  if (property.condition) sections.push(`- Zustand: ${property.condition}`);
  if (property.floor_level) sections.push(`- Etage: ${property.floor_level}`);
  if (property.total_floors) sections.push(`- Gesamt-Etagen: ${property.total_floors}`);
  if (property.usable_area) sections.push(`- Nutzfläche: ${property.usable_area} m²`);
  if (property.available_from) sections.push(`- Verfügbar ab: ${property.available_from}`);
  sections.push('');

  // Energy & Costs
  sections.push('ENERGIE & KOSTEN:');
  if (property.energy_certificate) sections.push(`- Energieausweis: ${property.energy_certificate}`);
  if (property.energy_efficiency_class) sections.push(`- Energieeffizienzklasse: ${property.energy_efficiency_class}`);
  if (property.heating_type) sections.push(`- Heizungsart: ${property.heating_type}`);
  if (property.energy_source) sections.push(`- Energieträger: ${property.energy_source}`);
  if (property.monthly_fee) sections.push(`- Hausgeld: ${property.monthly_fee} €/Monat`);
  if (property.commission_rate) sections.push(`- Provision: ${property.commission_rate}%`);
  sections.push('');

  // Features & Amenities
  if (property.features && property.features.length > 0) {
    sections.push('AUSSTATTUNG:');
    property.features.forEach((feature: string) => {
      sections.push(`- ${feature}`);
    });
    sections.push('');
  }

  // Rental Information
  if (property.monthly_rent || property.actual_monthly_rent) {
    sections.push('MIETINFORMATIONEN:');
    if (property.monthly_rent) sections.push(`- Monatliche Miete: ${property.monthly_rent} €`);
    if (property.actual_monthly_rent) sections.push(`- Aktuelle Ist-Miete: ${property.actual_monthly_rent} €`);
    sections.push('');
  }

  // Investment Info
  if (property.yield) {
    sections.push('INVESTMENT:');
    sections.push(`- Rendite: ${property.yield}%`);
    sections.push('');
  }

  // Description
  if (property.description) {
    sections.push('BESCHREIBUNG:');
    sections.push(property.description.substring(0, 1500)); // Limit to 1500 chars
    sections.push('');
  }

  // Seller Knowledge Base (private information from seller)
  if (sellerKnowledge.length > 0) {
    sections.push('VERKAEUFER-INFORMATIONEN (vertraulich, vom Eigentuemer bereitgestellt):');
    sellerKnowledge.forEach((entry) => {
      sections.push(`- ${entry.topic}: ${entry.content}`);
    });
    sections.push('');
  }

  // Owner Information
  if (property.owner_company || property.owner_first_name || property.owner_last_name) {
    sections.push('ANBIETER:');
    if (property.owner_company) {
      sections.push(`- Firma: ${property.owner_company}`);
    }
    if (property.owner_first_name || property.owner_last_name) {
      sections.push(`- Name: ${property.owner_first_name || ''} ${property.owner_last_name || ''}`.trim());
    }
  }

  return sections.join('\n');
}

/**
 * Generate AI greeting message for new conversation
 */
export async function generateGreetingMessage(propertyTitle: string): Promise<string> {
  return `Hallo! Ich bin Ihr KI-Assistent für "${propertyTitle}" – stellen Sie mir gerne Ihre Fragen zur Immobilie.`;
}
