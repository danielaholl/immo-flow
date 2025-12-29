/**
 * ImmobilienScout24 Scraper (Legacy/Backup)
 * Old Playwright-based scraper kept as backup
 */
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import type { ScrapedPropertyData } from '../property-scraper.js';
import { createLogger } from '@rendito/utils';
import {
  parsePrice,
  parseNumber,
  getBrowserConfig,
  getAntiDetectionScript,
  extractImages,
  extractFeatures,
  validatePropertyData,
} from '../../utils/scraper-helpers.js';

const log = createLogger('immoscout24-scraper');

/**
 * Scrape property data from ImmobilienScout24 using Playwright (DEPRECATED - kept as backup)
 */
export async function scrapeImmoscout24Old(url: string): Promise<ScrapedPropertyData> {
  let browser;

  try {
    log.info('Starting real browser scraping', { url, method: 'immoscout24-old' });

    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const browserConfig = getBrowserConfig();
    const context = await browser.newContext(browserConfig);

    // Override navigator properties to hide automation
    await context.addInitScript(getAntiDetectionScript());

    const page = await context.newPage();

    // Navigate to the page
    log.debug('Navigating to URL', { url });
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

    log.info('Page loaded successfully', { url });

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
    const images = extractImages($, [
      '[data-qa="expose-image"]',
      '.gallery-image img',
      '.sp-image img'
    ]);

    // Extract features
    const features = extractFeatures($, [
      '[data-qa="equipment-item"]',
      '.boolean-listing li'
    ]);

    // Log extracted data for debugging
    log.info('Extracted data from ImmobilienScout24', {
      title,
      price,
      location,
      sqm,
      rooms,
      bathrooms,
      yearBuilt,
      monthlyFee,
      imageCount: images.length,
      featureCount: features.length
    });

    // Validate required fields
    const validation = validatePropertyData({ title, price, location, sqm, rooms });
    if (!validation.valid) {
      log.error('Missing required fields', {
        missing: validation.missing,
        selectorCounts: {
          titleExposeQa: $('h1[data-qa="expose-title"]').length,
          titleFontClass: $('h1.font-title').length,
          titleH1: $('h1').length
        }
      });

      throw new Error('Konnte nicht alle erforderlichen Daten extrahieren. Möglicherweise hat sich die Seitenstruktur geändert oder die Seite ist blockiert.');
    }

    log.info('All required fields extracted successfully');

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
    log.error('ImmobilienScout24 scraping failed', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      url
    });

    throw new Error(`Scraping fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close();
        log.debug('Browser closed');
      } catch (cleanupError) {
        log.warn('Error closing browser', { error: cleanupError });
      }
    }
  }
}
