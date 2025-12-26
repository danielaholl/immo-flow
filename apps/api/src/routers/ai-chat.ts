/**
 * AI Chat Router
 * Handles intelligent property data extraction from user messages
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';

// Property data schema - using nullish() to accept both null and undefined
const PropertyDataSchema = z.object({
  property_type: z.enum(['apartment', 'house', 'villa', 'commercial']).nullish(),
  title: z.string().nullish(),
  location: z.string().nullish(),
  postal_code: z.number().nullish(),
  street_address: z.string().nullish(),
  price: z.number().nullish(),
  sqm: z.number().nullish(),
  rooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).nullish(),
  features: z.array(z.string()).nullish(),
  description: z.string().nullish(),
  floor_level: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : val).nullish(),
  elevator: z.boolean().nullish(),
  total_floors: z.number().nullish(),
  year_built: z.number().nullish(),
  available_from: z.string().nullish(),
  important_notes: z.string().nullish(),
  // Financial fields
  monthly_fee: z.number().nullish(),        // Hausgeld
  monthly_rent: z.number().nullish(),       // Mieteinnahmen (bei Kapitalanlage)
  commission_rate: z.number().nullish(),    // Maklerprovision in %
  // AfA type - only set explicitly for Denkmal
  afa_type: z.enum(['bestand', 'altbau', 'neubau', 'denkmal']).nullish(),
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
        // Note: title and description are auto-generated, so they're not in priority fields
        // commission_rate is priority 1 because it's important financial info shown below price
        const priority1Fields = ['property_type', 'location', 'price', 'commission_rate', 'sqm', 'rooms', 'condition'] as const;
        const priority2Fields = ['bathrooms', 'floor_level', 'total_floors', 'year_built', 'postal_code', 'street_address', 'features', 'available_from', 'important_notes', 'monthly_fee', 'monthly_rent'] as const;

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

        // Build system prompt with master prompt base - different for edit mode vs create mode
        const editModeInstructions = `EDIT-MODUS ANWEISUNGEN:
Du hilfst beim BEARBEITEN einer bestehenden Immobilie.

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
- elevator: Aufzug vorhanden (Boolean: true/false) - relevant bei Wohnungen
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
- Wenn User "fertig" oder "speichern" sagt - setze userSaidComplete: true`;

        const createModeInstructions = `CREATE-MODUS ANWEISUNGEN:
Du hilfst beim ERSTELLEN einer neuen Immobilie.

[BEREITS BEKANNTE DATEN - NIEMALS DANACH FRAGEN]:
${knownFieldsFormatted.length > 0 ? knownFieldsFormatted.join('\n') : 'Noch keine Daten vorhanden'}

[NOCH FEHLENDE PFLICHTFELDER - nur diese erfragen]:
${missingPriority1.length > 0 ? missingPriority1.join(', ') : 'ALLE PFLICHTFELDER VORHANDEN!'}

[NOCH FEHLENDE OPTIONALE FELDER]:
${missingPriority2.length > 0 ? missingPriority2.join(', ') : 'Keine'}

-------------------------------------------------------------------
WICHTIGSTE REGELN:
1. Frage NIEMALS nach Feldern, die oben unter "BEREITS BEKANNTE DATEN" aufgefuehrt sind!
2. Frage NIEMALS zweimal nach dem gleichen Feld!
3. Wenn der User "Wohnung", "Apartment" o.ae. sagt -> property_type = 'apartment' (NICHT nochmal fragen!)
4. Wenn der User "Haus", "Einfamilienhaus" o.ae. sagt -> property_type = 'house' (NICHT nochmal fragen!)
-------------------------------------------------------------------

AUTOMATISCHE ERKENNUNG VON IMMOBILIENTYPEN (SEHR WICHTIG!):
- "Wohnung", "Apartment", "Eigentumswohnung", "ETW", "Zimmer-Wohnung" -> property_type = 'apartment'
- "Haus", "Einfamilienhaus", "EFH", "Reihenhaus", "Doppelhaushaelfte", "DHH" -> property_type = 'house'
- "Villa", "Landhaus" -> property_type = 'villa'
- "Gewerbe", "Buero", "Laden", "Geschaeft" -> property_type = 'commercial'
Wenn der User einen dieser Begriffe erwaehnt, setze property_type entsprechend und frage NICHT nochmal danach!

AUTOMATISCHE GENERIERUNG VON TITEL UND BESCHREIBUNG (SEHR WICHTIG - IMMER SOFORT MACHEN!):
Bei JEDER Antwort MUSST du title und description generieren oder AKTUALISIEREN!

WICHTIG: Wenn der User neue Infos liefert, AKTUALISIERE title und description entsprechend!
- Neuer Preis bekannt? -> Evtl. "Attraktiver Preis" oder Preisklasse im Titel erwaehnen
- Neue Features? -> In die Beschreibung aufnehmen
- Baujahr/Zustand bekannt? -> "Kernsaniert 2022" oder "Neubau" im Titel/Beschreibung
- Besondere Lage? -> "Ruhige Lage", "Zentral", "Mit Bergblick" etc. hervorheben

1. **title**: Erstelle/aktualisiere einen catchy, modernen Titel
   - MAXIMAL 50-60 ZEICHEN! Kurz und praegnant halten!
   - Optional: EIN Emoji am Anfang (☀️🏠✨🌳) fuer Social-Media-Appeal
   - Format: "[Emoji] [Adjektiv] [Zimmer]-Zi in [Stadtteil]" oder kreativ
   - Beispiele (alle unter 50 Zeichen):
     * "☀️ Sonnige 2-Zi-Wohnung in Moosach" (34 Zeichen)
     * "✨ Sanierte 3-Zi mit Isar-Naehe" (31 Zeichen)
     * "🏔️ Helle 2-Zi mit Bergblick" (27 Zeichen)
     * "Stylische City-Wohnung in Schwabing" (35 Zeichen)
   - Kuerze: "Zimmer" -> "Zi", "Wohnung" kann auch weg wenn klar
   - Bei Updates: Tausche Highlights aus, aber halte es kurz!

2. **description**: Erstelle/aktualisiere eine STORYTELLING-Beschreibung (Social-Media-Style)
   - NICHT wie ein trockener Makler schreiben! Sondern emotional, modern, catchy
   - Perfekt fuer TikTok, Instagram und junge Zielgruppen
   - KLARE TRENNUNG der Bereiche mit Ueberschriften!

   STRUKTUR der Beschreibung (mit klaren Ueberschriften):

   **✨ Der Vibe**
   1-2 Saetze die ein Bild malen, wie sich das Leben dort anfuehlt.

   **📋 Die Hard-Facts**
   Bullet-Points mit Emojis fuer alle wichtigen Fakten:
   • 📐 Flaeche
   • 🍳 Kueche
   • 🛀 Bad
   • 🚗 Parken
   • ☀️ Balkon/Terrasse
   • 🏗️ Zustand

   **📍 Location-Check**
   1-2 Saetze zur Lage: Anbindung, Umgebung, Lifestyle.

   TONALITAET je nach Zielgruppe:
   - Jung/Singles/Paare: Locker, "Place-to-be", "Dein neues Nest"
   - Familien: Warm, "Platz fuer alle", "Euer Familientraum"
   - Investoren: Rendite-Fokus, Zahlen betonen

   BEISPIEL (mit klarer Struktur):
   "✨ Der Vibe
   Stell dir vor: Feierabend auf deinem eigenen Sued-Balkon, die Sonne im Gesicht, und die U-Bahn direkt ums Eck. Diese 2-Zimmer-Wohnung verbindet entspanntes Wohnen mit dem Puls von Muenchen.

   📋 Die Hard-Facts
   • 📐 52 m² perfekt geschnitten
   • 🍳 EBK inklusive – ready to cook
   • 🛀 Bad 2022 komplett saniert
   • 🚗 Eigener Tiefgaragenstellplatz
   • ☀️ Suedbalkon fuer Sonnenanbeter

   📍 Location-Check
   Moosach ist der Place-to-be! Olympiapark in 10 Min zum Joggen, U3 bringt dich in Rekordzeit in die City oder zu BMW."

Deine Aufgabe:
1. Extrahiere strukturierte Daten aus der Nachricht des Benutzers
2. GENERIERE oder AKTUALISIERE title und description bei JEDER Antwort!
   - Erste Nachricht: Erstelle initiale Version
   - Folgenachrichten: Aktualisiere wenn neue relevante Infos (Features, Lage, Zustand, etc.)
3. Bestaetige die NEU erkannten Werte in einer kurzen Auflistung
4. WENN alle Pflichtfelder vorhanden sind:
   - Teile mit, welche optionalen Felder noch ergaenzt werden koennten
   - Formuliere es als freundlichen Vorschlag
5. WENN Pflichtfelder fehlen:
   - Frage nach dem naechsten fehlenden Pflichtfeld
   - ABER: Stelle die Frage NUR EINMAL (nicht in response UND followUpQuestion!)

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
elevator -> Aufzug
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
monthly_fee -> Hausgeld
monthly_rent -> Mieteinnahmen
commission_rate -> Maklerprovision

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
- elevator: Aufzug vorhanden (true/false) - bei Wohnungen relevant
- total_floors: NUR BEI HAEUSERN (house, villa): Anzahl der Geschosse
- year_built: Baujahr
- postal_code: Postleitzahl
- street_address: Strasse und Hausnummer
- description: Detaillierte Beschreibung der Immobilie
- features: Array von Ausstattungsmerkmalen
- available_from: Verfuegbar ab (Datum)
- important_notes: WICHTIGE rechtliche und finanzielle Details
- monthly_fee: Hausgeld in Euro pro Monat (Zahl, z.B. 170)
- monthly_rent: Mieteinnahmen in Euro pro Monat bei Kapitalanlage (Zahl, z.B. 1500)
- commission_rate: Maklerprovision in Prozent (Zahl, z.B. 3.57)
- afa_type: NUR bei Denkmalschutz setzen: 'denkmal' (sonst wird automatisch berechnet)

WICHTIG - Property-Typ-abhaengige Felder:
- Bei property_type = 'house' oder 'villa': Frage nach "Anzahl der Geschosse" (total_floors), NICHT nach Etage (floor_level)
- Bei property_type = 'apartment': Frage nach "Etage" (floor_level)

WICHTIG - Provision (commission_rate):
- NACHDEM der Preis bekannt ist, IMMER fragen: "Wird die Immobilie mit Maklerprovision verkauft? Wenn ja, wie hoch ist sie in %?"
- Wenn User "provisionsfrei", "keine Provision", "ohne Makler" sagt -> commission_rate: 0
- Wenn User z.B. "3,57% Provision" oder "Maklergebuehr 3%" sagt -> commission_rate: 3.57
- Die Provision wird unterhalb des Preises angezeigt, daher ist diese Info wichtig!

WICHTIG - Denkmalschutz (afa_type):
- WENN User "denkmalgeschuetzt", "Denkmalschutz", "Denkmal-Afa", "unter Denkmalschutz" erwaehnt -> afa_type: 'denkmal'
- WENN die Beschreibung auf ein historisches Gebaeude hinweist (z.B. "historisch", "Altbau mit Charme", "Gruenderzeit"), frage: "Steht das Gebaeude unter Denkmalschutz?"
- Bei "ja" -> afa_type: 'denkmal'
- Bei "nein" oder nicht erwaehnt -> afa_type NICHT setzen (wird automatisch aus Baujahr berechnet)
- Der AfA-Typ wird fuer Steuerberechnungen verwendet (9% Denkmal-AfA vs 2%/2.5% normal)

REGELN:
1. Frage NIEMALS nach Feldern, die bereits bekannt sind (oben aufgelistet)!
2. Stelle immer nur EINE Frage nach einem fehlenden Feld
3. Priorisiere Pflichtfelder vor optionalen Feldern
4. Wenn alle Pflichtfelder vorhanden: Erwaehne welche optionalen Felder noch ergaenzt werden koennten
5. Wenn der User "fertig", "das wars", "keine weiteren Angaben" sagt - setze userSaidComplete: true
6. GENERIERE IMMER title und description - und AKTUALISIERE sie bei neuen Infos!
7. KEINE DOPPELTEN FRAGEN: Wenn du in "response" eine Frage stellst, setze "followUpQuestion" auf null!

Antworte im JSON Format:
{
  "extractedData": {
    "property_type": "apartment",  // IMMER setzen wenn User "Wohnung" etc. erwaehnt!
    "title": "Sonnige 2-Zi-Wohnung in Moosach",  // MAX 50-60 Zeichen! Kurz halten!
    "description": "✨ Der Vibe\nStell dir vor: Feierabend auf deinem eigenen Sued-Balkon, die Sonne im Gesicht, und die U-Bahn direkt ums Eck. Diese 2-Zimmer-Wohnung verbindet entspanntes Wohnen mit dem Puls von Muenchen.\n\n📋 Die Hard-Facts\n• 📐 52 m² perfekt geschnitten\n• 🍳 EBK inklusive – ready to cook\n• 🛀 Bad 2022 komplett saniert\n• 🚗 Eigener Tiefgaragenstellplatz\n• ☀️ Suedbalkon fuer Sonnenanbeter\n\n📍 Location-Check\nMoosach ist der Place-to-be! Olympiapark in 10 Min zum Joggen, U3 bringt dich in Rekordzeit in die City.",  // STORYTELLING mit klaren Bereichen!
    "location": "Muenchen-Moosach",
    "street_address": "Dresdner Str. 1",
    "sqm": 52,
    "rooms": 2,
    "floor_level": "3",  // "3 OG" oder "3. Stock" -> "3"
    "monthly_fee": 170,  // Hausgeld in Euro
    "monthly_rent": 1500,  // Mieteinnahmen bei Kapitalanlage
    "features": ["EBK", "Suedbalkon", "Bad 2022 saniert", "Tiefgarage"]
  },
  "response": "Ok, ich habe erfasst:\n- Etage: 3. OG\n- Hausgeld: 170 Euro/Monat\n- Mieteinnahmen: 1.500 Euro/Monat\n\nTitel und Beschreibung wurden aktualisiert - schau in die Vorschau!",
  "missingFields": [],
  "optionalFieldsSuggestion": "Baujahr, Energieklasse",
  "followUpQuestion": null,  // IMMER null! Frage steht bereits in response
  "userSaidComplete": false
}`;

        // Build final system prompt with master prompt base
        const modeInstructions = isEditMode ? editModeInstructions : createModeInstructions;
        const systemPrompt = buildSystemPrompt('assistant', modeInstructions);

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
          model: 'gpt-5.2',
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
        // Note: title is auto-generated so not required from user
        const requiredFields = ['property_type', 'location', 'price', 'sqm', 'rooms', 'condition'];
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

        const descriptionSystemPrompt = buildSystemPrompt('seller', 'Erstelle eine professionelle, verkaufsorientierte Immobilienbeschreibung.');
        const completion = await getOpenAIClient().chat.completions.create({
          model: 'gpt-5.2',
          messages: [
            { role: 'system', content: descriptionSystemPrompt },
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
