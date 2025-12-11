/**
 * Screenshot Analyzer Service
 * Verwendet OpenAI Vision API um Text und Daten aus Screenshots zu extrahieren
 */

import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';

const log = createLogger('screenshot-analyzer');

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface ScreenshotAnalysisResult {
  extractedText: string;
  structuredData?: {
    title?: string;
    price?: number;
    location?: string;
    sqm?: number;
    rooms?: number;
    description?: string;
    features?: string[];
    [key: string]: any;
  };
}

/**
 * Analysiert einen einzelnen Screenshot und extrahiert Text
 */
export async function analyzeScreenshot(
  imageBase64: string
): Promise<ScreenshotAnalysisResult> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // Unterstützt Vision
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Immobilien-Exposés.
Deine Aufgabe ist es, Screenshots von Immobilienportalen zu analysieren und alle relevanten Informationen zu extrahieren.

Extrahiere ALLE sichtbaren Informationen aus dem Screenshot, inklusive:
- Immobiliendetails (Preis, Größe, Zimmer, etc.)
- Beschreibungstexte
- Ausstattungsmerkmale
- Lage-Informationen
- Energieausweis-Daten
- Kontaktinformationen (falls sichtbar)
- Alle anderen relevanten Details

Gib den kompletten Text strukturiert zurück.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Bitte extrahiere alle Informationen aus diesem Screenshot eines Immobilien-Exposés:',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high', // Hohe Auflösung für bessere Texterkennung
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1, // Niedrig für konsistente Extraktion
    });

    const extractedText = response.choices[0]?.message?.content || '';

    return {
      extractedText,
    };
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    throw new Error(`Screenshot-Analyse fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Analysiert mehrere Screenshots und kombiniert die Ergebnisse
 */
export async function analyzeMultipleScreenshots(
  imagesBase64: string[]
): Promise<{
  combinedText: string;
  screenshots: ScreenshotAnalysisResult[];
}> {
  console.log(`Analysiere ${imagesBase64.length} Screenshots mit OpenAI Vision...`);

  // Analysiere alle Screenshots parallel (aber mit Rate Limiting)
  const screenshots: ScreenshotAnalysisResult[] = [];

  // Verarbeite Screenshots in Batches von 3 (um API Rate Limits zu vermeiden)
  const batchSize = 3;
  for (let i = 0; i < imagesBase64.length; i += batchSize) {
    const batch = imagesBase64.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((imageBase64) => analyzeScreenshot(imageBase64))
    );
    screenshots.push(...batchResults);

    // Kurze Pause zwischen Batches
    if (i + batchSize < imagesBase64.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Kombiniere alle extrahierten Texte
  const combinedText = screenshots
    .map((result, idx) => {
      return `\n\n=== Screenshot ${idx + 1} ===\n${result.extractedText}`;
    })
    .join('\n');

  console.log(`✅ ${screenshots.length} Screenshots erfolgreich analysiert`);
  console.log(`Kombinierter Text: ${combinedText.length} Zeichen`);

  return {
    combinedText,
    screenshots,
  };
}

/**
 * Extrahiert strukturierte Immobilien-Daten aus kombiniertem Screenshot-Text
 * Nutzt AI um den Text in strukturierte Felder zu konvertieren
 */
export async function extractPropertyDataFromScreenshots(
  combinedText: string
): Promise<any> {
  log.info('Extracting structured data from screenshot text');

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Immobilien-Exposés.
Deine Aufgabe ist es, aus extrahierten Texten von Screenshots strukturierte Immobiliendaten zu erstellen.

Extrahiere folgende Felder (falls vorhanden):
- title: Titel/Überschrift der Immobilie
- description: Vollständige Objektbeschreibung
- price: Kaufpreis in Euro (nur die Zahl)
- location: Ort/Stadt
- address: Vollständige Adresse (falls vorhanden)
- postalCode: Postleitzahl
- sqm: Wohnfläche in m² (nur die Zahl)
- rooms: Anzahl Zimmer (Dezimalzahl, z.B. 3.5)
- bathrooms: Anzahl Badezimmer
- yearBuilt: Baujahr
- floor: Etage (z.B. "2. OG", "EG", "DG")
- monthlyFee: Hausgeld/Nebenkosten pro Monat
- heatingType: Heizungsart
- energyClass: Energieeffizienzklasse
- features: Array von Ausstattungsmerkmalen
- highlights: Besondere Highlights
- redFlags: Potenzielle Probleme (falls erkennbar)

Gib NUR ein valides JSON-Objekt zurück, ohne zusätzlichen Text.
Wenn ein Feld nicht gefunden wird, setze es auf null.`,
        },
        {
          role: 'user',
          content: `Extrahiere strukturierte Immobilien-Daten aus folgendem Text:\n\n${combinedText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten');
    }

    const propertyData = JSON.parse(content);

    console.log('✅ Strukturierte Daten extrahiert:', propertyData);

    // Add the combined text as exposeText for later analysis
    propertyData.exposeText = combinedText;

    return propertyData;
  } catch (error) {
    console.error('Error extracting property data:', error);
    throw new Error(`Daten-Extraktion fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}
