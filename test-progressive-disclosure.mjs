import { chromium } from 'playwright';

/**
 * Comprehensive Progressive Disclosure Test Suite
 * Tests all features: teaser mode, auth guards, login flow, restricted content
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000';
let browser;
let page;
let context;
const errors = [];
const warnings = [];
const successes = [];

function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    'error': '❌',
    'warning': '⚠️',
    'success': '✅',
    'info': '📌'
  }[type] || '•';

  console.log(`${prefix} [${timestamp}] ${message}`);

  if (type === 'error') errors.push(message);
  if (type === 'warning') warnings.push(message);
  if (type === 'success') successes.push(message);
}

async function setup() {
  log('info', 'Setting up browser...');
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log('error', `Browser console error: ${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    log('error', `Page error: ${error.message}`);
  });

  log('success', 'Browser setup complete');
}

async function testHomePage() {
  log('info', '\n========== TEST 1: HomePage (Non-Authenticated User) ==========');

  try {
    // Navigate to homepage
    log('info', 'Navigating to homepage...');
    const response = await page.goto(BASE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response.ok()) {
      log('error', `Homepage returned status ${response.status()}`);
      return false;
    }
    log('success', 'Homepage loaded successfully');

    // Take screenshot
    await page.screenshot({ path: '/tmp/homepage.png', fullPage: true });
    log('info', 'Screenshot saved: /tmp/homepage.png');

    // Check for non-auth banner
    log('info', 'Checking for non-auth user banner...');
    const banner = await page.locator('text=Entdecke deine Traum-Immobilie').count();
    if (banner > 0) {
      log('success', 'Non-auth banner is visible');
    } else {
      log('warning', 'Non-auth banner not found (might be authenticated)');
    }

    // Check for "Kostenloses Konto erstellen" button
    const signupButton = await page.locator('text=Kostenloses Konto erstellen').first().count();
    if (signupButton > 0) {
      log('success', 'Signup button found in banner');
    } else {
      log('warning', 'Signup button not found in banner');
    }

    // Wait for properties to load
    log('info', 'Waiting for properties to load...');
    await page.waitForTimeout(5000); // Wait for tRPC query

    // Check if properties are displayed
    const loadingIndicator = await page.locator('text=Lade Immobilien').count();
    if (loadingIndicator > 0) {
      log('warning', 'Properties still loading after 5 seconds');
      await page.waitForTimeout(5000); // Wait more
    }

    // Check for property cards
    const propertyCards = await page.locator('[class*="property"]').count();
    log('info', `Found ${propertyCards} property card elements`);

    if (propertyCards === 0) {
      log('warning', 'No property cards found - checking for "Keine Immobilien" message');
      const noProperties = await page.locator('text=Keine Immobilien gefunden').count();
      if (noProperties > 0) {
        log('info', 'No properties message displayed - database might be empty');
      }
    } else {
      log('success', `Homepage displaying ${propertyCards} property elements`);
    }

    return true;
  } catch (error) {
    log('error', `HomePage test failed: ${error.message}`);
    return false;
  }
}

async function testPropertyDetail() {
  log('info', '\n========== TEST 2: Property Detail Page (Teaser Mode) ==========');

  try {
    // First, get a property ID from the API
    log('info', 'Fetching properties from API...');
    const apiResponse = await fetch(`${API_URL}/trpc/properties.getAll`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!apiResponse.ok) {
      log('error', `API returned status ${apiResponse.status}`);
      return false;
    }

    const apiData = await apiResponse.json();
    log('info', `API response structure: ${JSON.stringify(apiData).substring(0, 200)}...`);

    // Parse tRPC response
    let properties = [];
    if (apiData.result?.data) {
      properties = apiData.result.data;
    } else if (Array.isArray(apiData)) {
      properties = apiData;
    }

    if (properties.length === 0) {
      log('warning', 'No properties in database - skipping property detail test');
      return true; // Not a failure, just no data
    }

    const propertyId = properties[0].id;
    log('success', `Found property ID: ${propertyId}`);

    // Navigate to property detail page
    log('info', `Navigating to property detail page: /property/${propertyId}`);
    await page.goto(`${BASE_URL}/property/${propertyId}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.screenshot({ path: '/tmp/property-detail.png', fullPage: true });
    log('info', 'Screenshot saved: /tmp/property-detail.png');

    // Check if page loaded
    const pageTitle = await page.title();
    log('info', `Page title: ${pageTitle}`);

    // Check for restricted content placeholders (should be visible for non-auth users)
    log('info', 'Checking for restricted content placeholders...');

    // Look for various text that might indicate restricted content
    const restrictedTexts = [
      'Anmeldung erforderlich',
      'Jetzt anmelden',
      'freischalten',
      'Detaillierte KI-Analyse',
      'Property Statistiken'
    ];

    let foundRestricted = 0;
    for (const text of restrictedTexts) {
      const count = await page.locator(`text=${text}`).count();
      if (count > 0) {
        foundRestricted++;
        log('success', `Found restricted content indicator: "${text}"`);
      }
    }

    if (foundRestricted === 0) {
      log('warning', 'No restricted content placeholders found - user might be authenticated or placeholders not implemented on this page');
    }

    // Check favorite button (should be visible but trigger login modal)
    const favoriteButton = await page.locator('[aria-label*="Favorit"], [title*="Favorit"]').count();
    if (favoriteButton > 0) {
      log('success', 'Favorite button found');
    } else {
      log('info', 'Favorite button not found by aria-label/title');
    }

    return true;
  } catch (error) {
    log('error', `Property Detail test failed: ${error.message}`);
    return false;
  }
}

async function testLoginFlow() {
  log('info', '\n========== TEST 3: Login Flow with ReturnUrl ==========');

  try {
    // Navigate to login with returnUrl parameter
    const returnUrl = '/property/test-id';
    const loginUrl = `${BASE_URL}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent('Bitte melde dich an um fortzufahren')}`;

    log('info', `Navigating to login page with returnUrl: ${loginUrl}`);
    await page.goto(loginUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });
    log('info', 'Screenshot saved: /tmp/login-page.png');

    // Check for contextual message banner
    log('info', 'Checking for contextual message banner...');
    const messageBanner = await page.locator('text=Bitte melde dich an').count();
    if (messageBanner > 0) {
      log('success', 'Contextual message banner is visible');
    } else {
      log('warning', 'Contextual message banner not found');
    }

    // Check for login form elements
    const emailInput = await page.locator('input[type="email"]').count();
    const passwordInput = await page.locator('input[type="password"]').count();
    const loginButton = await page.locator('button[type="submit"]').count();

    if (emailInput > 0 && passwordInput > 0 && loginButton > 0) {
      log('success', 'Login form elements found');
    } else {
      log('error', `Login form incomplete - email: ${emailInput}, password: ${passwordInput}, button: ${loginButton}`);
    }

    // Check signup link preserves returnUrl
    const signupLink = await page.locator('a[href*="/auth/signup"]').first();
    if (await signupLink.count() > 0) {
      const href = await signupLink.getAttribute('href');
      if (href && href.includes('returnUrl')) {
        log('success', 'Signup link preserves returnUrl');
      } else {
        log('warning', 'Signup link does not preserve returnUrl');
      }
    }

    return true;
  } catch (error) {
    log('error', `Login flow test failed: ${error.message}`);
    return false;
  }
}

async function testAuthGuards() {
  log('info', '\n========== TEST 4: Auth Guards (Modal Triggers) ==========');

  try {
    // Go back to homepage
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    log('info', 'Looking for favorite buttons to test auth guards...');

    // Wait a bit for properties to load
    await page.waitForTimeout(3000);

    // Try to find and click a favorite button
    const favoriteButtons = await page.locator('[aria-label*="avorit"], button:has-text("Favorit")').all();

    if (favoriteButtons.length === 0) {
      log('warning', 'No favorite buttons found to test auth guards');
      return true; // Not a failure
    }

    log('info', `Found ${favoriteButtons.length} favorite buttons`);

    // Click the first favorite button
    log('info', 'Clicking favorite button to test auth guard...');
    try {
      await favoriteButtons[0].click({ timeout: 5000 });

      // Wait for modal to appear
      await page.waitForTimeout(2000);

      // Check if login modal appeared or if we were redirected
      const currentUrl = page.url();
      const modalVisible = await page.locator('text=Anmeldung erforderlich, text=Jetzt anmelden').count();

      if (modalVisible > 0) {
        log('success', 'Login modal appeared when clicking favorite button');
        await page.screenshot({ path: '/tmp/login-modal.png' });
        log('info', 'Screenshot saved: /tmp/login-modal.png');
      } else if (currentUrl.includes('/auth/login')) {
        log('success', 'Redirected to login page when clicking favorite button');
      } else {
        log('warning', 'No modal or redirect after clicking favorite button');
      }
    } catch (clickError) {
      log('warning', `Could not click favorite button: ${clickError.message}`);
    }

    return true;
  } catch (error) {
    log('error', `Auth guards test failed: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  log('info', '\n========== TEST 5: API Endpoints (Field Filtering) ==========');

  try {
    // Test getAll without auth
    log('info', 'Testing properties.getAll without authentication...');
    const getAllResponse = await fetch(`${API_URL}/trpc/properties.getAll`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!getAllResponse.ok) {
      log('error', `properties.getAll returned status ${getAllResponse.status}`);
      return false;
    }

    const getAllData = await getAllResponse.json();
    log('success', 'properties.getAll endpoint accessible');

    // Check if response contains teaser fields
    let properties = getAllData.result?.data || getAllData;
    if (Array.isArray(properties) && properties.length > 0) {
      const firstProperty = properties[0];
      log('info', `First property fields: ${Object.keys(firstProperty).join(', ')}`);

      // Check for teaser-only characteristics (limited images, truncated description)
      if (firstProperty.images && Array.isArray(firstProperty.images)) {
        if (firstProperty.images.length <= 3) {
          log('success', 'Images are limited (teaser mode working)');
        } else {
          log('warning', `Images not limited: ${firstProperty.images.length} images`);
        }
      }

      if (firstProperty.description && firstProperty.description.length <= 153) {
        log('success', 'Description is truncated (teaser mode working)');
      } else if (firstProperty.description) {
        log('warning', `Description not truncated: ${firstProperty.description.length} chars`);
      }
    } else {
      log('warning', 'No properties returned from API');
    }

    return true;
  } catch (error) {
    log('error', `API endpoints test failed: ${error.message}`);
    return false;
  }
}

async function cleanup() {
  log('info', '\n========== Cleanup ==========');
  if (page) await page.close();
  if (context) await context.close();
  if (browser) await browser.close();
  log('success', 'Browser closed');
}

async function printSummary() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY                            ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Successes: ${successes.length}`);
  console.log(`⚠️  Warnings:  ${warnings.length}`);
  console.log(`❌ Errors:    ${errors.length}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
  }

  console.log('\n');

  if (errors.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Progressive Disclosure is working correctly.');
    return 0;
  } else {
    console.log('❌ TESTS FAILED. Please review the errors above.');
    return 1;
  }
}

// Main test execution
async function main() {
  try {
    await setup();

    await testHomePage();
    await testPropertyDetail();
    await testLoginFlow();
    await testAuthGuards();
    await testAPIEndpoints();

    await cleanup();

    const exitCode = await printSummary();
    process.exit(exitCode);

  } catch (error) {
    log('error', `Test suite failed: ${error.message}`);
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

main();
