import { chromium } from 'playwright';

async function testFrontend() {
  console.log('🚀 Starting frontend verification...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages and errors
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
      errors.push(text);
    }
  });

  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
    errors.push(error.message);
  });

  try {
    console.log('📡 Navigating to http://localhost:3000...');
    const response = await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log(`✅ Page loaded with status: ${response.status()}\n`);

    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check if main elements are present
    console.log('\n🔍 Checking page elements...');

    const header = await page.locator('header').count();
    console.log(`${header > 0 ? '✅' : '❌'} Header found: ${header > 0}`);

    const searchInput = await page.locator('input[placeholder*="Suchen"]').count();
    console.log(`${searchInput > 0 ? '✅' : '❌'} Search input found: ${searchInput > 0}`);

    // Wait a bit for any dynamic content
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/frontend-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/frontend-test.png');

    // Check network requests
    console.log('\n🌐 Checking API communication...');
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('localhost:4000')) {
        apiRequests.push(request.url());
      }
    });

    // Wait a bit more to catch API requests
    await page.waitForTimeout(2000);

    if (apiRequests.length > 0) {
      console.log(`✅ Found ${apiRequests.length} API requests to localhost:4000`);
    } else {
      console.log('⚠️  No API requests detected yet');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors found: ${errors.length}`);
    console.log(`Page status: ${response.status()}`);
    console.log(`Title: ${title}`);

    if (errors.length === 0) {
      console.log('\n✅ Frontend is working flawlessly!');
      process.exit(0);
    } else {
      console.log('\n❌ Errors detected that need fixing:');
      errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testFrontend();
