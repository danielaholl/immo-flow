/**
 * Advanced Property Scraper with Anti-Bot-Detection
 * Uses playwright-extra with stealth plugin and advanced techniques
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

// Add stealth plugin
chromium.use(StealthPlugin());

// Random delays to simulate human behavior
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Random mouse movements
async function simulateHumanBehavior(page: any) {
  // Random scroll
  await page.evaluate(() => {
    const scrollTo = Math.floor(Math.random() * (document.body.scrollHeight / 2));
    window.scrollTo({
      top: scrollTo,
      behavior: 'smooth'
    });
  });
  await randomDelay(1000, 2000);

  // Random small movements
  await page.mouse.move(
    Math.random() * 100 + 50,
    Math.random() * 100 + 50
  );
  await randomDelay(500, 1000);

  // Scroll a bit more
  await page.evaluate(() => {
    window.scrollBy({
      top: 200 + Math.random() * 300,
      behavior: 'smooth'
    });
  });
  await randomDelay(1000, 2000);
}

export async function scrapeImmoscout24Advanced(url: string): Promise<any> {
  console.log('🕵️ Starting ADVANCED stealth scraping...');

  let browser;
  let context;

  try {
    // Launch browser with stealth
    // Using headless: false for better bot detection avoidance
    console.log('⚠️ Opening REAL browser window (headless: false)');

    browser = await chromium.launch({
      headless: false, // REAL BROWSER WINDOW!
      slowMo: 100, // Slow down actions by 100ms
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process,BlockInsecurePrivateNetworkRequests'
      ],
    });

    // Create context with realistic settings
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: {
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100)
      },
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      geolocation: { longitude: 13.404954, latitude: 52.520008 }, // Berlin
      permissions: ['geolocation'],
      colorScheme: 'light',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    // Additional stealth tweaks
    await context.addInitScript(() => {
      // Overwrite the `navigator.webdriver` property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Overwrite the `navigator.plugins` property
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Overwrite the `navigator.languages` property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['de-DE', 'de', 'en-US', 'en'],
      });

      // Remove Playwright/Puppeteer traces
      delete (window as any).__playwright;
      delete (window as any).__pw_manual;
      delete (window as any).__PW_inspect;

      // Chrome runtime
      (window as any).chrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {},
        },
        loadTimes: function() {},
        csi: function() {},
        app: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'denied' } as PermissionStatus) :
          originalQuery(parameters)
      );

      // Add missing window properties
      (window as any).outerWidth = window.innerWidth;
      (window as any).outerHeight = window.innerHeight;
    });

    const page = await context.newPage();

    // Set realistic cookies (simulate previous visits)
    await context.addCookies([
      {
        name: 'reese84',
        value: Math.random().toString(36).substring(7),
        domain: '.immobilienscout24.de',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None'
      }
    ]);

    console.log('🌐 Navigating to URL with stealth mode...');

    // First, visit the homepage to get cookies
    await page.goto('https://www.immobilienscout24.de', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('  ✓ Visited homepage first (cookie collection)');
    await randomDelay(2000, 4000);

    // Now navigate to the actual property
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });
    console.log('  ✓ Navigated to property page');

    // Wait and simulate human behavior
    await randomDelay(3000, 5000);
    await simulateHumanBehavior(page);
    await randomDelay(2000, 3000);

    // Check for CAPTCHA
    const pageTitle = await page.title();
    const pageContent = await page.content();

    if (pageTitle.includes('Roboter') || pageTitle.includes('Captcha') ||
        pageContent.includes('Ich bin kein Roboter')) {
      console.warn('⚠️ CAPTCHA detected! Title:', pageTitle);
      console.warn('🖐️ Browser window is open - please solve CAPTCHA manually!');
      console.warn('⏱️ Waiting 60 seconds for manual CAPTCHA solving...');

      // Wait 60 seconds for user to solve CAPTCHA manually
      await randomDelay(60000, 60000);

      // Check again
      const newTitle = await page.title();
      const newContent = await page.content();

      if (newTitle.includes('Roboter') || newTitle.includes('Captcha') ||
          newContent.includes('Ich bin kein Roboter')) {
        console.error('❌ CAPTCHA still present after 60 seconds');
        throw new Error('CAPTCHA konnte nicht gelöst werden. Bitte nutze die Screenshot-Funktion.');
      }

      console.log('  ✓ CAPTCHA appears to be solved! Continuing...');
    } else {
      console.log('  ✓ No CAPTCHA detected, page title:', pageTitle);
    }

    // Get the HTML content
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('📊 Parsing data with Cheerio...');

    // Extract data with multiple fallback selectors
    const title =
      $('h1[data-qa="expose-title"]').first().text().trim() ||
      $('h1[id*="expose"]').first().text().trim() ||
      $('h1.font-title').first().text().trim() ||
      $('h1').first().text().trim() ||
      '';

    const priceText =
      $('[data-qa="expose-price"]').first().text().trim() ||
      $('[class*="price"]').first().text().trim() ||
      $('.is24qa-kaufpreis').first().text().trim() ||
      '';
    const price = parsePrice(priceText);

    const location =
      $('[data-qa="expose-address"]').first().text().trim() ||
      $('.address-block').first().text().trim() ||
      $('[class*="address"]').first().text().trim() ||
      '';

    const description =
      $('[data-qa="expose-description"]').first().text().trim() ||
      $('.is24qa-objektbeschreibung').first().text().trim() ||
      $('[class*="description"]').first().text().trim() ||
      '';

    // Extract key facts/criteria
    const keyData: Record<string, string> = {};

    // Method 1: data-qa attributes
    $('[data-qa="expose-detail"]').each((_, elem) => {
      const label = $(elem).find('[data-qa="expose-detail-label"]').text().trim();
      const value = $(elem).find('[data-qa="expose-detail-value"]').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    // Method 2: criteria list
    $('.criteriagroup .grid-item, .criteria-group .grid-item').each((_, elem) => {
      const label = $(elem).find('.font-bold, dt').text().trim().replace(':', '');
      const value = $(elem).find('dd').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    // Method 3: key facts
    $('.key-facts dd, .fact-item').each((_, elem) => {
      const text = $(elem).text().trim();
      const parent = $(elem).parent();
      const label = parent.find('dt').text().trim();
      if (label && text) {
        keyData[label.toLowerCase()] = text;
      }
    });

    console.log('  ✓ Found', Object.keys(keyData).length, 'key data fields');

    // Parse numerical data
    const sqm = parseNumber(
      keyData['wohnfläche'] ||
      keyData['fläche'] ||
      keyData['nutzfläche'] ||
      keyData['grundfläche'] ||
      ''
    );

    const rooms = parseNumber(
      keyData['zimmer'] ||
      keyData['anzahl zimmer'] ||
      keyData['rooms'] ||
      ''
    );

    const bathrooms = parseNumber(
      keyData['badezimmer'] ||
      keyData['anzahl badezimmer'] ||
      ''
    );

    const yearBuilt = parseNumber(
      keyData['baujahr'] ||
      keyData['year built'] ||
      ''
    );

    const monthlyFee = parseNumber(
      keyData['hausgeld'] ||
      keyData['nebenkosten'] ||
      keyData['wohngeld'] ||
      ''
    );

    // Extract images
    const images: string[] = [];
    $('img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src &&
          (src.includes('immobilienscout24') || src.startsWith('http')) &&
          !src.includes('placeholder') &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          (src.includes('expose') || src.includes('gallery'))) {
        images.push(src);
      }
    });

    console.log('  ✓ Found', images.length, 'images');

    // Extract features
    const features: string[] = [];
    $('[data-qa="equipment-item"], .boolean-listing li, .equipment-list li, .features li').each((_, elem) => {
      const feature = $(elem).text().trim();
      if (feature && feature.length > 2 && feature.length < 100) {
        features.push(feature);
      }
    });

    console.log('  ✓ Found', features.length, 'features');

    // Log what we extracted
    console.log('📊 Extracted data:');
    console.log('  - Title:', title.substring(0, 50) + '...');
    console.log('  - Price:', price);
    console.log('  - Location:', location);
    console.log('  - Sqm:', sqm);
    console.log('  - Rooms:', rooms);
    console.log('  - Bathrooms:', bathrooms);
    console.log('  - Year:', yearBuilt);
    console.log('  - Monthly Fee:', monthlyFee);

    // Validate
    if (!title || !price || !location || !sqm || !rooms) {
      console.error('❌ Missing required fields!');
      console.error('  Title:', title ? '✓' : '✗');
      console.error('  Price:', price ? '✓' : '✗');
      console.error('  Location:', location ? '✓' : '✗');
      console.error('  Sqm:', sqm ? '✓' : '✗');
      console.error('  Rooms:', rooms ? '✓' : '✗');

      throw new Error('Konnte nicht alle Pflichtfelder extrahieren. Seitenstruktur möglicherweise geändert.');
    }

    console.log('✅ Successfully scraped all required data!');

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
    console.error('❌ Advanced scraping failed:', error);
    throw error;
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Helper functions
function parsePrice(priceText: string): number {
  const cleaned = priceText
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

function parseNumber(text: string): number {
  const cleaned = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
