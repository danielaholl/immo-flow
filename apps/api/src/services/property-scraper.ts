/**
 * Property Scraper Service
 * Scrapes property data from external sources like ImmobilienScout24
 * Uses Playwright for real browser-based scraping
 *
 * ⚠️ WICHTIG: Dieses Tool ist nur für persönlichen Gebrauch und Testzwecke gedacht.
 * Das Scraping von ImmobilienScout24 verstößt gegen deren AGB.
 * Rate-Limiting: Max 1 Request pro Minute pro User
 */
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

// Rate Limiting Map: userId -> lastRequestTime
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_DELAY_MS = 60000; // 1 Minute zwischen Requests

export interface ScrapedPropertyData {
  title: string;
  description: string;
  price: number;
  location: string;
  address?: string;
  postalCode?: string;
  sqm: number;
  rooms: number;
  bathrooms?: number;
  propertyType?: string;
  condition?: string;
  yearBuilt?: number;
  floorLevel?: string;
  totalFloors?: number;
  heatingType?: string;
  energySource?: string;
  monthlyFee?: number;
  images: string[];
  features: string[];
  externalSource: string;
}

/**
 * Detect the source platform from URL
 */
export function detectSource(url: string): string {
  if (url.includes('immobilienscout24')) return 'immoscout24';
  if (url.includes('immowelt')) return 'immowelt';
  if (url.includes('kleinanzeigen.de') || url.includes('ebay-kleinanzeigen')) return 'kleinanzeigen';
  return 'other';
}

/**
 * Check rate limiting for a user
 */
export function checkRateLimit(userId: string): { allowed: boolean; waitTime?: number } {
  const lastRequest = rateLimitMap.get(userId);
  const now = Date.now();

  if (lastRequest) {
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_DELAY_MS - timeSinceLastRequest) / 1000);
      return { allowed: false, waitTime };
    }
  }

  // Update last request time
  rateLimitMap.set(userId, now);
  return { allowed: true };
}

/**
 * Main scraping function that routes to the appropriate scraper
 */
export async function scrapePropertyUrl(url: string, userId?: string): Promise<ScrapedPropertyData> {
  // Rate limiting check
  if (userId) {
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      throw new Error(`Bitte warte noch ${rateCheck.waitTime} Sekunden. Rate-Limit: 1 Request pro Minute.`);
    }
  }

  const source = detectSource(url);

  console.log(`⚠️ [SCRAPER] Scraping ${source} - Nur für persönlichen Gebrauch!`);

  switch (source) {
    case 'immoscout24':
      return await scrapeImmoscout24(url);
    case 'kleinanzeigen':
      return await scrapeKleinanzeigen(url);
    default:
      throw new Error(`Scraping für ${source} ist noch nicht implementiert`);
  }
}

/**
 * Scrape property data from ImmobilienScout24 using ULTRA Stealth Scraper
 */
async function scrapeImmoscout24(url: string): Promise<ScrapedPropertyData> {
  // Use ULTRA stealth scraper with maximum anti-detection
  const { scrapeImmoscout24UltraStealth } = await import('./ultra-stealth-scraper.js');
  return await scrapeImmoscout24UltraStealth(url);
}

/**
 * OLD: Scrape property data from ImmobilienScout24 using Playwright (DEPRECATED - kept as backup)
 */
