/**
 * PDF Parser Service
 * Extracts property data from PDF exposés using pdf-parse and OpenAI
 */
import { createRequire } from 'module';
import OpenAI from 'openai';
import { extractImagesFromPdf } from './pdf-image-extractor.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('pdf-parser');
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface ScrapedPropertyData {
  title: string;
  description: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  images: string[];
  features: string[];
  propertyType?: 'apartment' | 'house' | 'villa' | 'commercial'; // Type of property
  yearBuilt?: number;
  condition?: string;
  monthlyFee?: number;
  bathrooms?: number;
  floorLevel?: string; // For apartments: which floor
  totalFloors?: number; // For houses: number of floors
  postalCode?: string;
  streetAddress?: string;
  exposeText?: string; // Full PDF text for detailed AI analysis
  externalSource?: string; // Optional for PDF uploads (required for URL scraping)
}

/**
 * Extract property data from PDF buffer
 */
export async function parsePDFExpose(pdfBuffer: Buffer): Promise<ScrapedPropertyData> {
  let parser;
  try {
    // Extract text from PDF using pdf-parse v2 API
    parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    const text = result.text;

    if (!text || text.trim().length < 100) {
      throw new Error('PDF enthält zu wenig Text zum Analysieren');
    }

    // Extract embedded images from PDF (up to 10 images)
    let images: string[] = [];
    try {
      console.log('🖼️  Extracting embedded images from PDF...');
      images = await extractImagesFromPdf(pdfBuffer, 10);
      console.log(`✅ Extracted ${images.length} embedded images from PDF`);
    } catch (imageError) {
      console.error('Error extracting images from PDF:', imageError);
      // Continue without images
    }

    // Use OpenAI to extract structured data from the PDF text
    const propertyData = await extractPropertyDataWithAI(text);

    // Add extracted images and full text
    propertyData.images = images;
    propertyData.exposeText = text;

    return propertyData;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Fehler beim Parsen der PDF-Datei');
  } finally {
    // Clean up parser resources
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.error('Error destroying parser:', destroyError);
      }
    }
  }
}

/**
 * Use OpenAI to extract structured property data from PDF text
 */
async function extractPropertyDataWithAI(text: string): Promise<ScrapedPropertyData> {
  const prompt = `Extrahiere die Immobiliendaten aus diesem Text eines Immobilien-Exposés.

TEXT:
${text.substring(0, 8000)} // Limit to avoid token limits

AUFGABE:
Extrahiere die folgenden Informationen und gib sie als JSON zurück:
- propertyType: Art der Immobilie - MUSS einer dieser Werte sein: "apartment" (Wohnung, Apartment, Eigentumswohnung), "house" (Haus, Einfamilienhaus, Reihenhaus, Doppelhaushälfte), "villa" (Villa, Landhaus), "commercial" (Gewerbe, Büro, Laden)
- title: Titel/Überschrift der Immobilie
- description: Beschreibung (max 2000 Zeichen)
- price: Kaufpreis in Euro (nur Zahl, ohne Währung)
- location: Ort/Stadt
- streetAddress: Strasse und Hausnummer (optional)
- postalCode: Postleitzahl (optional)
- sqm: Wohnfläche in Quadratmetern (nur Zahl)
- rooms: Anzahl der Zimmer (nur Zahl)
- bathrooms: Anzahl Badezimmer (optional)
- floorLevel: Bei Wohnungen: Etage (z.B. "3", "EG", "DG") (optional)
- totalFloors: Bei Häusern: Anzahl Geschosse (optional)
- features: Array von Ausstattungsmerkmalen (z.B. "Balkon", "Garage", "Einbauküche")
- yearBuilt: Baujahr (optional, nur wenn vorhanden)
- condition: Zustand (optional, z.B. "Erstbezug", "Renoviert", "Gepflegt", "Sanierungsbedürftig")
- monthlyFee: Hausgeld/Nebenkosten pro Monat in Euro (optional, nur wenn vorhanden)

Antworte NUR mit einem gültigen JSON-Objekt, ohne zusätzlichen Text.

BEISPIEL:
{
  "propertyType": "apartment",
  "title": "Schöne 3-Zimmer-Wohnung in München",
  "description": "Helle und moderne Wohnung...",
  "price": 450000,
  "location": "München",
  "streetAddress": "Musterstrasse 10",
  "postalCode": "80331",
  "sqm": 75,
  "rooms": 3,
  "bathrooms": 1,
  "floorLevel": "3",
  "features": ["Balkon", "Einbauküche", "Parkett"],
  "yearBuilt": 2015,
  "condition": "Erstbezug",
  "monthlyFee": 280
}

WICHTIG:
- propertyType MUSS immer erkannt werden! Hinweise: "Wohnung", "Apt", "Apartment", "ETW", "Zimmer-Wohnung" → "apartment"; "Haus", "EFH", "DHH", "RH" → "house"
- Wenn ein Wert nicht gefunden wird, verwende sinnvolle Schätzungen basierend auf dem Kontext
- Preis und Fläche müssen IMMER vorhanden sein (erforderlich)
- Wenn mehrere Preise genannt werden (z.B. Kaltmiete und Kaufpreis), nimm den Kaufpreis
- Räume können Dezimalzahlen sein (z.B. 2.5 für 2,5 Zimmer)`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für das Extrahieren von strukturierten Daten aus Immobilien-Exposés. Antworte immer mit gültigem JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten');
    }

    const extracted = JSON.parse(content);

    // Validate and normalize the data
    if (!extracted.price || !extracted.sqm) {
      throw new Error('Preis und Fläche konnten nicht extrahiert werden');
    }

    // Normalize propertyType
    let propertyType: 'apartment' | 'house' | 'villa' | 'commercial' | undefined;
    if (extracted.propertyType) {
      const pt = extracted.propertyType.toLowerCase();
      if (['apartment', 'wohnung', 'eigentumswohnung', 'etw'].includes(pt)) {
        propertyType = 'apartment';
      } else if (['house', 'haus', 'einfamilienhaus', 'efh', 'reihenhaus', 'doppelhaushälfte', 'dhh'].includes(pt)) {
        propertyType = 'house';
      } else if (['villa', 'landhaus'].includes(pt)) {
        propertyType = 'villa';
      } else if (['commercial', 'gewerbe', 'büro', 'laden'].includes(pt)) {
        propertyType = 'commercial';
      } else if (['apartment', 'house', 'villa', 'commercial'].includes(pt)) {
        propertyType = pt as 'apartment' | 'house' | 'villa' | 'commercial';
      }
    }

    return {
      title: extracted.title || 'Immobilie ohne Titel',
      description: extracted.description || '',
      price: parseFloat(extracted.price),
      location: extracted.location || 'Unbekannt',
      streetAddress: extracted.streetAddress || undefined,
      postalCode: extracted.postalCode || undefined,
      sqm: parseFloat(extracted.sqm),
      rooms: parseFloat(extracted.rooms) || 1,
      bathrooms: extracted.bathrooms ? parseInt(extracted.bathrooms) : undefined,
      floorLevel: extracted.floorLevel || undefined,
      totalFloors: extracted.totalFloors ? parseInt(extracted.totalFloors) : undefined,
      images: [], // Images will be added by parsePDFExpose
      features: Array.isArray(extracted.features) ? extracted.features : [],
      propertyType,
      yearBuilt: extracted.yearBuilt ? parseInt(extracted.yearBuilt) : undefined,
      condition: extracted.condition || undefined,
      monthlyFee: extracted.monthlyFee ? parseFloat(extracted.monthlyFee) : undefined,
    };
  } catch (error) {
    console.error('OpenAI extraction error:', error);

    // Fallback: Try simple regex-based extraction
    return extractPropertyDataWithRegex(text);
  }
}

