import { chromium } from 'playwright';

async function testFavoriteButton() {
  console.log('🔍 Testing Favorite Button Click...\n');

  const browser = await chromium.launch({
    headless: true,
    slowMo: 100
  });
  const page = await browser.newPage();

  // Enable verbose logging
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', error => {
    console.log(`[ERROR]`, error.message);
  });

  console.log('1. Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('2. Waiting for properties to load...');
  await page.waitForTimeout(5000);

  console.log('3. Looking for favorite buttons...');

  // Find property cards in grid
  const gridContainer = page.locator('div.grid');
  const firstCard = gridContainer.locator('> div').first();

  // Find the favorite button within the property card
  // It's a div with cursor-pointer, touchAction, and circular shape (borderRadius-1fuqb1j)
  // that contains an SVG icon
  const favoriteButton = firstCard.locator('div[tabindex="0"]').filter({ has: page.locator('svg') }).nth(1); // nth(1) because nth(0) is usually the card itself

  const favoriteButtonCount = await firstCard.locator('div[tabindex="0"]').filter({ has: page.locator('svg') }).count();
  console.log(`   Found ${favoriteButtonCount} clickable divs with SVG icons in property card`);

  if (favoriteButtonCount === 0) {
    console.log('\n❌ No favorite button found! Saving screenshot...');
    await page.screenshot({ path: '/tmp/no-favorite-button.png', fullPage: true });
    await browser.close();
    return;
  }

  console.log(`\n4. Found favorite button (clickable div with SVG)`);
  console.log('5. Clicking favorite button...');

  try {
    await favoriteButton.click({ timeout: 5000 });
    console.log('   ✅ Button clicked successfully');

    await page.waitForTimeout(2000);

    console.log('\n6. Checking what happened...');

    // Check for modal
    const modalTitle = await page.locator('text=Anmeldung erforderlich').count();
    const loginButtonInModal = await page.locator('text=Anmelden').filter({ hasNot: page.locator('nav') }).count(); // Exclude nav link
    const signupButtonInModal = await page.locator('text=Kostenloses Konto erstellen').count();
    const actionDescription = await page.locator('text=Diese Immobilie als Favorit markieren').count();
    console.log(`   Modal title visible: ${modalTitle > 0}`);
    console.log(`   Login button visible: ${loginButtonInModal > 0}`);
    console.log(`   Signup button visible: ${signupButtonInModal > 0}`);
    console.log(`   Action description visible: ${actionDescription > 0}`);
    console.log(`   ✅ Modal is ${(modalTitle > 0 && loginButtonInModal > 0 && actionDescription > 0) ? 'FULLY VISIBLE' : 'PARTIALLY VISIBLE'}`);

    // Check for redirect
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Redirected to login: ${currentUrl.includes('/auth/login')}`);

    await page.screenshot({ path: '/tmp/after-favorite-click.png', fullPage: true });
    console.log('\n📸 Screenshot saved: /tmp/after-favorite-click.png');

  } catch (error) {
    console.log(`\n❌ Error clicking button: ${error.message}`);
    await page.screenshot({ path: '/tmp/favorite-click-error.png', fullPage: true });
  }

  console.log('\n⏳ Waiting 3 seconds...');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('✅ Test complete');
}

testFavoriteButton().catch(console.error);
