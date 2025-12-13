import { chromium } from 'playwright';

async function inspectDOM() {
  console.log('🔍 Inspecting DOM Structure...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('2. Waiting for properties to load...');
  await page.waitForTimeout(5000);

  console.log('\n3. Finding property cards in grid...');
  const gridContainer = page.locator('div.grid');
  const cardCount = await gridContainer.locator('> div').count();
  console.log(`   Found ${cardCount} property cards in grid`);

  if (cardCount === 0) {
    console.log('❌ No property cards found!');
    await browser.close();
    return;
  }

  const firstCard = gridContainer.locator('> div').first();

  console.log('4. Extracting property card HTML structure...\n');
  const html = await firstCard.evaluate(el => {
    // Get the outer HTML of the first property card
    return el.outerHTML.substring(0, 3000); // First 3000 chars
  });

  console.log('===== PROPERTY CARD HTML =====');
  console.log(html);
  console.log('===============================\n');

  console.log('5. Looking for favorite button (Heart icon) within the property card...');
  // Find Heart icon within the first property card
  const heartIcon = firstCard.locator('svg').filter({ hasText: '' }).first();
  const heartCount = await firstCard.locator('svg').count();
  console.log(`   Found ${heartCount} SVG icons in the property card`);

  const heartParents = await heartIcon.evaluate(svg => {
    let parent = svg.parentElement;
    let depth = 0;
    let structure = [];

    while (parent && depth < 5) {
      structure.push({
        tagName: parent.tagName,
        className: parent.className,
        role: parent.getAttribute('role'),
        onClick: parent.onclick !== null,
        hasEventListener: parent.hasAttribute('data-pressable'),
      });
      parent = parent.parentElement;
      depth++;
    }

    return structure;
  });

  console.log('===== HEART ICON PARENT CHAIN =====');
  console.log(JSON.stringify(heartParents, null, 2));
  console.log('====================================\n');

  await browser.close();
  console.log('✅ Done');
}

inspectDOM().catch(console.error);
