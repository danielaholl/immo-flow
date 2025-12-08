/**
 * ULTRA-STEALTH Property Scraper
 * Maximum anti-bot-detection with persistent browser profile
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Add stealth plugin
chromium.use(StealthPlugin());

// Cookie storage file
const COOKIE_FILE = path.join(os.tmpdir(), 'immoflow-cookies.json');

// ImmobilienScout24 credentials from environment
const IMMOSCOUT24_EMAIL = process.env.IMMOSCOUT24_EMAIL;
const IMMOSCOUT24_PASSWORD = process.env.IMMOSCOUT24_PASSWORD;

// Helper to save cookies
async function saveCookies(context: any) {
  try {
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log('  💾 Cookies saved');
  } catch (error) {
    console.warn('  ⚠️ Could not save cookies:', error);
  }
}

// Helper to load cookies
async function loadCookies(context: any): Promise<boolean> {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
      await context.addCookies(cookies);
      console.log('  ✅ Loaded saved cookies');
      return true;
    }
  } catch (error) {
    console.warn('  ⚠️ Could not load cookies:', error);
  }
  return false;
}

// Random delays to simulate human behavior
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Enhanced human behavior simulation
async function simulateAdvancedHumanBehavior(page: any) {
  console.log('  🤖 Simulating human behavior...');

  // 1. Random mouse movements across the page
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    await page.mouse.move(
      Math.random() * 1500 + 100,
      Math.random() * 800 + 100,
      { steps: 10 + Math.floor(Math.random() * 20) }
    );
    await randomDelay(300, 800);
  }

  // 2. Scroll down slowly (like reading)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let scrollPos = 0;
      const maxScroll = document.body.scrollHeight * 0.6;
      const scrollInterval = setInterval(() => {
        scrollPos += 50 + Math.random() * 100;
        window.scrollTo({
          top: scrollPos,
          behavior: 'smooth'
        });

        if (scrollPos >= maxScroll) {
          clearInterval(scrollInterval);
          resolve();
        }
      }, 200 + Math.random() * 300);
    });
  });
  await randomDelay(2000, 4000);

  // 3. More mouse movements
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    await page.mouse.move(
      Math.random() * 1500 + 100,
      Math.random() * 800 + 100,
      { steps: 15 }
    );
    await randomDelay(400, 900);
  }

  // 4. Scroll back up a bit (natural reading behavior)
  await page.evaluate(() => {
    window.scrollBy({
      top: -(100 + Math.random() * 200),
      behavior: 'smooth'
    });
  });
  await randomDelay(1500, 2500);

  // 5. Final scroll to middle
  await page.evaluate(() => {
    window.scrollTo({
      top: document.body.scrollHeight * 0.3,
      behavior: 'smooth'
    });
  });
  await randomDelay(1000, 2000);
}

export async function scrapeImmoscout24UltraStealth(url: string): Promise<any> {
  console.log('🔥 Starting ULTRA-STEALTH scraping...');
  console.log('  💾 Using cookie-based session management');

  let browser;
  let context;

  try {
    // Launch browser with maximum stealth configuration
    browser = await chromium.launch({
      headless: false, // Real browser for best results
      slowMo: 50,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process,BlockInsecurePrivateNetworkRequests',
        '--disable-web-security',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        '--password-store=basic',
        '--use-mock-keychain',
        '--no-first-run',
        '--no-default-browser-check',
        '--enable-features=NetworkService,NetworkServiceInProcess',
      ],
    });

    const viewportWidth = 1920 + Math.floor(Math.random() * 200) - 100;
    const viewportHeight = 1080 + Math.floor(Math.random() * 200) - 100;

    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: {
        width: viewportWidth,
        height: viewportHeight
      },
      screen: {
        width: viewportWidth,
        height: viewportHeight
      },
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      geolocation: {
        longitude: 13.404954 + (Math.random() - 0.5) * 0.1,
        latitude: 52.520008 + (Math.random() - 0.5) * 0.1
      },
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
        'DNT': '1',
      },
    });

    // Load saved cookies if available
    await loadCookies(context);

    // ULTRA STEALTH SCRIPTS
    await context.addInitScript(() => {
      // 1. Remove all automation traces
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
              description: "",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
              description: "Native Client Executable",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ];
          return plugins;
        }
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['de-DE', 'de', 'en-US', 'en'],
      });

      // 2. Remove Playwright/Puppeteer traces
      delete (window as any).__playwright;
      delete (window as any).__pw_manual;
      delete (window as any).__PW_inspect;
      delete (window as any).__nightmare;
      delete (navigator as any).__nightmare;
      delete (window as any).callPhantom;
      delete (window as any)._phantom;
      delete (window as any).phantom;

      // 3. Chrome runtime
      (window as any).chrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {},
          onMessage: { addListener: () => {}, removeListener: () => {} },
        },
        loadTimes: function() {
          return {
            commitLoadTime: Date.now() / 1000 - Math.random() * 2,
            connectionInfo: "h2",
            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
            finishLoadTime: Date.now() / 1000 - Math.random() * 0.5,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random(),
            navigationType: "Other",
            npnNegotiatedProtocol: "h2",
            requestTime: Date.now() / 1000 - Math.random() * 3,
            startLoadTime: Date.now() / 1000 - Math.random() * 2.5,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true
          };
        },
        csi: function() {
          return {
            onloadT: Date.now() - Math.random() * 5000,
            pageT: Date.now() - Math.random() * 3000,
            startE: Date.now() - Math.random() * 6000,
            tran: 15
          };
        },
        app: {
          isInstalled: false,
          InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
          RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" }
        },
      };

      // 4. Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'denied' } as PermissionStatus);
        }
        return originalQuery(parameters);
      };

      // 5. Canvas fingerprinting protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
        // Add noise to canvas fingerprint
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
            imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, [type] as any);
      };

      // 6. WebGL fingerprinting protection
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter: any) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };

      // 7. Audio context fingerprinting protection
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const originalCreateOscillator = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function() {
          const oscillator = originalCreateOscillator.call(this);
          const originalStart = oscillator.start;
          oscillator.start = function(when?: number) {
            // Add random noise to prevent audio fingerprinting
            when = when || 0;
            when += Math.random() * 0.0001;
            return originalStart.call(this, when);
          };
          return oscillator;
        };
      }

      // 8. Battery API spoofing
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.85 + Math.random() * 0.1,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        })
      });

      // 9. Media devices
      Object.defineProperty(navigator, 'mediaDevices', {
        get: () => ({
          enumerateDevices: () => Promise.resolve([
            { deviceId: "default", kind: "audioinput", label: "Default - Microphone", groupId: "group1" },
            { deviceId: "default", kind: "videoinput", label: "FaceTime HD Camera", groupId: "group2" },
          ]),
          getUserMedia: () => Promise.reject(new Error('Permission denied')),
          getSupportedConstraints: () => ({
            aspectRatio: true,
            brightness: true,
            channelCount: true,
            deviceId: true,
            echoCancellation: true,
            facingMode: true,
            frameRate: true,
            groupId: true,
            height: true,
            sampleRate: true,
            sampleSize: true,
            width: true,
          })
        })
      });

      // 10. Screen properties
      Object.defineProperty(screen, 'width', { get: () => window.innerWidth });
      Object.defineProperty(screen, 'height', { get: () => window.innerHeight });
      Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight - 40 });
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

      // 11. Missing window properties
      (window as any).outerWidth = window.innerWidth;
      (window as any).outerHeight = window.innerHeight;

      // 12. Connection info
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false,
        })
      });

      // 13. Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });

      // 14. Device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });

      console.log('✅ Ultra-stealth scripts loaded');
    });

    const page = await context.newPage();

    // Auto-login with credentials
    if (IMMOSCOUT24_EMAIL && IMMOSCOUT24_PASSWORD) {
      console.log('🔐 Performing auto-login to ImmobilienScout24...');

      try {
        // Navigate to login page
        await page.goto('https://sso.immobilienscout24.de/sso/anmelden', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        console.log('  ✓ Login page loaded');
        await randomDelay(2000, 4000);

        // Check if already logged in (redirected away from login page)
        const currentUrl = page.url();
        if (!currentUrl.includes('/anmelden') && !currentUrl.includes('/login')) {
          console.log('  ✅ Already logged in! Using existing session');
        } else {
          // Fill in email
          console.log('  📧 Entering email...');
          await page.fill('input[type="email"], input[name="username"], #username', IMMOSCOUT24_EMAIL, { timeout: 10000 });
          await randomDelay(1000, 2000);

          // Fill in password
          console.log('  🔒 Entering password...');
          await page.fill('input[type="password"], input[name="password"], #password', IMMOSCOUT24_PASSWORD, { timeout: 10000 });
          await randomDelay(1000, 2000);

          // Click login button
          console.log('  👆 Clicking login button...');
          await page.click('button[type="submit"], button[data-qa="submit"], .submit-button');

          // Wait for navigation after login
          await page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 30000
          }).catch(() => {
            console.log('  ⚠️ Navigation timeout after login (might be ok)');
          });

          await randomDelay(3000, 5000);

          // Verify login was successful
          const loginVerifyUrl = page.url();
          if (loginVerifyUrl.includes('/anmelden') || loginVerifyUrl.includes('/login')) {
            console.error('  ❌ Login failed - still on login page');
            console.error('  💡 Check your credentials in .env file');
            console.error('  🌐 Current URL:', loginVerifyUrl);
          } else {
            console.log('  ✅ Login successful!');
            // Save cookies after successful login
            await saveCookies(context);
          }
        }
      } catch (error) {
        console.warn('  ⚠️ Login error (will try to continue):', error instanceof Error ? error.message : error);
      }

      await randomDelay(2000, 3000);
    } else {
      console.log('  ℹ️ No credentials configured - proceeding without login');
      console.log('  💡 Add IMMOSCOUT24_EMAIL and IMMOSCOUT24_PASSWORD to .env for auto-login');
    }

    console.log('🌐 Step 1: Visiting homepage for cookies...');
    await page.goto('https://www.immobilienscout24.de', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    console.log('  ✓ Homepage loaded');

    // Accept cookie banner if present
    await randomDelay(2000, 3000);
    try {
      console.log('  🍪 Looking for cookie banner...');

      // Try multiple selectors for cookie accept button
      const cookieSelectors = [
        'button:has-text("Alle akzeptieren")',
        'button:has-text("Akzeptieren")',
        'button:has-text("Zustimmen")',
        'button[id*="accept"]',
        'button[id*="consent"]',
        'button[class*="accept"]',
        'button[class*="consent"]',
        '#onetrust-accept-btn-handler',
        '.uc-accept-all-button',
        '[data-qa="cookie-accept"]',
      ];

      let cookieAccepted = false;
      for (const selector of cookieSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`  ✓ Found cookie button with selector: ${selector}`);
            await button.click();
            console.log('  ✅ Cookie banner accepted!');
            cookieAccepted = true;
            await randomDelay(1000, 2000);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!cookieAccepted) {
        console.log('  ℹ️ No cookie banner found (or already accepted)');
      }
    } catch (error) {
      console.log('  ⚠️ Cookie banner handling failed, continuing anyway');
    }

    // Longer delay to appear more human
    await randomDelay(3000, 5000);

    // Simulate browsing the homepage
    console.log('  👆 Simulating homepage interaction...');
    await simulateAdvancedHumanBehavior(page);

    // Wait a bit more
    await randomDelay(3000, 5000);

    console.log('🌐 Step 2: Navigating to property page...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Changed from networkidle for faster loading
      timeout: 90000, // Increased to 90 seconds
    });
    console.log('  ✓ Property page loaded');

    // Wait extra time for dynamic content
    await randomDelay(2000, 3000);

    // Wait and simulate human reading behavior
    await randomDelay(4000, 7000);
    console.log('  👀 Simulating property viewing...');
    await simulateAdvancedHumanBehavior(page);
    await randomDelay(3000, 5000);

    // Check for CAPTCHA
    const pageTitle = await page.title();
    const pageContent = await page.content();

    if (pageTitle.includes('Roboter') || pageTitle.includes('Captcha') ||
        pageContent.includes('Ich bin kein Roboter')) {
      console.warn('⚠️ ⚠️ ⚠️ CAPTCHA DETECTED! ⚠️ ⚠️ ⚠️');
      console.warn('📖 Title:', pageTitle);
      console.warn('');
      console.warn('🖥️  BROWSER WINDOW IS OPEN');
      console.warn('🖐️  BITTE LÖSE DAS CAPTCHA MANUELL!');
      console.warn('⏱️  Warte 2 Minuten (120 Sekunden)...');
      console.warn('');

      // Wait 2 minutes for manual solving
      await randomDelay(120000, 120000);

      // Check again
      const newTitle = await page.title();
      const newContent = await page.content();

      if (newTitle.includes('Roboter') || newTitle.includes('Captcha') ||
          newContent.includes('Ich bin kein Roboter')) {
        console.error('❌ CAPTCHA immer noch vorhanden nach 2 Minuten');
        console.error('💡 Tipp: Verwende die Screenshot-Funktion stattdessen!');
        throw new Error('CAPTCHA konnte nicht gelöst werden. Bitte nutze die Screenshot-Funktion.');
      }

      console.log('  ✅ CAPTCHA gelöst! Weiter gehts...');

      // Wait a bit more after CAPTCHA
      await randomDelay(3000, 5000);
    } else {
      console.log('  ✅ Kein CAPTCHA! Titel:', pageTitle);
    }

    // Get the HTML content
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('📊 Parsing property data...');

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

    // Extract key facts
    const keyData: Record<string, string> = {};

    $('[data-qa="expose-detail"]').each((_, elem) => {
      const label = $(elem).find('[data-qa="expose-detail-label"]').text().trim();
      const value = $(elem).find('[data-qa="expose-detail-value"]').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    $('.criteriagroup .grid-item, .criteria-group .grid-item').each((_, elem) => {
      const label = $(elem).find('.font-bold, dt').text().trim().replace(':', '');
      const value = $(elem).find('dd').text().trim();
      if (label && value) {
        keyData[label.toLowerCase()] = value;
      }
    });

    $('.key-facts dd, .fact-item').each((_, elem) => {
      const text = $(elem).text().trim();
      const parent = $(elem).parent();
      const label = parent.find('dt').text().trim();
      if (label && text) {
        keyData[label.toLowerCase()] = text;
      }
    });

    // Try alternative selectors for key data
    $('dl dt').each((_, elem) => {
      const label = $(elem).text().trim().replace(':', '').toLowerCase();
      const value = $(elem).next('dd').text().trim();
      if (label && value && label.length > 1) {
        keyData[label] = value;
      }
    });

    // Try finding data in attribute-value pairs
    $('[class*="KeyFact"], [class*="keyFact"], [class*="fact"]').each((_, elem) => {
      const text = $(elem).text().trim();
      // Look for patterns like "3 Zimmer" or "45 m²"
      if (text.includes('Zimmer')) {
        const match = text.match(/(\d+[,.]?\d*)\s*Zimmer/i);
        if (match) keyData['zimmer'] = match[1];
      }
      if (text.includes('m²') || text.includes('qm')) {
        const match = text.match(/(\d+[,.]?\d*)\s*(?:m²|qm)/i);
        if (match) keyData['wohnfläche'] = match[1];
      }
    });

    // Try finding in table structure
    $('table tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().replace(':', '').toLowerCase();
        const value = $(cells[1]).text().trim();
        if (label && value && label.length > 1) {
          keyData[label] = value;
        }
      }
    });

    console.log('  ✓ Found', Object.keys(keyData).length, 'data fields');
    console.log('  📋 Available keys:', Object.keys(keyData).join(', '));

    // Last resort: scan entire page text for patterns
    const bodyText = $('body').text();

    // Look for "X Zimmer" pattern anywhere on page
    if (!keyData['zimmer']) {
      const roomMatch = bodyText.match(/(\d+[,.]?\d*)\s*(?:Zimmer|Raum|Räume)/i);
      if (roomMatch) {
        console.log('  🔍 Found rooms in body text:', roomMatch[0]);
        keyData['zimmer'] = roomMatch[1];
      }
    }

    // Look for "X m²" or "X qm" pattern anywhere on page
    if (!keyData['wohnfläche']) {
      const sqmMatch = bodyText.match(/(\d+[,.]?\d*)\s*(?:m²|qm|Quadratmeter)/i);
      if (sqmMatch) {
        console.log('  🔍 Found sqm in body text:', sqmMatch[0]);
        keyData['wohnfläche'] = sqmMatch[1];
      }
    }

    // Parse numerical data
    const sqm = parseNumber(
      keyData['wohnfläche'] ||
      keyData['fläche'] ||
      keyData['nutzfläche'] ||
      keyData['grundfläche'] ||
      keyData['wohnfläche ca.'] ||
      ''
    );

    const rooms = parseNumber(
      keyData['zimmer'] ||
      keyData['anzahl zimmer'] ||
      keyData['rooms'] ||
      keyData['anzahl der zimmer'] ||
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

    // Log extracted data
    console.log('📊 Extracted data summary:');
    console.log('  - Title:', title.substring(0, 50) + (title.length > 50 ? '...' : ''));
    console.log('  - Price:', price, '€');
    console.log('  - Location:', location);
    console.log('  - Sqm:', sqm, 'm²');
    console.log('  - Rooms:', rooms);
    console.log('  - Bathrooms:', bathrooms || 'N/A');
    console.log('  - Year:', yearBuilt || 'N/A');
    console.log('  - Monthly Fee:', monthlyFee || 'N/A', '€');

    // Validate required fields
    if (!title || !price || !location || !sqm || !rooms) {
      console.error('❌ Missing required fields!');
      console.error('  Title:', title ? '✓' : '✗');
      console.error('  Price:', price ? '✓' : '✗');
      console.error('  Location:', location ? '✓' : '✗');
      console.error('  Sqm:', sqm ? '✓' : '✗');
      console.error('  Rooms:', rooms ? '✓' : '✗');

      throw new Error('Konnte nicht alle Pflichtfelder extrahieren. Seitenstruktur möglicherweise geändert.');
    }

    console.log('✅ ✅ ✅ ERFOLGREICH GESCRAPED! ✅ ✅ ✅');

    // Save cookies for next time
    if (context) {
      await saveCookies(context);
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
      monthlyFee: monthlyFee || undefined,
      images,
      features,
      externalSource: 'immoscout24',
    };

  } catch (error) {
    console.error('❌ Ultra-stealth scraping failed:', error);
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
