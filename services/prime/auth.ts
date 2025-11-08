import { Page, Locator } from "playwright";
import { getCredentials, saveSessionState } from "../../utils/utils.js";
import { waitForPageStable } from "../../utils/playwrightUtils.js";


async function login(page: Page, signInLink: Locator) {
  const creds = await getCredentials("prime");
  if (!creds) throw new Error("No Prime Video credentials stored");

  // Click the sign-in link to navigate to login page
  await signInLink.click();
  await page.waitForLoadState('domcontentloaded');

  // TODO: Inspect Amazon's login form to determine correct input selectors
  await page.fill('input[type="email"], input[name="email"], input[id="ap_email"]', creds.email);

  // Amazon login is often two-step (email then password)
  const continueButton = page.locator('input[type="submit"], button[type="submit"]').first();
  await continueButton.click();

  // Wait for password field to appear
  await page.waitForSelector('input[type="password"], input[name="password"], input[id="ap_password"]', { timeout: 5000 });
  await page.fill('input[type="password"], input[name="password"], input[id="ap_password"]', creds.password);

  // TODO: Verify the sign-in button selector
  const signIn = page.locator('input[type="submit"]').first();
  await signIn.waitFor({ state: "visible", timeout: 15_000 });

  await Promise.all([
    // TODO: Verify the URL patterns Amazon redirects to after login
    page.waitForURL(/amazon\.com/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

export async function ensureLoggedIn(page: Page): Promise<Page> {
  debugger;
  await page.goto("https://www.amazon.com/gp/video/storefront", { waitUntil: "domcontentloaded" });

  // Check login status by examining the account list navigation link
  const accountListDiv = await page.locator('#nav-link-accountList').first();
  const accountLink = await accountListDiv.locator('a').first();
  const href = await accountLink.getAttribute('href').catch(() => null);

  // const isLoggedIn = href === "https://www.amazon.com/gp/css/homepage.html?ref_=nav_youraccount_btn";
  const isLoggedIn = !href?.includes("/ap/signin");

  if (!isLoggedIn) {
    await login(page, accountLink);
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // Prime Video typically doesn't have a profile selector for personal accounts
  // TODO: Add profile selection logic if needed for household profiles

  await waitForPageStable(page);
  debugger;
  const context = page.context();
  await saveSessionState(await context.storageState(), "prime");
  return page;
}
