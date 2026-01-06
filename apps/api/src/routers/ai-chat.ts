/**
 * AI Chat Router
 * Handles intelligent property data extraction from user messages
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';

// Property data schema - using nullish() to accept both null and undefined
const PropertyDataSchema = z.object({
  property_type: z.enum([
    'apartment', 'house', 'villa', 'multi_family',
    'land',
    'commercial', 'office', 'retail', 'industrial',
    'parking'
  ]).nullish(),
  title: z.string().nullish(),
  location: z.string().nullish(),
  postal_code: z.number().nullish(),
  street_address: z.string().nullish(),
  price: z.number().nullish(),
  sqm: z.number().nullish(),
  rooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  condition: z
    .enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation'])
    .nullish(),
  features: z.array(z.string()).nullish(),
  description: z.string().nullish(),
  floor_level: z
    .union([z.string(), z.number()])
    .transform(val => (val != null ? String(val) : val))
    .nullish(),
  elevator: z.boolean().nullish(),
  total_floors: z.number().nullish(),
  year_built: z.number().nullish(),
  available_from: z.string().nullish(),
  important_notes: z.string().nullish(),
  // Financial fields
  monthly_fee: z.number().nullish(), // Hausgeld
  monthly_rent: z.number().nullish(), // Mieteinnahmen (bei Kapitalanlage)
  commission_rate: z.number().nullish(), // Maklerprovision in %
  // AfA type - only set explicitly for Denkmal
  afa_type: z.enum(['bestand', 'altbau', 'neubau', 'denkmal']).nullish(),
  // Provider contact info (for import mode only)
  provider_name: z.string().nullish(),
  provider_email: z.string().email().nullish(),
  provider_phone: z.string().nullish(),
  provider_company: z.string().nullish(),
  // External property flag (for imported properties)
  is_external: z.boolean().nullish(),
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
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .default([]),
        currentData: PropertyDataSchema.default({}),
        isEditMode: z.boolean().optional(),
        isImportMode: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { message, conversationHistory, currentData, isEditMode, isImportMode } = input;

      try {
        // Property type MUST be asked FIRST
        const priority0Field = 'property_type' as const;

        // Type-specific required fields (calculation-critical)
        const priority1FieldsByType: Record<string, readonly string[]> = {
          apartment: ['location', 'price', 'sqm', 'rooms', 'monthly_rent', 'floor_level'],
          house: ['location', 'price', 'sqm', 'rooms', 'year_built'],
          villa: ['location', 'price', 'sqm', 'rooms', 'year_built'],
          multi_family: ['location', 'price', 'sqm', 'rooms', 'year_built', 'monthly_rent'],
          land: ['location', 'price', 'sqm'],
          commercial: ['location', 'price', 'sqm', 'monthly_rent'],
          office: ['location', 'price', 'sqm', 'monthly_rent'],
          retail: ['location', 'price', 'sqm', 'monthly_rent'],
          industrial: ['location', 'price', 'sqm', 'monthly_rent'],
          parking: ['location', 'price', 'monthly_rent'],
        };

        // Optional fields (everything else goes into description)
        const priority2Fields = [
          'bathrooms',
          'total_floors',
          'postal_code',
          'street_address',
          'condition',
          'features',
          'available_from',
          'important_notes',
          'monthly_fee',
          'commission_rate',
          'year_built', // Optional for some types
          'provider_name',
          'provider_email',
          'provider_phone',
          'provider_company',
        ] as const;

        // Determine missing fields based on property type
        let missingPriority1: readonly string[] = [];

        if (!currentData.property_type) {
          // If no property type yet, ONLY ask for property_type
          missingPriority1 = [priority0Field];
        } else {
          // Get type-specific required fields
          const requiredForType = priority1FieldsByType[currentData.property_type] || [];
          missingPriority1 = requiredForType.filter(
            field => !currentData[field as keyof typeof currentData]
          );
        }

        const missingPriority2 = priority2Fields.filter(
          field => !currentData[field as keyof typeof currentData]
        );

        // Build readable list of known fields with values
        const allPossibleFields = [
          priority0Field,
          ...Object.values(priority1FieldsByType).flat(),
          ...priority2Fields
        ];
        const knownFieldsFormatted = allPossibleFields
          .filter((field, index, arr) => arr.indexOf(field) === index) // Remove duplicates
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
- property_type: 'apartment' | 'house' | 'villa' | 'multi_family' | 'land' | 'commercial' | 'office' | 'retail' | 'industrial' | 'parking'
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
- provider_name: Name des Anbieters/Maklers (String)
- provider_email: E-Mail-Adresse des Anbieters (String, E-Mail-Format)
- provider_phone: Telefonnummer des Anbieters (String)
- provider_company: Firma des Anbieters (String)

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

        const editImportModeInstructions = `EDIT-IMPORT-MODUS ANWEISUNGEN:
Du hilfst beim BEARBEITEN einer importierten Immobilie (externe Immobilie als Notiz).

WICHTIG: Dies ist der EDIT-IMPORT-MODUS. Die importierte Immobilie existiert bereits mit folgenden Daten:
${JSON.stringify(currentData, null, 2)}

VERFUEGBARE FELDER (verwende diese exakten Feldnamen):
- property_type: 'apartment' | 'house' | 'villa' | 'multi_family' | 'land' | 'commercial' | 'office' | 'retail' | 'industrial' | 'parking'
- title: Titel der Immobilie (KURZ! z.B. "3-Zi Wohnung in Muenchen-Moosach")
- description: Beschreibung im KÄUFER-NOTIZ-STIL (sachlich, keine Verkaufssprache!)
- location: Stadt/Bezirk
- street_address: Straße und Hausnummer (optional)
- price: Kaufpreis in Euro (Zahl)
- sqm: Wohnflaeche in qm (Zahl)
- rooms: Anzahl Zimmer (Zahl)
- bathrooms: Anzahl Badezimmer (Zahl)
- year_built: Baujahr (Zahl, z.B. 1974)
- floor_level: NUR BEI WOHNUNGEN: Etage (String, z.B. "2" oder "EG")
- elevator: Aufzug vorhanden (Boolean: true/false)
- total_floors: NUR BEI HAEUSERN: Anzahl der Geschosse (Zahl)
- condition: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation'
- available_from: Verfuegbar ab (Datum)
- provider_name: Name des Anbieters/Maklers (String)
- provider_email: E-Mail-Adresse des Anbieters (String, E-Mail-Format)
- provider_phone: Telefonnummer des Anbieters (String)
- provider_company: Firma des Anbieters (String)

ZEICHENSATZ-REGEL:
Verwende in deinen Antworten KEINE deutschen Umlaute oder Sonderzeichen!
Schreibe: ae statt ä, oe statt ö, ue statt ü, ss statt ß.

TON UND STIL - SEHR WICHTIG:
- **SACHLICH** und **KURZ** (wie Notiz für Käufer, NICHT wie Verkaufstext!)
- Keine Emotionen, keine Verkaufssprache ("Dein Traumhaus!", "Place-to-be!")
- Einfache Aufzählung der Fakten

Deine Aufgabe im Edit-Import-Modus:
1. Verstehe, welche Felder der User aendern oder erweitern moechte
2. Extrahiere die Aenderungen in die RICHTIGEN FELDER
3. Bei Beschreibungs-Ergaenzungen: Fuege neue Infos in "📋 Die Hard-Facts" ein
4. Bestaetige die Aenderungen freundlich
5. Frage NICHT nach fehlenden Feldern

BESCHREIBUNG ERWEITERN (SEHR WICHTIG!):
Wenn User zusaetzliche Features oder Details nennt:
→ AKTUALISIERE die description und fuege sie in "📋 Die Hard-Facts" ein!

Beispiele:
User: "garten 160 qm, hobbyraum 16qm, fußbodenheizung"
→ Erweitere die bestehende description um:
   "• 🌳 Garten mit 160 qm
    • 🛠️ Hobbyraum: 16 qm
    • 🔥 Fussbodenheizung"

User: "balkon vorhanden"
→ Fuege zur description hinzu:
   "• ☀️ Balkon"

User: "bad wurde 2022 saniert"
→ Fuege zur description hinzu:
   "• 🛀 Bad saniert 2022"

User: "baujahr 1974"
→ year_built: 1974 UND description aktualisieren:
   "• 🏗️ Baujahr: 1974"

WICHTIG:
- Behalte den KÄUFER-NOTIZ-STIL bei (sachlich, keine Verkaufssprache!)
- Struktur: ✨ Ueberblick, 📋 Die Hard-Facts, 📍 Lage
- Emojis wie in importMode verwenden (🌳 🚗 🍳 🛀 🔥 🏢 🛗 etc.)

PROPERTY-TYP-ABHAENGIGE FELDER:
- Bei Haeusern (house, villa): "Anzahl Geschosse" oder "zweigeschossig" etc. -> total_floors
- Bei Wohnungen (apartment): "3. Stock" oder "3. OG" -> floor_level

PROVIDER-KONTAKTDATEN:
Wenn User Kontaktdaten aendert:
- "Email auf max@beispiel.de aendern" → provider_email: "max@beispiel.de"
- "Telefon auf 0123-456789 aendern" → provider_phone: "0123-456789"

Antworte im JSON Format:
{
  "extractedData": {
    "year_built": 1974,  // Falls geaendert
    "description": "✨ Ueberblick\n2-Zimmer-Wohnung in Graefelfing, 65 qm, saniert.\n\n📋 Die Hard-Facts\n• 🏠 2 Zimmer, 65 qm Wohnflaeche\n• 💰 Kaufpreis: 449.000 EUR\n• 🏗️ Baujahr: 1974\n• 🌳 Garten mit 160 qm\n• 🛠️ Hobbyraum: 16 qm\n• 🔥 Fussbodenheizung\n\n📍 Lage\nGraefelfing, ruhige Wohnlage."  // Erweitert!
  },
  "response": "Ok! Ich habe die Beschreibung erweitert:\n• Baujahr: 1974\n• Garten mit 160 qm\n• Hobbyraum: 16 qm\n• Fussbodenheizung\n\nSchau in die Vorschau!",
  "missingFields": [],
  "followUpQuestion": null,
  "userSaidComplete": false
}

REGELN:
- Verwende die EXAKTEN Feldnamen (year_built, floor_level, etc.)
- Du DARFST die Beschreibung erweitern/anpassen!
- Behalte den sachlichen Käufer-Notiz-Stil bei
- Wenn User "fertig" oder "speichern" sagt - setze userSaidComplete: true`;

        const importModeInstructions = `IMPORT-MODUS ANWEISUNGEN:
Du hilfst beim IMPORTIEREN einer Immobilie (z.B. aus Exposé, Screenshot oder User-Beschreibung).

WICHTIG: Dies ist der IMPORT-MODUS. User möchte eine externe Immobilie als Notiz speichern.

VERFUEGBARE FELDER (verwende diese exakten Feldnamen):
- property_type: 'apartment' | 'house' | 'villa' | 'multi_family' | 'land' | 'commercial' | 'office' | 'retail' | 'industrial' | 'parking'
- title: Titel der Immobilie (KURZ! z.B. "3-Zi Wohnung in Muenchen-Moosach")
- description: Beschreibung im KÄUFER-NOTIZ-STIL (sachlich, keine Verkaufssprache!)
- location: Stadt/Bezirk
- street_address: Straße und Hausnummer (optional)
- price: Kaufpreis in Euro (Zahl)
- sqm: Wohnflaeche in qm (Zahl)
- rooms: Anzahl Zimmer (Zahl)
- bathrooms: Anzahl Badezimmer (Zahl)
- year_built: Baujahr (Zahl, z.B. 1974)
- floor_level: NUR BEI WOHNUNGEN: Etage (String, z.B. "2" oder "EG")
- elevator: Aufzug vorhanden (Boolean: true/false)
- total_floors: NUR BEI HAEUSERN: Anzahl der Geschosse (Zahl)
- condition: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation'
- available_from: Verfuegbar ab (Datum)
- provider_name: Name des Anbieters/Maklers (String)
- provider_email: E-Mail-Adresse des Anbieters (String, E-Mail-Format)
- provider_phone: Telefonnummer des Anbieters (String)
- provider_company: Firma des Anbieters (String)

ZEICHENSATZ-REGEL:
Verwende in deinen Antworten KEINE deutschen Umlaute oder Sonderzeichen!
Schreibe: ae statt ä, oe statt ö, ue statt ü, ss statt ß.

TON UND STIL - SEHR WICHTIG:
- **SACHLICH** und **KURZ** (wie Notiz für Käufer, NICHT wie Verkaufstext!)
- Keine Emotionen, keine Verkaufssprache ("Dein Traumhaus!", "Place-to-be!")
- Einfache Aufzählung der Fakten

TITEL-GENERIERUNG:
- KURZ halten! MAX 40-50 Zeichen
- Format: "[Zimmer]-Zi [Typ] in [Ort-Stadtteil]"
- Beispiele:
  * "3-Zi Wohnung in Muenchen-Moosach"
  * "4-Zi Wohnung in Graefelfing"
  * "Einfamilienhaus in Muenchen-Pasing"

DESCRIPTION-GENERIERUNG (Käufer-Notiz-Stil):
Struktur mit 3 Abschnitten:

✨ Überblick
Kurze sachliche Zusammenfassung (1-2 Sätze):
"[Zimmer]-Zimmer-[Typ] in [Ort], [qm] qm, Baujahr [Jahr], [Zustand]."

📋 Die Hard-Facts
Bullet-Points mit Emojis für alle wichtigen Fakten:
• 🏠 [Zimmer] Zimmer, [qm] qm Wohnflaeche
• 💰 Kaufpreis: [Preis] EUR
• 🏗️ Baujahr: [Jahr]
• [Weitere Features mit passenden Emojis]

Emojis für Features:
• 🌳 Garten
• ☀️ Balkon / Terrasse
• 🚗 Garage / Stellplatz / Tiefgarage
• 🍳 Einbaukueche (EBK)
• 🛀 Bad / Badezimmer
• 🔥 Fussbodenheizung
• 🏢 Etage / Geschoss
• 🛗 Aufzug
• 💵 Mieteinnahmen (bei Kapitalanlage)
• 🏛️ Hausgeld

📍 Lage
1-2 Sätze zur Lage (sachlich):
"[Ort-Stadtteil], [Anbindung/Umgebung]."

BEISPIEL (Käufer-Notiz-Stil):
"✨ Ueberblick
3-Zimmer-Wohnung in Muenchen-Moosach, 85 qm, Baujahr 2010, saniert.

📋 Die Hard-Facts
• 🏠 3 Zimmer, 85 qm Wohnflaeche
• 💰 Kaufpreis: 520.000 EUR
• 🏗️ Baujahr: 2010
• 🏢 3. OG
• 🛗 Aufzug vorhanden
• 🌳 Garten mit 160 qm
• 🛠️ Hobbyraum: 16 qm
• 🔥 Fussbodenheizung
• 🚗 Tiefgarage
• 🍳 Einbaukueche (EBK)
• 🛀 Bad saniert 2022

📍 Lage
Muenchen-Moosach, U3 erreichbar, Olympiapark 10 Min."

WICHTIG - AUTOMATISCHE DESCRIPTION-AKTUALISIERUNG:

Wenn User IRGENDWELCHE Infos gibt (Features, Details, etc.):
→ SOFORT in description integrieren - NICHT warten auf "fuege zur Beschreibung hinzu"!

Beispiele:
User: "mit garten 160 qm und hobbyraum 16qm, fußbodenheizung"
→ SOFORT description aktualisieren:
   "📋 Die Hard-Facts
    • 🌳 Garten mit 160 qm
    • 🛠️ Hobbyraum: 16 qm
    • 🔥 Fussbodenheizung"

User: "balkon, tiefgarage"
→ SOFORT in description:
   "📋 Die Hard-Facts
    • ☀️ Balkon
    • 🚗 Tiefgarage"

User: "bad wurde 2022 saniert"
→ SOFORT in description:
   "📋 Die Hard-Facts
    • 🛀 Bad saniert 2022"

Du musst NICHT auf User-Anweisung warten!
JEDE neue Info → description update!

KRITISCH: description ist ein PFLICHTFELD!
- IMMER eine description generieren, auch wenn User nur wenige Infos gibt
- Mindestens: "✨ Ueberblick\n[Typ] in [Ort], [qm] qm.\n\n📋 Die Hard-Facts\n• [Features]"
- NIE description leer lassen - NIEMALS einen leeren String "" liefern!
- NIEMALS description: "" oder description: null oder description: undefined
- description MUSS Text enthalten - mindestens die Minimal-Struktur
- Struktur: ✨ Ueberblick, 📋 Die Hard-Facts, 📍 Lage

WORKFLOW:
1. User gibt Daten ein
2. Extrahiere Daten und generiere title + description
3. Pruefe welche PFLICHTFELDER noch fehlen:
   - property_type (Wohnung/Haus/...)
   - location (Ort)
   - price (Preis)
   - sqm (Wohnflaeche)
   - rooms (Zimmeranzahl)
   - condition (Zustand)
4. Wenn Pflichtfeld fehlt → Frage EXPLIZIT danach
5. Wenn ALLE Pflichtfelder da sind:
   - Frage nach wichtigen optionalen Feldern in EINER Frage:
     "Hast du noch Baujahr, Etage (z.B. EG/1/2), Aufzug (ja/nein) und Hausgeld (monatlich)?"
6. Wenn diese optionalen Felder beantwortet wurden:
   - Frage nach Anbieter-Kontaktdaten in EINER Frage:
     "Moechtest du noch Anbieter-Kontaktdaten speichern (Name, Email, Telefon)?"
7. Wenn User "nein" oder keine weiteren Angaben macht:
   - Sage nur: "✅ Super! Alle wichtigen Daten sind da. Moechtest du noch etwas hinzufuegen?"
8. Bei jeder neuen Info → description automatisch aktualisieren

WICHTIG BEI PROVIDER-KONTAKTDATEN:
- Provider-Daten werden in separaten Feldern gespeichert (provider_name, provider_email, provider_phone, provider_company)
- Provider-Daten NICHT in description schreiben!
- Beispiel: "Max Mustermann, max@immo.de" → provider_name: "Max Mustermann", provider_email: "max@immo.de"

Antworte im JSON Format:
{
  "extractedData": {
    "property_type": "apartment",
    "title": "3-Zi Wohnung in Muenchen-Moosach",  // KURZ!
    "description": "✨ Ueberblick\n3-Zimmer-Wohnung in Muenchen-Moosach, 85 qm, Baujahr 2010, saniert.\n\n📋 Die Hard-Facts\n• 🏠 3 Zimmer, 85 qm Wohnflaeche\n• 💰 Kaufpreis: 520.000 EUR\n• 🏗️ Baujahr: 2010\n• 🌳 Garten mit 160 qm\n\n📍 Lage\nMuenchen-Moosach, U3 erreichbar.",  // Käufer-Notiz-Stil!
    "location": "Muenchen-Moosach",
    "price": 520000,
    "sqm": 85,
    "rooms": 3,
    "year_built": 2010,
    "condition": "renovated",
    "provider_email": "max@immo.de",  // Falls User Kontaktdaten nennt
    "provider_name": "Max Mustermann",
    "provider_phone": "0123-456789"
  },
  "response": "Ok! Ich habe die Daten erfasst:\n• Wohnung in Muenchen-Moosach\n• 3 Zimmer, 85 qm\n• Preis: 520.000 EUR\n• Baujahr: 2010\n\nSchau in die Vorschau!",
  "missingFields": [],  // oder z.B. ["condition"] wenn noch fehlt
  "followUpQuestion": null,
  "userSaidComplete": false
}`;

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

WORKFLOW - PROPERTY_TYPE ZUERST (KRITISCH!):
1. WENN property_type noch NICHT bekannt ist:
   → Frage ZUERST und NUR nach dem Objekttyp
   → Stelle KEINE anderen Fragen bevor property_type gesetzt ist!
   → Beispiel: "Um welchen Objekttyp handelt es sich? (Wohnung, Haus, Grundstueck, Gewerbe, etc.)"

2. SOBALD property_type bekannt ist:
   → Frage nur nach den typ-spezifischen Pflichtfeldern
   → Siehe unten welche Felder pro Typ erforderlich sind

AUTOMATISCHE ERKENNUNG VON IMMOBILIENTYPEN (SEHR WICHTIG!):
- "Wohnung", "Apartment", "Eigentumswohnung", "ETW" -> property_type = 'apartment'
- "Haus", "Einfamilienhaus", "EFH", "Reihenhaus", "DHH" -> property_type = 'house'
- "Villa", "Landhaus" -> property_type = 'villa'
- "Mehrfamilienhaus", "MFH" -> property_type = 'multi_family'
- "Grundstueck", "Baugrundstu eck", "Land" -> property_type = 'land'
- "Gewerbe" -> property_type = 'commercial'
- "Buero", "Bueroflaeche" -> property_type = 'office'
- "Laden", "Einzelhandel", "Shop" -> property_type = 'retail'
- "Industrieflaeche", "Lager", "Halle" -> property_type = 'industrial'
- "Stellplatz", "Garage", "Tiefgarage", "Parkplatz" -> property_type = 'parking'
Wenn der User einen dieser Begriffe erwaehnt, setze property_type entsprechend und frage NICHT nochmal danach!

TYP-SPEZIFISCHE PFLICHTFELDER (NUR DIESE FRAGEN!):
- apartment (Wohnung): location, price, sqm, rooms, monthly_rent, floor_level
- house (Haus): location, price, sqm, rooms, year_built
- villa (Villa): location, price, sqm, rooms, year_built
- multi_family (Mehrfamilienhaus): location, price, sqm, rooms, year_built, monthly_rent
- land (Grundstueck): location, price, sqm (NUR 3 Felder!)
- commercial (Gewerbe): location, price, sqm, monthly_rent
- office (Buero): location, price, sqm, monthly_rent
- retail (Einzelhandel): location, price, sqm, monthly_rent
- industrial (Industrie): location, price, sqm, monthly_rent
- parking (Stellplatz): location, price, monthly_rent (OHNE sqm!)

WICHTIG: Frage NUR nach diesen Feldern! Alles andere geht in die description!

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

   TITEL-ANPASSUNG (WICHTIG - NUR EINMAL FRAGEN!):
   Nachdem die Basisdaten bekannt sind (Zimmer, Typ, Lage), frage EINMAL:
   "Ich habe einen Titel-Vorschlag generiert (siehe Vorschau). Möchtest du einen eigenen Titel eingeben?"

   Wenn User antwortet:
   - "Nein" / "Passt so" / "ist ok" → Behalte generierten Titel, fahre fort
   - "Ja" / nennt eigenen Titel → Überschreibe title mit User-Input
   - Ignoriert die Frage → Behalte generierten Titel, fahre fort

   WICHTIG: Diese Frage NUR EINMAL stellen! Nicht bei jeder Nachricht wiederholen!

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
provider_name -> Anbieter-Name / Makler-Name
provider_email -> Anbieter-E-Mail / Makler-E-Mail
provider_phone -> Anbieter-Telefon / Makler-Telefon
provider_company -> Anbieter-Firma / Maklerfirma

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
- property_type: 'apartment' | 'house' | 'villa' | 'multi_family' | 'land' | 'commercial' | 'office' | 'retail' | 'industrial' | 'parking'
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

WICHTIG - FEATURE-KATEGORISIERUNG:
Unterscheide zwischen STRUKTURIERTEN und UNSTRUKTURIERTEN Features:

STRUKTURIERTE Features (gehen NUR in features Array):
- Ausstattungsmerkmale: Balkon, Terrasse, Garten, Loggia
- Parken: Garage, Stellplatz, Tiefgarage, Duplex-Stellplatz
- Küche: Einbauküche, EBK, Pantry-Küche
- Boden: Parkett, Fliesen, Laminat, Marmor, Eichenparkett
- Heizung: Fußbodenheizung, Zentralheizung, Gasetagenheizung
- Technisch: Aufzug, Fahrstuhl, Videosprechanlage, Smart Home
- Sonstiges: Keller, Kellerabteil, Abstellraum, Barrierefrei
- Zustand: Neubau, Altbau, Denkmalschutz, Erstbezug

UNSTRUKTURIERTE Features (gehen ZUSÄTZLICH in description im Bereich "Die Hard-Facts"):
- Zeitangaben: "2022 saniert", "Bad neu 2023"
- Details: "Südbalkon mit Bergblick", "Tiefgarage wird 2025 saniert"
- Beschreibungen: "Hochwertige Einbauküche von Siemens"
- Besonderheiten: "Sonderumlage geplant"

BEISPIELE:
User: "Die Wohnung hat einen Balkon und wurde 2022 komplett saniert"
→ features: ["Balkon"]
→ description: Füge "Komplett saniert 2022" im Bereich "📋 Die Hard-Facts" ein

User: "Es gibt eine Tiefgarage, die wird aber 2025 saniert"
→ features: ["Tiefgarage"]
→ description: Füge "Tiefgarage (Sanierung 2025 geplant)" in "Die Hard-Facts" ein

User: "Südbalkon mit Bergblick"
→ features: ["Balkon"]
→ description: Füge "Südbalkon mit Bergblick" in "Die Hard-Facts" ein

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

ANBIETER-KONTAKTDATEN:
Die Provider-Kontaktdaten (provider_name, provider_email, provider_phone, provider_company) sind optionale Felder und werden wie andere optionale Felder behandelt.

Wenn alle Pflichtfelder vorhanden sind, frage nach den wichtigsten optionalen Feldern in dieser Reihenfolge:
1. Baujahr, Etage, Hausgeld
2. Anbieter-Kontaktdaten (wenn noch nicht vorhanden)

Beispiel-Frage:
"Hast du noch Baujahr, Etage (z.B. EG/1/2), Aufzug (ja/nein) und Hausgeld (monatlich)?"

Nach diesen optionalen Feldern:
"Moechtest du noch Anbieter-Kontaktdaten speichern (Name, Email, Telefon)?"

Beispiel-Extraktion:
User: "Anbieter heisst Sonja Bogatekin und ihre email adresse ist holl@mind-stack.com"
{
  "extractedData": {
    "provider_name": "Sonja Bogatekin",
    "provider_email": "holl@mind-stack.com"
  },
  "response": "Ok! Kontaktdaten gespeichert: Sonja Bogatekin (holl@mind-stack.com)"
}

User: "Max Mustermann, max@immobilien.de, 089-1234567, Mustermann Immobilien"
{
  "extractedData": {
    "provider_name": "Max Mustermann",
    "provider_email": "max@immobilien.de",
    "provider_phone": "089-1234567",
    "provider_company": "Mustermann Immobilien"
  },
  "response": "Ok! Kontaktdaten gespeichert: Max Mustermann (max@immobilien.de, 089-1234567)"
}

REGELN:
1. Frage NIEMALS nach Feldern, die bereits bekannt sind (oben aufgelistet)!
2. Stelle immer nur EINE Frage nach einem fehlenden Feld
3. Priorisiere Pflichtfelder vor optionalen Feldern
4. Wenn alle Pflichtfelder vorhanden: Erwaehne welche optionalen Felder noch ergaenzt werden koennten
5. Wenn der User "fertig", "das wars", "keine weiteren Angaben" sagt - setze userSaidComplete: true
6. GENERIERE IMMER title und description - und AKTUALISIERE sie bei neuen Infos!
7. NUR EINE NACHRICHT PRO TURN: Setze "followUpQuestion" IMMER auf null! Die Frage steht bereits in "response"!

Antworte im JSON Format:
{
  "extractedData": {
    "property_type": "apartment",  // IMMER setzen wenn User "Wohnung" etc. erwaehnt!
    "title": "Sonnige 2-Zi-Wohnung in Moosach",  // MAX 50-60 Zeichen! Kurz halten!
    "description": "✨ Der Vibe\nStell dir vor: Feierabend auf deinem eigenen Sued-Balkon, die Sonne im Gesicht, und die U-Bahn direkt ums Eck. Diese 2-Zimmer-Wohnung verbindet entspanntes Wohnen mit dem Puls von Muenchen.\n\n📋 Die Hard-Facts\n• 📐 52 m² perfekt geschnitten\n• 🍳 EBK inklusive – ready to cook\n• 🛀 Bad komplett saniert 2022\n• 🚗 Tiefgarage (Sanierung 2025 geplant)\n• ☀️ Suedbalkon mit Bergblick\n\n📍 Location-Check\nMoosach ist der Place-to-be! Olympiapark in 10 Min zum Joggen, U3 bringt dich in Rekordzeit in die City.",  // STORYTELLING mit klaren Bereichen!
    "location": "Muenchen-Moosach",
    "street_address": "Dresdner Str. 1",
    "sqm": 52,
    "rooms": 2,
    "floor_level": "3",  // "3 OG" oder "3. Stock" -> "3"
    "monthly_fee": 170,  // Hausgeld in Euro
    "monthly_rent": 1500,  // Mieteinnahmen bei Kapitalanlage
    "features": ["EBK", "Balkon", "Tiefgarage"]  // Nur strukturierte Features!
  },
  "response": "Ok, ich habe erfasst:\n- Etage: 3. OG\n- Hausgeld: 170 Euro/Monat\n- Mieteinnahmen: 1.500 Euro/Monat\n\nTitel und Beschreibung wurden aktualisiert - schau in die Vorschau!",
  "missingFields": [],
  "optionalFieldsSuggestion": "Baujahr, Energieklasse",
  "followUpQuestion": null,  // IMMER null! Frage steht bereits in response
  "userSaidComplete": false
}`;

        // Build final system prompt with master prompt base
        const modeInstructions = isImportMode
          ? importModeInstructions
          : isEditMode
            ? currentData.is_external
              ? editImportModeInstructions
              : editModeInstructions
            : createModeInstructions;
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

        console.log(
          '[AI Chat] Mode:',
          isImportMode
            ? 'IMPORT'
            : isEditMode
              ? currentData.is_external
                ? 'EDIT-IMPORT'
                : 'EDIT'
              : 'CREATE'
        );
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
  generateDescription: protectedProcedure.input(PropertyDataSchema).mutation(async ({ input }) => {
    try {
      const prompt = `Erstelle eine ansprechende, professionelle Immobilienbeschreibung basierend auf diesen Daten:

${JSON.stringify(input, null, 2)}

Die Beschreibung sollte:
- 3-4 Absätze umfassen
- Die wichtigsten Merkmale hervorheben
- Überzeugend und verkaufsorientiert sein
- Auf Deutsch verfasst sein`;

      const descriptionSystemPrompt = buildSystemPrompt(
        'seller',
        'Erstelle eine professionelle, verkaufsorientierte Immobilienbeschreibung.'
      );
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