/**
 * Fallback: Extract property data using regex patterns
 * Used when OpenAI is not available or fails
 */
function extractPropertyDataWithRegex(text: string): ScrapedPropertyData {
  const textLower = text.toLowerCase();

  // Detect property type from text
  let propertyType: 'apartment' | 'house' | 'villa' | 'commercial' | undefined;
  if (textLower.includes('wohnung') || textLower.includes('apartment') || textLower.includes('etw') ||
      textLower.includes('eigentumswohnung') || /\d[- ]?zi[- ]?wohnung/i.test(text) ||
      /\d[- ]?zimmer[- ]?wohnung/i.test(text) || textLower.includes('-zi-apt') || textLower.includes('apt.')) {
    propertyType = 'apartment';
  } else if (textLower.includes('villa') || textLower.includes('landhaus')) {
    propertyType = 'villa';
  } else if (textLower.includes('haus') || textLower.includes('einfamilienhaus') || textLower.includes('efh') ||
             textLower.includes('reihenhaus') || textLower.includes('doppelhaushälfte') || textLower.includes('dhh')) {
    propertyType = 'house';
  } else if (textLower.includes('gewerbe') || textLower.includes('büro') || textLower.includes('laden') ||
             textLower.includes('gewerbefläche')) {
    propertyType = 'commercial';
  }

  // Common patterns in German property listings
  const priceMatch = text.match(/Kaufpreis[:\s]+(?:EUR\s*)?([0-9.,]+)/i) ||
                     text.match(/Preis[:\s]+(?:EUR\s*)?([0-9.,]+)/i);
  const sqmMatch = text.match(/Wohnfläche[:\s]+([0-9.,]+)\s*m²/i) ||
                   text.match(/([0-9.,]+)\s*m²/i);
  const roomsMatch = text.match(/Zimmer[:\s]+([0-9.,]+)/i) ||
                     text.match(/([0-9.,]+)[- ]Zimmer/i);
  const locationMatch = text.match(/(?:Ort|Lage|Adresse)[:\s]+([^\n]+)/i);

  const price = priceMatch ? parseFloat(priceMatch[1].replace(/[.,]/g, '')) : 0;
  const sqm = sqmMatch ? parseFloat(sqmMatch[1].replace(',', '.')) : 0;
  const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : 1;
  const location = locationMatch ? locationMatch[1].trim() : 'Unbekannt';

  // Extract title (usually first line or first heading)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const title = lines[0]?.substring(0, 200) || 'Immobilie';

  // Extract first paragraph as description
  const description = text.substring(0, 1000);

  // Common features to look for
  const possibleFeatures = [
    'Balkon', 'Terrasse', 'Garten', 'Garage', 'Stellplatz', 'Tiefgarage',
    'Einbauküche', 'Parkett', 'Fußbodenheizung', 'Aufzug', 'Keller',
    'Barrierefrei', 'Neubau', 'Altbau', 'Denkmalschutz'
  ];
  const features = possibleFeatures.filter(feature =>
    text.toLowerCase().includes(feature.toLowerCase())
  );

  if (!price || !sqm) {
    throw new Error('Preis und Fläche konnten nicht aus der PDF extrahiert werden. Bitte überprüfe das Dokument.');
  }

  return {
    title,
    description,
    price,
    location,
    sqm,
    rooms,
    images: [],
    features,
    propertyType,
  };
}
