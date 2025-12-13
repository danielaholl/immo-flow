import { chromium } from 'playwright';

async function debugHomePage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  console.log('Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('\n=== Checking Auth State ===');
  const authState = await page.evaluate(() => {
    return {
      hasToken: !!localStorage.getItem('auth_token'),
      hasCookie: document.cookie.includes('auth'),
    };
  });
  console.log('Auth State:', authState);

  console.log('\n=== Waiting for properties to load (15 seconds) ===');
  await page.waitForTimeout(15000);

  console.log('\n=== Checking for banner ===');
  const bannerText = await page.locator('text=Entdecke deine Traum-Immobilie').count();
  console.log(`Banner visible: ${bannerText > 0}`);

  console.log('\n=== Checking page content ===');
  const pageContent = await page.content();
  console.log('Page includes "Lade Immobilien":', pageContent.includes('Lade Immobilien'));
  console.log('Page includes "Keine Immobilien":', pageContent.includes('Keine Immobilien'));
  console.log('Page includes property data:', pageContent.includes('property'));

  console.log('\n=== Looking for property elements ===');
  const elements = {
    anyPropertyText: await page.locator('text=/\\d+ m²|\\d+ Zimmer/i').count(),
    prices: await page.locator('text=/\\d+\\.?\\d* €/').count(),
    locationTexts: await page.locator('text=/Berlin|München|Hamburg/i').count(),
  };
  console.log('Elements found:', elements);

  console.log('\n=== Taking screenshot ===');
  await page.screenshot({ path: '/tmp/homepage-debug.png', fullPage: true });
  console.log('Screenshot saved to /tmp/homepage-debug.png');

  await browser.close();
  console.log('\n=== Done ===');
}

debugHomePage().catch(console.error);
