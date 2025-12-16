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

// Property data schema - using nullish() to accept both null and undefined
const PropertyDataSchema = z.object({
  property_type: z.enum(['apartment', 'house', 'villa', 'commercial']).nullish(),
  title: z.string().nullish(),
  location: z.string().nullish(),
  postal_code: z.string().nullish(),
  street_address: z.string().nullish(),
  price: z.number().nullish(),
  sqm: z.number().nullish(),
  rooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).nullish(),
  features: z.array(z.string()).nullish(),
  description: z.string().nullish(),
  floor_level: z.string().nullish(),
  total_floors: z.number().nullish(),
  year_built: z.number().nullish(),
  available_from: z.string().nullish(),
  important_notes: z.string().nullish(),
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
        isEditMode: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { message, conversationHistory, currentData, isEditMode } = input;

      try {
        // Calculate which fields are already known and which are still missing
        const priority1Fields = ['property_type', 'title', 'location', 'price', 'sqm', 'rooms', 'condition'] as const;
        const priority2Fields = ['bathrooms', 'floor_level', 'total_floors', 'year_built', 'postal_code', 'street_address', 'description', 'features', 'available_from', 'important_notes'] as const;

        const missingPriority1 = priority1Fields.filter(field => !currentData[field as keyof typeof currentData]);
        const missingPriority2 = priority2Fields.filter(field => !currentData[field as keyof typeof currentData]);

        // Build readable list of known fields with values
        const knownFieldsFormatted = [...priority1Fields, ...priority2Fields]
          .filter(field => currentData[field as keyof typeof currentData])
          .map(field => {
            const value = currentData[field as keyof typeof currentData];
            const displayValue = Array.isArray(value) ? value.join(', ') : value;
            return `- ${field}: ${displayValue}`;
          });

        // Build system prompt - different for edit mode vs create mode
        const systemPrompt = isEditMode
          ? `Du bist ein intelligenter Assistent, der beim BEARBEITEN einer bestehenden Immobilie hilft.

WICHTIG: Dies ist der EDIT-MODUS. Die Immobilie existiert bereits mit folgenden Daten:
${JSON.stringify(currentData, null, 2)}

VERFUEGBARE FELDER (verwende diese exakten Feldnamen):
- property_type: 'apartment' | 'house' | 'villa' | 'commercial'
- title: Titel der Immobilie
- location: Stadt/Bezirk
- price: Kaufpreis in Euro (Zahl)
- sqm: Wohnflaeche in qm (Zahl)
- rooms: Anzahl Zimmer (Zahl)
- bathrooms: Anzahl Badezimmer (Zahl)
- year_built: Baujahr (Zahl, z.B. 1974) - SEPARATES FELD, nicht Teil der Beschreibung!
- floor_level: NUR BEI WOHNUNGEN: Etage (String, z.B. "2" oder "EG")
- total_floors: NUR BEI HAEUSERN: Anzahl der Geschosse (Zahl, z.B. 2). Bei Wohnungen: Gesamtanzahl Etagen im Gebaeude.
- condition: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation'
- features: Array von Ausstattungen ["Balkon", "Garage", etc.]
- description: Beschreibungstext
- available_from: Verfuegbar ab (Datum)

ZEICHENSATZ-REGEL:
Verwende in deinen Antworten KEINE deutschen Umlaute oder Sonderzeichen!
Schreibe: ae statt ae, oe statt oe, ue statt ue, ss statt ss.

Deine Aufgabe im Edit-Modus:
1. Verstehe, welche Felder der User aendern moechte
2. Extrahiere die Aenderungen in die RICHTIGEN FELDER (z.B. "Baujahr 1974" -> year_built: 1974, NICHT description aendern!)
3. Bestaetige die Aenderungen freundlich
4. Frage NICHT nach fehlenden Feldern

WICHTIG - Property-Typ-abhaengige Felder:
- Bei Haeusern (house, villa): "Anzahl Geschosse" oder "zweigeschossig" etc. -> total_floors
- Bei Wohnungen (apartment): "3. Stock" oder "3. OG" -> floor_level

Beispiele:
- "Baujahr ist 1974" -> { "year_built": 1974 }
- "Aendere Preis auf 450.000 Euro" -> { "price": 450000 }
- "3. Stock" oder "3. OG" (bei Wohnung) -> { "floor_level": "3" }
- "2-geschossig" oder "2 Geschosse" (bei Haus) -> { "total_floors": 2 }
- "2 Badezimmer" -> { "bathrooms": 2 }

Antworte im JSON Format:
{
  "extractedData": { ... geaenderte Felder mit korrekten Feldnamen ... },
  "response": "Freundliche Bestaetigung, z.B. 'Perfekt! Baujahr auf 1974 gesetzt. Moechtest du noch etwas aendern?'",
  "missingFields": [],
  "followUpQuestion": null,
  "userSaidComplete": false
}

REGELN:
- Verwende die EXAKTEN Feldnamen (year_built, floor_level, etc.)
- Aendere NICHT die Beschreibung, wenn der User ein spezifisches Feld meint
- Wenn User "fertig" oder "speichern" sagt - setze userSaidComplete: true`

          : `Du bist ein intelligenter Assistent, der Immobiliendaten aus Benutzernachrichten extrahiert.

[BEREITS BEKANNTE DATEN - NIEMALS DANACH FRAGEN]:
${knownFieldsFormatted.length > 0 ? knownFieldsFormatted.join('\n') : 'Noch keine Daten vorhanden'}

[NOCH FEHLENDE PFLICHTFELDER - nur diese erfragen]:
${missingPriority1.length > 0 ? missingPriority1.join(', ') : 'ALLE PFLICHTFELDER VORHANDEN!'}

[NOCH FEHLENDE OPTIONALE FELDER]:
${missingPriority2.length > 0 ? missingPriority2.join(', ') : 'Keine'}

-------------------------------------------------------------------
WICHTIGSTE REGEL: Frage NIEMALS nach Feldern, die oben unter "BEREITS BEKANNTE DATEN" aufgefuehrt sind!
Wenn z.B. property_type bereits bekannt ist (z.B. "apartment"), dann frage NICHT "Um welche Art von Immobilie handelt es sich?"
-------------------------------------------------------------------

Deine Aufgabe:
1. Extrahiere strukturierte Daten aus der Nachricht des Benutzers
2. Bestaetige die NEU erkannten Werte in einer kurzen Auflistung
3. WENN alle Pflichtfelder vorhanden sind:
   - Teile mit, welche optionalen Felder noch ergaenzt werden koennten
   - Formuliere es als freundlichen Vorschlag, z.B.: "Du koenntest noch folgende Angaben ergaenzen: Baujahr, Etage, Beschreibung"
   - Frage nach EINEM der fehlenden optionalen Felder
4. WENN Pflichtfelder fehlen:
   - Frage nach dem naechsten fehlenden Pflichtfeld

WICHTIG - DEUTSCHE BEGRIFFE VERWENDEN:
Verwende in deinen Antworten IMMER deutsche Begriffe, NIEMALS die englischen Feldnamen!

ZEICHENSATZ-REGEL:
Verwende in deinen Antworten KEINE deutschen Umlaute oder Sonderzeichen!
Schreibe stattdessen:
- ae statt ä (z.B. "Baeder" statt "Bäder", "Wohnflaeche" statt "Wohnfläche")
- oe statt ö (z.B. "koennte" statt "könnte", "moechte" statt "möchte")
- ue statt ü (z.B. "fuer" statt "für", "Muenchen" statt "München")
- ss statt ß (z.B. "Strasse" statt "Straße", "Groesse" statt "Größe")
Dies ist SEHR WICHTIG fuer die korrekte Darstellung!

Uebersetze diese Feldnamen IMMER:
property_type -> Immobilientyp
title -> Titel
location -> Ort
price -> Preis
sqm -> Wohnflaeche (oder "qm")
rooms -> Zimmer
condition -> Zustand
bathrooms -> Baeder
floor_level -> Etage
total_floors -> Stockwerke
year_built -> Baujahr
postal_code -> PLZ
street_address -> Strasse
description -> Beschreibung
features -> Ausstattung
available_from -> Einzugstermin
important_notes -> Besonderheiten
heating_type -> Heizung
energy_efficiency_class -> Energieklasse

ANTWORT-FORMAT (NUR DEUTSCHE BEGRIFFE, KEINE UMLAUTE!):
Beispiel wenn Pflichtfelder fehlen:
"Ok, ich habe erfasst:
- Ort: Berlin
- Preis: 450.000 Euro
- Wohnflaeche: 85 qm

Wie viele Zimmer hat die Wohnung?"

Beispiel wenn alle Pflichtfelder vorhanden:
"Super, ich habe erfasst:
- Adresse: Hauptstr. 1
- Baujahr: 1985

Optional koenntest du noch ergaenzen: Stockwerke, Einzugstermin, Beschreibung.

Ab wann kann man einziehen?"

Feldtypen (INTERN - nicht in Antworten verwenden!):
- property_type: 'apartment' | 'house' | 'villa' | 'commercial'
- title: Kurzer beschreibender Titel
- location: Stadt/Bezirk
- price: Preis in Euro (Zahl)
- sqm: Wohnflaeche in qm (Zahl)
- rooms: Anzahl Zimmer (Zahl)
- condition: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation'
- bathrooms: Anzahl Badezimmer
- floor_level: NUR BEI WOHNUNGEN (apartment): Etage (z.B. "3" oder "EG") - NICHT bei Haeusern fragen!
- total_floors: NUR BEI HAEUSERN (house, villa): Anzahl der Geschosse
- year_built: Baujahr
- postal_code: Postleitzahl
- street_address: Strasse und Hausnummer
- description: Detaillierte Beschreibung der Immobilie
- features: Array von Ausstattungsmerkmalen
- available_from: Verfuegbar ab (Datum)
- important_notes: WICHTIGE rechtliche und finanzielle Details

WICHTIG - Property-Typ-abhaengige Felder:
- Bei property_type = 'house' oder 'villa': Frage nach "Anzahl der Geschosse" (total_floors), NICHT nach Etage (floor_level)
- Bei property_type = 'apartment': Frage nach "Etage" (floor_level)

REGELN:
1. Frage NIEMALS nach Feldern, die bereits bekannt sind (oben aufgelistet)!
2. Stelle immer nur EINE Frage nach einem fehlenden Feld
3. Priorisiere Pflichtfelder vor optionalen Feldern
4. Wenn alle Pflichtfelder vorhanden: Erwaehne welche optionalen Felder noch ergaenzt werden koennten
5. Wenn der User "fertig", "das wars", "keine weiteren Angaben" sagt - setze userSaidComplete: true

Antworte im JSON Format:
{
  "extractedData": { ... extrahierte Felder ... },
  "response": "Deine Antwort mit Auflistung der erkannten Werte UND Hinweis auf ergaenzbare Felder",
  "missingFields": ["field1", "field2"],
  "optionalFieldsSuggestion": "Baujahr, Etage, Beschreibung", // Liste der optionalen Felder die noch ergaenzt werden koennten (nur wenn alle Pflichtfelder vorhanden)
  "followUpQuestion": "Frage nach einem fehlenden Feld" // null wenn User fertig ist
  "userSaidComplete": false
}`;

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

        console.log('[AI Chat] Mode:', isEditMode ? 'EDIT' : 'CREATE');
        console.log('[AI Chat] AI extracted:', JSON.stringify(aiResponse.extractedData, null, 2));
        console.log('[AI Chat] AI response:', aiResponse.response);

        // Merge extracted data with current data
        const mergedData = {
          ...currentData,
          ...aiResponse.extractedData,
        };

        console.log('[AI Chat] Merged data:', JSON.stringify(mergedData, null, 2));

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
