/**
 * Seller Analysis Service
 * Provides AI-powered insights for property sellers to optimize their listings
 */

import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';

const log = createLogger('seller-analysis');

export interface SellerAnalysis {
  listing_quality_score: number; // 0-100
  completeness: {
    score: number; // 0-100
    missing_fields: string[];
    suggestions: string[]; // Spezifische Vorschläge zur Vervollständigung
  };
  photo_quality: {
    score: number; // 0-100
    photo_count: number;
    recommended_count: number;
    suggestions: string[]; // Spezifische Vorschläge zu Fotos
  };
  market_position: {
    price_comparison: 'above_market' | 'market_average' | 'below_market';
    percentage_difference: number;
    market_average_price_per_sqm: number; // Geschätzter Marktdurchschnitt in €/m²
    recommendation: string; // Detaillierte Preisempfehlung
  };
  selling_points: string[]; // Top 3-5 Verkaufsargumente - Highlights der Immobilie
  improvements: string[]; // Top 3 Quick Wins - kurze, priorisierte Handlungsempfehlungen
  generated_at: string;
}

interface PropertyData {
  title: string;
  description: string | null;
  price: number;
  sqm: number;
  rooms: number;
  location: string;
  images: string[] | null;
  property_type: string | null;
  year_built: number | null;
  condition: string | null;
  energy_efficiency_class: string | null;
  energy_certificate: string | null;
  heating_type: string | null;
  energy_source: string | null;
  bathrooms: number | null;
  floor_level: string | null;
  total_floors: number | null;
  available_from: string | null;
  usable_area: number | null;
  monthly_fee: number | null;
  features: string[] | null;
}

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function generateSellerAnalysis(property: PropertyData): Promise<SellerAnalysis> {
  const prompt = `Du bist ein erfahrener Immobilienmakler mit 20+ Jahren Erfahrung. Analysiere dieses Immobilieninserat aus Verkäufer-Perspektive und gib konkrete Verbesserungsvorschläge.

IMMOBILIEN-DATEN:
Titel: ${property.title}
Beschreibung: ${property.description || 'NICHT VORHANDEN'}
Preis: ${property.price} €
Fläche: ${property.sqm} m²
Zimmer: ${property.rooms}
Standort: ${property.location}
Typ: ${property.property_type || 'NICHT ANGEGEBEN'}
Baujahr: ${property.year_built || 'NICHT ANGEGEBEN'}
Zustand: ${property.condition || 'NICHT ANGEGEBEN'}
Energieeffizienzklasse: ${property.energy_efficiency_class || 'NICHT ANGEGEBEN'}
Energieausweis: ${property.energy_certificate || 'NICHT VORHANDEN'}
Heizungsart: ${property.heating_type || 'NICHT ANGEGEBEN'}
Energieträger: ${property.energy_source || 'NICHT ANGEGEBEN'}
Badezimmer: ${property.bathrooms || 'NICHT ANGEGEBEN'}
Etage: ${property.floor_level || 'NICHT ANGEGEBEN'} von ${property.total_floors || 'NICHT ANGEGEBEN'}
Verfügbar ab: ${property.available_from || 'NICHT ANGEGEBEN'}
Nutzfläche: ${property.usable_area || 'NICHT ANGEGEBEN'} m²
Nebenkosten: ${property.monthly_fee || 'NICHT ANGEGEBEN'} €
Anzahl Fotos: ${property.images?.length || 0}
Ausstattung: ${property.features?.join(', ') || 'KEINE ANGABEN'}

Erstelle eine Verkäufer-Analyse im folgenden JSON-Format:

{
  "listing_quality_score": <0-100, Gesamtbewertung der Inseratsqualität>,
  "completeness": {
    "score": <0-100, wie vollständig sind die Angaben>,
    "missing_fields": [<Liste fehlender wichtiger Felder>],
    "suggestions": [<2-3 konkrete, detaillierte Vorschläge zum Vervollständigen der fehlenden Angaben>]
  },
  "photo_quality": {
    "score": <0-100, Bewertung der Foto-Situation>,
    "photo_count": ${property.images?.length || 0},
    "recommended_count": <empfohlene Anzahl>,
    "suggestions": [<2-3 konkrete, detaillierte Vorschläge zur Verbesserung der Fotos>]
  },
  "market_position": {
    "price_comparison": "<above_market|market_average|below_market>",
    "percentage_difference": <geschätzte Abweichung vom Marktdurchschnitt in %>,
    "market_average_price_per_sqm": <geschätzter Marktdurchschnitt in €/m² als ganze Zahl>,
    "recommendation": "<Detaillierte Preisempfehlung basierend auf Marktposition>"
  },
  "selling_points": [
    <Liste von 3-5 KURZEN Verkaufsargumenten (max. 50 Zeichen) - die Highlights der Immobilie>
  ],
  "improvements": [
    <Liste von maximal 3 KURZEN Quick Wins (1 Satz pro Vorschlag) - die wichtigsten Sofortmaßnahmen>
  ]
}

WICHTIG - UNTERSCHIED ZWISCHEN DEN FELDERN:
1. **suggestions in completeness/photo_quality**: DETAILLIERTE, spezifische Vorschläge (2-3 Sätze)
2. **selling_points**: KURZE Verkaufsargumente (max. 50 Zeichen) - die Highlights der Immobilie
3. **improvements**: KURZE Quick Wins (1 Satz) - die Top 3 Prioritäten zum Sofort-Umsetzen

SELLING_POINTS (Verkaufsargumente - 3-5 Highlights):
- Identifiziere die STÄRKEN und HIGHLIGHTS der Immobilie
- Maximal 50 Zeichen pro Punkt
- Beispiele: "Ruhige Lage im Grünen", "Neubau 2020", "Großer Balkon mit Südausrichtung", "Niedrige Nebenkosten", "Fußbodenheizung", "Garage inklusive"
- Fokussiere auf: Lage, Zustand, Ausstattung, Energieeffizienz, Preis-Leistung
- Wenn wenig Infos vorhanden, generiere trotzdem 2-3 allgemeine Highlights basierend auf Zimmeranzahl, Fläche, Lage

IMPROVEMENTS (Top 3 Quick Wins):
- Sei konstruktiv und ermutigend
- **MAXIMAL 3 KURZE Verbesserungsvorschläge** (je 1 Satz)
- Wähle die 3 wichtigsten Sofortmaßnahmen mit höchster Wirkung
- Beispiele: "Fügen Sie 5 professionelle Fotos hinzu", "Ergänzen Sie Baujahr und Energieausweis", "Senken Sie den Preis um 10% auf Marktniveau"
- Priorisiere nach Impact: Fehlende Fotos > Fehlende Pflichtangaben > Preisanpassung
- Wenn das Inserat bereits gut ist, schlage nur 1-2 Optimierungen vor

SUGGESTIONS (Detaillierte Vorschläge):
- In completeness.suggestions: 2-3 detaillierte Tipps zum Vervollständigen (Was genau fehlt und warum es wichtig ist)
- In photo_quality.suggestions: 2-3 detaillierte Tipps zu Fotos (Welche Perspektiven, Beleuchtung, etc.)
- market_position.recommendation: Ausführliche Preisempfehlung mit Begründung

PREISEMPFEHLUNGEN:
- Berechne SELBST den geschätzten Marktdurchschnitt für ${property.location} basierend auf Immobilientyp, Lage und Größe
- Aktueller Preis pro m²: ${Math.round(property.price / property.sqm)} €/m²
- Runde ALLE Zahlen auf ganze Euro-Beträge (keine Dezimalstellen!)

- Wenn "below_market" (Preis unter Marktdurchschnitt):
  → Positive Formulierung: "Ausgezeichnete Verkaufschancen! Ihr attraktiver Preis liegt ca. [DIFFERENZ gerundet] € pro m² unter dem Marktdurchschnitt von ca. [MARKTPREIS gerundet] €/m², was zu schnellem Verkauf und hoher Nachfrage führen sollte."

- Wenn "market_average" (Preis im Marktdurchschnitt):
  → Neutrale Formulierung: "Ihr Preis liegt bei ca. [MARKTPREIS gerundet] €/m² und entspricht damit dem aktuellen Marktdurchschnitt. Um sich von der Konkurrenz abzuheben, empfehlen wir die Optimierung Ihrer Fotos und Beschreibung."

- Wenn "above_market" (Preis über Marktdurchschnitt):
  → Konstruktive Empfehlung: "Ihr Preis liegt bei ${Math.round(property.price / property.sqm)} €/m² und damit ca. [DIFFERENZ gerundet] € pro m² über dem Marktdurchschnitt von ca. [MARKTPREIS gerundet] €/m². Eine Preisanpassung könnte die Anzahl der Interessenten deutlich erhöhen."

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Immobilienmakler mit 20+ Jahren Erfahrung. Antworte immer nur mit validen JSON-Objekten, ohne zusätzlichen Text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as Omit<SellerAnalysis, 'generated_at'>;

    return {
      ...analysis,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating seller analysis:', error);
    throw new Error('Failed to generate seller analysis');
  }
}
