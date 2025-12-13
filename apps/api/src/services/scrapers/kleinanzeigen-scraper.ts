/**
 * Kleinanzeigen.de Scraper
 * Playwright-based scraper for Kleinanzeigen
 */
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import type { ScrapedPropertyData } from '../property-scraper.js';
import { createLogger } from '@immoflow/utils';
import {
  parsePrice,
  parseNumber,
  getBrowserConfig,
  validatePropertyData,
} from '../../utils/scraper-helpers.js';

const log = createLogger('kleinanzeigen-scraper');

/**
 * Scrape property data from Kleinanzeigen.de using Playwright
 */
export async function scrapeKleinanzeigen(url: string): Promise<ScrapedPropertyData> {
  let browser;

  try {
    log.info('Starting Kleinanzeigen scraping', { url });

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

    const page = await context.newPage();

    log.debug('Navigating to Kleinanzeigen', { url });
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    log.info('Kleinanzeigen page loaded successfully');

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

    log.info('Extracted Kleinanzeigen data', { title, price, location, sqm, rooms });

    // Validate required fields
    const validation = validatePropertyData({ title, price, location, sqm, rooms });
    if (!validation.valid) {
      log.error('Missing required Kleinanzeigen data', {
        missing: validation.missing
      });
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
    log.error('Kleinanzeigen scraping failed', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      url
    });

    throw new Error(`Kleinanzeigen Scraping fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  } finally {
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
