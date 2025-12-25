/**
 * Knowledge Learner Service
 * Extracts factual information from seller chat responses
 * and saves it to the knowledge base for future AI responses
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
  id: string;
  topic: string;
  content: string;
  category: string;
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
4. Wenn keine relevanten Fakten vorhanden sind, antworte mit: {"extract": false}

KATEGORIEN:
- costs: Kosten, Gebuehren, Umlagen, Hausgeld, Renovierungskosten
- renovation: Sanierungen, Modernisierungen, geplante Massnahmen
- legal: Rechtliches, Eigentuemerbeschluesse, Mietvertraege
- technical: Technische Details, Heizung, Fenster, Daemmung
- neighborhood: Umgebung, Nachbarn, Infrastruktur
- amenities: Ausstattung, Gemeinschaftseinrichtungen
- other: Sonstiges

AUSGABEFORMAT (JSON):
{
  "extract": true,
  "topic": "Kurzer Titel (max 50 Zeichen, z.B. 'Tiefgaragensanierung 2025')",
  "content": "Praezise Information in 1-2 Saetzen",
  "category": "eine der obigen Kategorien",
  "confidence": 0.0-1.0 (wie sicher bist du, dass dies ein relevanter Fakt ist?)
}

BEISPIELE:

Frage: "Gibt es geplante Sanierungen?"
Antwort: "Ja, die Tiefgarage wird naechstes Jahr saniert. Dafuer ist eine Sonderumlage von 10.000 Euro geplant."
Ausgabe: {"extract": true, "topic": "Tiefgaragensanierung 2025", "content": "Die Tiefgarage wird 2025 saniert. Sonderumlage: 10.000 Euro.", "category": "renovation", "confidence": 0.95}

Frage: "Wann kann ich einziehen?"
Antwort: "Gerne! Die Wohnung ist ab sofort verfuegbar."
Ausgabe: {"extract": false}

Frage: "Wie sind die Nebenkosten?"
Antwort: "Die Heizkostenvorauszahlung liegt bei ca. 80 Euro monatlich, je nach Verbrauch."
Ausgabe: {"extract": true, "topic": "Heizkosten", "content": "Heizkostenvorauszahlung ca. 80 Euro pro Monat, verbrauchsabhaengig.", "category": "costs", "confidence": 0.85}`;

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

    // Save to knowledge base
    const savedEntry = await saveToKnowledgeBase({
      propertyId: input.propertyId,
      userId: input.sellerId,
      topic: result.topic,
      content: result.content,
      category: result.category,
      confidence: result.confidence,
      sourceMessageId: input.messageId,
    });

    if (savedEntry) {
      log.info('Knowledge extracted and saved', {
        topic: result.topic,
        category: result.category,
        confidence: result.confidence,
      });

      return {
        id: savedEntry.id,
        topic: result.topic,
        content: result.content,
        category: result.category,
        confidence: result.confidence,
      };
    }

    return null;
  } catch (error) {
    log.error('Failed to extract knowledge from chat', { error });
    return null;
  }
}

interface SaveKnowledgeInput {
  propertyId: string;
  userId: string;
  topic: string;
  content: string;
  category: string;
  confidence: number;
  sourceMessageId: string;
}

/**
 * Save extracted knowledge to the database
 * Uses UPSERT to update existing entries with same topic
 */
async function saveToKnowledgeBase(
  input: SaveKnowledgeInput
): Promise<{ id: string } | null> {
  try {
    // Use INSERT ... ON CONFLICT to handle duplicate topics
    const result = await db.query(
      `INSERT INTO seller_knowledge_base
        (property_id, user_id, topic, content, category, source_type, source_message_id, confidence_score)
      VALUES ($1, $2, $3, $4, $5, 'chat_learned', $6, $7)
      ON CONFLICT (property_id, topic)
      DO UPDATE SET
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        source_message_id = EXCLUDED.source_message_id,
        confidence_score = EXCLUDED.confidence_score,
        updated_at = NOW()
      RETURNING id`,
      [
        input.propertyId,
        input.userId,
        input.topic,
        input.content,
        input.category,
        input.sourceMessageId,
        input.confidence,
      ]
    );

    return { id: result.rows[0].id };
  } catch (error) {
    log.error('Failed to save knowledge to database', { error });
    return null;
  }
}

/**
 * Get knowledge entries for AI context
 * Returns all active entries for a property
 */
export async function getKnowledgeForProperty(
  propertyId: string
): Promise<Array<{ topic: string; content: string; category: string }>> {
  try {
    const result = await db.query(
      `SELECT topic, content, category
      FROM seller_knowledge_base
      WHERE property_id = $1 AND is_active = true
      ORDER BY category, created_at DESC`,
      [propertyId]
    );

    return result.rows;
  } catch (error) {
    log.error('Failed to get knowledge for property', { error, propertyId });
    return [];
  }
}

/**
 * Search knowledge entries by relevance to a question
 * Uses PostgreSQL full-text search
 */
export async function searchRelevantKnowledge(
  propertyId: string,
  question: string,
  limit: number = 5
): Promise<Array<{ topic: string; content: string; category: string }>> {
  try {
    const result = await db.query(
      `SELECT
        topic,
        content,
        category,
        ts_rank(to_tsvector('german', topic || ' ' || content), plainto_tsquery('german', $2)) as rank
      FROM seller_knowledge_base
      WHERE property_id = $1
        AND is_active = true
        AND to_tsvector('german', topic || ' ' || content) @@ plainto_tsquery('german', $2)
      ORDER BY rank DESC
      LIMIT $3`,
      [propertyId, question, limit]
    );

    // If no full-text matches, return all entries (fallback)
    if (result.rows.length === 0) {
      return getKnowledgeForProperty(propertyId);
    }

    return result.rows;
  } catch (error) {
    log.error('Failed to search knowledge', { error, propertyId });
    // Fallback to returning all knowledge
    return getKnowledgeForProperty(propertyId);
  }
}
