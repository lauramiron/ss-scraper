import { SessionState } from "db/dbQuery";
import { chromium, Page } from "playwright";

// util: scroll to trigger lazy rails
export async function lazyScroll(page, steps = 6, px = 900) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(y => window.scrollBy(0, y), px);
    await page.waitForTimeout(350);
  }
}

export async function newChromiumBrowserFromSavedState(state: SessionState) {
  const memoryOptimizationArgs = [
    '--disable-features=WebAuthentication',
    '--disable-blink-features=CredentialManager,WebAuthenticationAPI',
    '--disable-dev-shm-usage',           // Overcome limited resource problems
    '--disable-gpu',                     // Disable GPU hardware acceleration
    '--no-sandbox',                      // Required for some environments
    '--disable-setuid-sandbox',
    '--disable-software-rasterizer',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--disable-default-apps',
    '--disable-plugins',
    '--single-process'                   // Run in single process mode (uses less memory)
  ];

  const chromiumOptions = (process.env.ENV == "debug")
    ? { headless: false, slowMo: 100, args: memoryOptimizationArgs }
    : { headless: true, args: memoryOptimizationArgs };

  const browser = await chromium.launch(chromiumOptions);
  const context = await browser.newContext({
    storageState: state || undefined,
    permissions: []
  });

  const page = await context.newPage();
    
  const devTools = await page.context().newCDPSession(page);
  await devTools.send('WebAuthn.enable');
  await devTools.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasUserVerification: true,
      isUserVerified: true,
      hasResidentKey: true,
    },
  });

  return { context, page };
}

export async function newChromiumBrowserFromPersistentContext() {
  const chromiumOptions = (process.env.ENV == "debug") ? { headless: false, slowMo: 100 } : { headless: true };
  const context = await chromium.launchPersistentContext("./data", {
    headless: chromiumOptions.headless,
    slowMo: chromiumOptions.slowMo,
    // args: chromiumOptions.args,
    // permissions: []
  });

  const page = await context.newPage();
  return { context, page };
}

export async function waitForPageStable(page: Page) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    // await page.waitForSelector('#browse-container', { state: 'visible' });
    await waitForDomStability(page);
}

async function waitForDomStability(page, timeout = 5000, quietPeriod = 1000) {
  let lastHTML = '';
  let stableTime = 0;
  const interval = 250;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const html = await page.evaluate(() => document.body.innerHTML);
    if (html === lastHTML) {
      stableTime += interval;
      if (stableTime >= quietPeriod) return true; // DOM stable for 1s
    } else {
      stableTime = 0;
      lastHTML = html;
    }
    await page.waitForTimeout(interval);
  }
  console.warn('⚠️ DOM did not stabilize in time, proceeding anyway...');
  return false;
}