async function scrapeImmoscout24Old(url: string): Promise<ScrapedPropertyData> {
  let browser;

  try {
    console.log(`🔍 Starting real browser scraping for: ${url}`);

    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const context = await browser.newContext({
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
    });

    // Override navigator properties to hide automation
    await context.addInitScript(() => {
      // Override the `navigator.webdriver` property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override Chrome detection
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'denied' } as PermissionStatus) :
          originalQuery(parameters)
      );
    });

    const page = await context.newPage();

    // Navigate to the page
    console.log('🌐 Navigating to URL...');
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to load and simulate human behavior
    await page.waitForTimeout(3000);

    // Scroll down to simulate human behavior
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 3);
    });
    await page.waitForTimeout(1000);

    // Get the HTML content
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('✅ Page loaded successfully');

    // Extract basic information
    const title = $('h1[data-qa="expose-title"]').text().trim() ||
                  $('h1.font-title').first().text().trim() ||
                  $('h1').first().text().trim();

    const priceText = $('[data-qa="expose-price"]').text().trim() ||
                      $('.is24qa-kaufpreis').text().trim() ||
                      $('[class*="price"]').first().text().trim();
    const price = parsePrice(priceText);

    const location = $('[data-qa="expose-address"]').text().trim() ||
                     $('.address-block').text().trim() ||
                     $('.location').text().trim();

    const description = $('[data-qa="expose-description"]').text().trim() ||
                        $('.is24qa-objektbeschreibung').text().trim() ||
                        $('.description').text().trim();

    // Extract key data
    const keyData: Record<string, string> = {};
    $('[data-qa="expose-detail"]').each((_, elem) => {
      const label = $(elem).find('[data-qa="expose-detail-label"]').text().trim();
      const value = $(elem).find('[data-qa="expose-detail-value"]').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    // Alternative: extract from criteria list
    $('.criteriagroup').find('.grid-item').each((_, elem) => {
      const label = $(elem).find('.font-bold').text().trim().replace(':', '');
      const value = $(elem).find('dd').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    // Parse key data
    const sqm = parseNumber(
      keyData['wohnfläche'] ||
      keyData['fläche'] ||
      keyData['nutzfläche'] ||
      ''
    );

    const rooms = parseNumber(
      keyData['zimmer'] ||
      keyData['anzahl zimmer'] ||
      ''
    );

    const bathrooms = parseNumber(
      keyData['badezimmer'] ||
      keyData['anzahl badezimmer'] ||
      ''
    );

    const yearBuilt = parseNumber(
      keyData['baujahr'] ||
      ''
    );

    const monthlyFee = parseNumber(
      keyData['hausgeld'] ||
      keyData['nebenkosten'] ||
      ''
    );

    // Extract images
    const images: string[] = [];
    $('[data-qa="expose-image"]').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(src);
      }
    });

    // Alternative image selectors
    if (images.length === 0) {
      $('.gallery-image img, .sp-image img').each((_, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });
    }

    // Extract features
    const features: string[] = [];
    $('[data-qa="equipment-item"]').each((_, elem) => {
      const feature = $(elem).text().trim();
      if (feature) features.push(feature);
    });

    // Alternative features extraction
    if (features.length === 0) {
      $('.boolean-listing li').each((_, elem) => {
        const feature = $(elem).text().trim();
        if (feature) features.push(feature);
      });
    }

    // Log extracted data for debugging
    console.log('📊 Extracted data from ImmobilienScout24:');
    console.log('  - Title:', title);
    console.log('  - Price:', price);
    console.log('  - Location:', location);
    console.log('  - Sqm:', sqm);
    console.log('  - Rooms:', rooms);
    console.log('  - Bathrooms:', bathrooms);
    console.log('  - Year Built:', yearBuilt);
    console.log('  - Monthly Fee:', monthlyFee);
    console.log('  - Images:', images.length);
    console.log('  - Features:', features.length);

    // Validate required fields
    if (!title || !price || !location || !sqm || !rooms) {
      console.error('❌ Missing required fields!');
      console.error('  - Title:', title || 'MISSING');
      console.error('  - Price:', price || 'MISSING');
      console.error('  - Location:', location || 'MISSING');
      console.error('  - Sqm:', sqm || 'MISSING');
      console.error('  - Rooms:', rooms || 'MISSING');

      // Save HTML for debugging
      console.error('📄 Saving HTML snippet for debugging...');
      console.error('Title selectors tried:',
        $('h1[data-qa="expose-title"]').length,
        $('h1.font-title').length,
        $('h1').length
      );

      throw new Error('Konnte nicht alle erforderlichen Daten extrahieren. Möglicherweise hat sich die Seitenstruktur geändert oder die Seite ist blockiert.');
    }

    console.log('✅ All required fields extracted successfully!');

    return {
      title,
      description,
      price,
      location,
      sqm,
      rooms,
      bathrooms: bathrooms || undefined,
      yearBuilt: yearBuilt || undefined,
      monthlyFee: monthlyFee || undefined,
      images,
      features,
      externalSource: 'immoscout24',
    };

  } catch (error) {
    console.error('❌ [SCRAPER ERROR] ImmobilienScout24 scraping failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Throw error instead of returning mock data for debugging
    throw new Error(`Scraping fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

/**
 * Scrape property data from Kleinanzeigen.de using Playwright
 */
async function scrapeKleinanzeigen(url: string): Promise<ScrapedPropertyData> {
  let browser;

  try {
    console.log(`🔍 Starting Kleinanzeigen scraping for: ${url}`);

    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'de-DE',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    console.log('🌐 Navigating to Kleinanzeigen...');
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('✅ Kleinanzeigen page loaded successfully');

    // Extract title - Kleinanzeigen structure
    const title = $('h1#viewad-title').text().trim() ||
                  $('h1').first().text().trim();

    // Extract price
    const priceText = $('#viewad-price').text().trim() ||
                      $('.ad-price').text().trim() ||
                      $('[class*="price"]').first().text().trim();
    const price = parsePrice(priceText);

    // Extract location
    const location = $('#viewad-locality').text().trim() ||
                     $('.ad-address').text().trim() ||
                     $('[id*="locality"]').text().trim();

    // Extract description
    const description = $('#viewad-description-text').text().trim() ||
                        $('.ad-description').text().trim() ||
                        $('[id*="description"]').text().trim();

    // Extract details
    const details: Record<string, string> = {};
    $('.ad-details li, .addetailslist--detail').each((_, elem) => {
      const label = $(elem).find('.ad-details--title, dt').text().trim().toLowerCase();
      const value = $(elem).find('.ad-details--value, dd').text().trim();
      if (label && value) {
        details[label] = value;
      }
    });

    // Parse key data from details
    const sqm = parseNumber(
      details['wohnfläche'] ||
      details['fläche'] ||
      details['größe'] ||
      ''
    );

    const rooms = parseNumber(
      details['zimmer'] ||
      details['anzahl zimmer'] ||
      ''
    );

    const bathrooms = parseNumber(
      details['badezimmer'] ||
      details['anzahl badezimmer'] ||
      ''
    );

    const yearBuilt = parseNumber(
      details['baujahr'] ||
      ''
    );

    // Extract images
    const images: string[] = [];
    $('#viewad-image-gallery img, .galleryimage-element img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && !src.includes('placeholder') && src.startsWith('http')) {
        images.push(src);
      }
    });

    // Extract features
    const features: string[] = [];
    $('.ad-features li, .ad-details--value').each((_, elem) => {
      const feature = $(elem).text().trim();
      if (feature && feature.length > 2 && feature.length < 100) {
        features.push(feature);
      }
    });

    console.log('📊 Extracted data:', { title, price, location, sqm, rooms });

    // Validate required fields
    if (!title || !price || !location || !sqm || !rooms) {
      console.error('Missing required data:', { title, price, location, sqm, rooms });
      throw new Error('Konnte nicht alle erforderlichen Daten extrahieren.');
    }

    return {
      title,
      description,
      price,
      location,
      sqm,
      rooms,
      bathrooms: bathrooms || undefined,
      yearBuilt: yearBuilt || undefined,
      images,
      features,
      externalSource: 'kleinanzeigen',
    };

  } catch (error) {
    console.error('❌ [SCRAPER ERROR] Kleinanzeigen scraping failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Throw error instead of returning mock data for debugging
    throw new Error(`Kleinanzeigen Scraping fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

/**
 * Parse price string to number
 */
function parsePrice(priceText: string): number {
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
function parseNumber(text: string): number {
  const cleaned = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Generate mock property data for demo purposes
 * Used when actual scraping is blocked
 */
function generateMockPropertyData(url: string): ScrapedPropertyData {
  // Detect source for mock data
  const source = detectSource(url);

  // Extract a property ID from the URL if possible
  const idMatch = url.match(/\/(\d+)/);
  const propertyId = idMatch ? idMatch[1] : '123456789';

  // Generate realistic mock data based on different property types
  const propertyTypes = [
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

  // Select a property type based on the URL hash
  const hash = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const propertyData = propertyTypes[hash % propertyTypes.length];

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
