/**
 * AI Chat Router
 * Handles intelligent property data extraction from user messages
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import OpenAI from 'openai';

// Lazy initialization: Create OpenAI client only when needed
let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    console.log('🔑 Initializing OpenAI client with key:', `${apiKey.substring(0, 10)}...`);
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Property data schema
const PropertyDataSchema = z.object({
  property_type: z.enum(['apartment', 'house', 'villa', 'commercial']).optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  postal_code: z.string().optional(),
  street_address: z.string().optional(),
  price: z.number().optional(),
  sqm: z.number().optional(),
  rooms: z.number().optional(),
  bathrooms: z.number().optional(),
  condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).optional(),
  features: z.array(z.string()).optional(),
  description: z.string().optional(),
  floor_level: z.string().optional(),
  year_built: z.number().optional(),
  available_from: z.string().optional(),
  important_notes: z.string().optional(),
});

export type ExtractedPropertyData = z.infer<typeof PropertyDataSchema>;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiChatRouter = router({
  /**
   * Extract property data from user message using AI
   */
  extractPropertyData: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })
        ).default([]),
        currentData: PropertyDataSchema.default({}),
      })
    )
    .mutation(async ({ input }) => {
      const { message, conversationHistory, currentData } = input;

      try {
        // Build system prompt
        const systemPrompt = `Du bist ein intelligenter Assistent, der Immobiliendaten aus Benutzernachrichten extrahiert.

Deine Aufgabe:
1. Extrahiere strukturierte Daten aus der Nachricht des Benutzers
2. Gib eine freundliche Antwort und liste die erkannten Werte auf
3. Frage nach fehlenden Informationen - aber immer nur EINE Frage auf einmal!
4. Frage systematisch nach ALLEN Feldern, um die Datenbank vollständig zu füllen

Erforderliche Felder (Priorität 1):
- property_type: 'apartment' | 'house' | 'villa' | 'commercial'
- title: Kurzer beschreibender Titel
- location: Stadt/Bezirk
- price: Preis in Euro (Zahl)
- sqm: Wohnfläche in qm (Zahl)
- rooms: Anzahl Zimmer (Zahl)
- condition: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation'

Alle weiteren Felder (Priorität 2 - systematisch erfragen):
- bathrooms: Anzahl Badezimmer
- floor_level: Etage (z.B. "3" oder "EG")
- year_built: Baujahr
- postal_code: Postleitzahl
- street_address: Straße und Hausnummer
- description: Detaillierte Beschreibung der Immobilie
- features: Array von Ausstattungsmerkmalen (z.B. ["Balkon", "Garage", "Einbauküche", "Garten", "Terrasse", "Stellplatz", "Aufzug", "Keller"])
- available_from: Verfügbar ab (Datum)
- important_notes: WICHTIGE rechtliche und finanzielle Details (z.B. Erbbaurecht, Nießbrauch, Denkmalschutz, Vorkaufsrecht, Wegerecht, Altlasten, laufende Renovierungen, Mietverträge, etc.)

WICHTIG:
1. In deiner Antwort sollst du die NEU erkannten Werte auflisten:
"Ok, ich habe folgende Daten verstanden:
- Preis: [Wert]
- Zimmer: [Wert]
..."

2. Stelle immer nur EINE Frage nach einem fehlenden Feld. Reihenfolge:
   - Zuerst alle erforderlichen Felder (Priorität 1)
   - Dann systematisch ALLE weiteren Felder (Priorität 2)

3. Stelle niemals mehrere Fragen auf einmal!

4. Frage nach JEDEM fehlenden Feld, bis alle Daten vollständig sind.

5. ERKENNUNG WENN DER USER FERTIG IST:
   - Wenn der User sagt "ich bin fertig", "das war's", "fertig", "keine weiteren Angaben" oder ähnliches,
     dann setze "userSaidComplete" auf true
   - NUR dann ist die Datenerfassung abgeschlossen
   - Solange der User nicht explizit sagt, dass er fertig ist, frage nach fehlenden Feldern weiter

Antworte im JSON Format:
{
  "extractedData": { ... extrahierte Felder ... },
  "response": "Deine freundliche Antwort mit Auflistung der erkannten Werte",
  "missingFields": ["field1", "field2"], // Liste der noch fehlenden erforderlichen Felder
  "followUpQuestion": "Konkrete Frage nach EINEM fehlendem Feld" // Frage nach dem nächsten fehlenden Feld
  "userSaidComplete": false // true nur wenn User explizit sagt, dass er fertig ist
}

Aktuell vorhandene Daten: ${JSON.stringify(currentData)}`;

        // Build messages for OpenAI
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: message },
        ];

        // Call OpenAI
        const completion = await getOpenAIClient().chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error('No response from AI');
        }

        // Parse JSON response - OpenAI returns UTF-8 encoded strings
        const aiResponse = JSON.parse(responseText);

        // Merge extracted data with current data
        const mergedData = {
          ...currentData,
          ...aiResponse.extractedData,
        };

        // Determine required fields that are still missing
        const requiredFields = ['property_type', 'title', 'location', 'price', 'sqm', 'rooms', 'condition'];
        const missingRequiredFields = requiredFields.filter(field => !mergedData[field]);

        // Only complete if user explicitly said they're done
        const isComplete = aiResponse.userSaidComplete === true;

        return {
          extractedData: mergedData,
          response: aiResponse.response,
          missingFields: missingRequiredFields,
          followUpQuestion: aiResponse.followUpQuestion || null,
          isComplete,
        };
      } catch (error) {
        console.error('Error in AI extraction:', error);
        throw new Error('Failed to process message with AI');
      }
    }),

  /**
   * Generate property description using AI
   */
  generateDescription: protectedProcedure
    .input(PropertyDataSchema)
    .mutation(async ({ input }) => {
      try {
        const prompt = `Erstelle eine ansprechende, professionelle Immobilienbeschreibung basierend auf diesen Daten:

${JSON.stringify(input, null, 2)}

Die Beschreibung sollte:
- 3-4 Absätze umfassen
- Die wichtigsten Merkmale hervorheben
- Überzeugend und verkaufsorientiert sein
- Auf Deutsch verfasst sein`;

        const completion = await getOpenAIClient().chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Du bist ein professioneller Immobilien-Texter.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
        });

        const description = completion.choices[0]?.message?.content;
        if (!description) {
          throw new Error('No description generated');
        }

        return { description };
      } catch (error) {
        console.error('Error generating description:', error);
        throw new Error('Failed to generate description');
      }
    }),
});
