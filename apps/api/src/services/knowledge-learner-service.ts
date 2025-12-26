/**
 * Knowledge Learner Service (vereinfacht)
 * Extrahiert faktische Informationen aus Verkäufer-Chat-Antworten
 * und hängt sie an die seller_notes der Property an
 */
import OpenAI from 'openai';
import { db } from '../db.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('knowledge-learner');

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

export interface LearnFromChatInput {
  conversationId: string;
  messageId: string;
  propertyId: string;
  sellerId: string;
  buyerQuestion: string;
  sellerAnswer: string;
}

export interface LearnedKnowledge {
  info: string;
  confidence: number;
}

/**
 * Extract knowledge from a seller's chat response
 * Uses GPT to identify factual information worth saving
 */
export async function extractKnowledgeFromChat(
  input: LearnFromChatInput
): Promise<LearnedKnowledge | null> {
  try {
    const prompt = `Analysiere folgende Konversation zwischen einem potenziellen Kaeufer und einem Immobilienverkaeufer.
Extrahiere NUR faktische, objektbezogene Informationen, die fuer zukuenftige Anfragen nuetzlich sind.

KAEUFER-FRAGE:
"${input.buyerQuestion}"

VERKAEUFER-ANTWORT:
"${input.sellerAnswer}"

REGELN:
1. Extrahiere NUR konkrete Fakten ueber die Immobilie
2. Ignoriere: Grussformeln, Meinungen, vage Aussagen, Fragen, Smalltalk
3. Die Information muss spezifisch und wiederverwendbar sein
4. Formuliere die Information als praegnanten, vollstaendigen Satz
5. Wenn keine relevanten Fakten vorhanden sind, antworte mit: {"extract": false}

AUSGABEFORMAT (JSON):
{
  "extract": true,
  "info": "Praezise Information in 1-2 Saetzen (z.B. 'Die Tiefgarage wird 2025 saniert. Sonderumlage: 10.000 Euro.')",
  "confidence": 0.0-1.0 (wie sicher bist du, dass dies ein relevanter Fakt ist?)
}

BEISPIELE:

Frage: "Gibt es geplante Sanierungen?"
Antwort: "Ja, die Tiefgarage wird naechstes Jahr saniert. Dafuer ist eine Sonderumlage von 10.000 Euro geplant."
Ausgabe: {"extract": true, "info": "Die Tiefgarage wird 2025 saniert. Sonderumlage: 10.000 Euro.", "confidence": 0.95}

Frage: "Wann kann ich einziehen?"
Antwort: "Gerne! Die Wohnung ist ab sofort verfuegbar."
Ausgabe: {"extract": false}

Frage: "Wie sind die Nebenkosten?"
Antwort: "Die Heizkostenvorauszahlung liegt bei ca. 80 Euro monatlich, je nach Verbrauch."
Ausgabe: {"extract": true, "info": "Heizkostenvorauszahlung ca. 80 Euro pro Monat, verbrauchsabhaengig.", "confidence": 0.85}`;

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein Assistent, der relevante Fakten aus Immobilien-Konversationen extrahiert. Antworte nur mit validem JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Check if extraction was successful
    if (!result.extract || result.confidence < 0.7) {
      log.debug('No relevant knowledge extracted', {
        conversationId: input.conversationId,
        extract: result.extract,
        confidence: result.confidence,
      });
      return null;
    }

    // Append to seller notes
    const saved = await appendToSellerNotes(input.propertyId, result.info);

    if (saved) {
      log.info('Knowledge extracted and appended to seller notes', {
        info: result.info,
        confidence: result.confidence,
      });

      return {
        info: result.info,
        confidence: result.confidence,
      };
    }

    return null;
  } catch (error) {
    log.error('Failed to extract knowledge from chat', { error });
    return null;
  }
}

/**
 * Append extracted knowledge to seller_notes
 * Adds timestamp and [KI] label
 */
async function appendToSellerNotes(
  propertyId: string,
  newInfo: string
): Promise<boolean> {
  try {
    const timestamp = new Date().toLocaleDateString('de-DE');
    const formattedEntry = `\n\n[${timestamp} - KI] ${newInfo}`;

    await db.query(
      `UPDATE properties
       SET seller_notes = COALESCE(seller_notes, '') || $1
       WHERE id = $2`,
      [formattedEntry, propertyId]
    );

    return true;
  } catch (error) {
    log.error('Failed to append to seller notes', { error, propertyId });
    return false;
  }
}

/**
 * Get seller notes for AI context
 * Returns the seller_notes text from the property
 */
export async function getKnowledgeForProperty(
  propertyId: string
): Promise<string> {
  try {
    const result = await db.query(
      'SELECT seller_notes FROM properties WHERE id = $1',
      [propertyId]
    );

    return result.rows[0]?.seller_notes || '';
  } catch (error) {
    log.error('Failed to get seller notes for property', { error, propertyId });
    return '';
  }
}
