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
  const chromiumOptions = (process.env.ENV == "debug")
    ? { headless: false, slowMo: 100, args: [
        '--disable-features=WebAuthentication',
        '--disable-blink-features=CredentialManager,WebAuthenticationAPI'
      ] }
    : { headless: true, args: [
        '--disable-features=WebAuthentication',
        '--disable-blink-features=CredentialManager,WebAuthenticationAPI'
      ] };
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
  throw new Error('DOM did not stabilize in time');
}
