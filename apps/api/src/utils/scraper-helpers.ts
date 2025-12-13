/**
 * Property Scraper Helper Functions
 * Utility functions for web scraping
 */
import type { ScrapedPropertyData } from '../services/property-scraper.js';
import type { BrowserConfig, MockPropertyType } from '../types/scraper-types.js';

/**
 * Parse price string to number
 */
export function parsePrice(priceText: string): number {
  const cleaned = priceText
    .replace(/[^\d,.-]/g, '') // Remove non-numeric chars except , . -
    .replace(/\./g, '') // Remove thousands separator
    .replace(',', '.'); // Replace decimal comma with dot

  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

/**
 * Parse number from text
 */
export function parseNumber(text: string): number {
  const cleaned = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Get browser configuration for stealth scraping
 */
export function getBrowserConfig(): BrowserConfig {
  return {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'de-DE',
    viewport: { width: 1920, height: 1080 },
    javaScriptEnabled: true,
    acceptDownloads: false,
    hasTouch: false,
    isMobile: false,
    extraHTTPHeaders: {
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  };
}

/**
 * Get anti-detection script for browser context
 */
export function getAntiDetectionScript(): string {
  return `
    // Override the navigator.webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Override Chrome detection
    window.chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: 'denied' }) :
        originalQuery(parameters)
    );
  `;
}

/**
 * Mock property types for demo/testing
 */
export const MOCK_PROPERTY_TYPES: MockPropertyType[] = [
  {
    title: '3-Zimmer-Wohnung mit Balkon in München-Schwabing',
    description: 'Schöne 3-Zimmer-Wohnung in zentraler Lage von München-Schwabing. Die Wohnung verfügt über einen sonnigen Balkon, eine moderne Einbauküche und ein renoviertes Badezimmer. Die Wohnung befindet sich in einem gepflegten Altbau mit Fahrstuhl. Ideal für Paare oder kleine Familien. Gute Anbindung an öffentliche Verkehrsmittel.',
    price: 450000,
    location: 'München - Schwabing',
    sqm: 85,
    rooms: 3,
    bathrooms: 1,
    yearBuilt: 1965,
    monthlyFee: 380,
    features: ['Balkon', 'Einbauküche', 'Fahrstuhl', 'Renoviert', 'Zentralheizung', 'Parkettboden'],
  },
  {
    title: 'Moderne 2-Zimmer-Neubau-Wohnung in Berlin-Mitte',
    description: 'Exklusive 2-Zimmer-Wohnung in begehrter Lage Berlin-Mitte. Neubau mit hochwertiger Ausstattung, Fußbodenheizung und bodentiefen Fenstern. Offene Wohnküche mit Designergeräten. Echtholzparkett und große Terrasse mit Südausrichtung. Perfekt für Singles oder Paare, die urbanes Wohnen schätzen.',
    price: 520000,
    location: 'Berlin - Mitte',
    sqm: 68,
    rooms: 2,
    bathrooms: 1,
    yearBuilt: 2023,
    monthlyFee: 250,
    features: ['Terrasse', 'Fußbodenheizung', 'Neubau', 'Designerküche', 'Parkett', 'Tiefgarage'],
  },
  {
    title: 'Geräumige 4-Zimmer-Wohnung mit Garten in Hamburg-Eppendorf',
    description: 'Traumhafte 4-Zimmer-Wohnung mit eigenem Garten in ruhiger Lage von Hamburg-Eppendorf. Die Wohnung besticht durch großzügige Räume, hohe Decken und viel Tageslicht. Der private Garten lädt zum Entspannen ein. Zwei moderne Bäder, eine separate Küche und ein Arbeitszimmer machen diese Wohnung perfekt für Familien.',
    price: 680000,
    location: 'Hamburg - Eppendorf',
    sqm: 120,
    rooms: 4,
    bathrooms: 2,
    yearBuilt: 1978,
    monthlyFee: 520,
    features: ['Garten', 'Zwei Bäder', 'Arbeitszimmer', 'Hohe Decken', 'Parkplatz', 'Keller'],
  },
];

/**
 * Generate mock property data for demo purposes
 * Used when actual scraping is blocked
 */
export function generateMockPropertyData(url: string, source: string): ScrapedPropertyData {
  // Extract a property ID from the URL if possible
  const idMatch = url.match(/\/(\d+)/);
  const propertyId = idMatch ? idMatch[1] : '123456789';

  // Select a property type based on the URL hash
  const hash = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const propertyData = MOCK_PROPERTY_TYPES[hash % MOCK_PROPERTY_TYPES.length];

  return {
    ...propertyData,
    address: propertyData.location,
    postalCode: undefined,
    condition: 'maintained',
    floorLevel: '2. OG',
    totalFloors: 4,
    heatingType: 'central',
    energySource: 'gas',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    externalSource: source,
  };
}

/**
 * Extract images from HTML (generic helper)
 */
export function extractImages($: any, selectors: string[]): string[] {
  const images: string[] = [];

  selectors.forEach(selector => {
    $(selector).each((_: any, elem: any) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(src);
      }
    });
  });

  return images;
}

/**
 * Extract features from HTML (generic helper)
 */
export function extractFeatures($: any, selectors: string[]): string[] {
  const features: string[] = [];

  selectors.forEach(selector => {
    $(selector).each((_: any, elem: any) => {
      const feature = $(elem).text().trim();
      if (feature) {
        features.push(feature);
      }
    });
  });

  return features;
}

/**
 * Validate required property fields
 */
export function validatePropertyData(data: {
  title?: string;
  price?: number;
  location?: string;
  sqm?: number;
  rooms?: number;
}): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!data.title) missing.push('title');
  if (!data.price) missing.push('price');
  if (!data.location) missing.push('location');
  if (!data.sqm) missing.push('sqm');
  if (!data.rooms) missing.push('rooms');

  return {
    valid: missing.length === 0,
    missing,
  };
}
