import { Page, Locator } from "playwright";
import { getCredentials, saveSessionState } from "../../utils/utils.js";
import { waitForPageStable } from "../../utils/playwrightUtils.js";


export async function login(page: Page) {
  // TODO: Verify flow if browser loaded from saved state but still need to re-authenticate
  // Without saved state, triggers 2-factor authentication via text
  const creds = await getCredentials("prime");
  if (!creds) throw new Error("No Prime Video credentials stored");

  const signInLink = page.locator('#nav-link-accountList').first().locator('a').first();
  await signInLink.click();
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[type="email"], input[name="email"], input[id="ap_email"]', creds.email);

  const continueButton = page.locator('input[type="submit"], button[type="submit"]').first();
  await continueButton.click();

  await page.waitForSelector('input[type="password"], input[name="password"], input[id="ap_password"]', { timeout: 5000 });
  await page.fill('input[type="password"], input[name="password"], input[id="ap_password"]', creds.password);

  const signIn = page.locator('input[type="submit"]').first();
  await signIn.waitFor({ state: "visible", timeout: 15_000 });

  await Promise.all([
    page.waitForURL(/amazon\.com/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

export async function isLoggedIn(page: Page) {
  const accountListDiv = await page.locator('#nav-link-accountList').first();
  const accountLink = await accountListDiv.locator('a').first();
  const href = await accountLink.getAttribute('href').catch(() => null);

  // const isLoggedIn = href === "https://www.amazon.com/gp/css/homepage.html?ref_=nav_youraccount_btn";
  return !href?.includes("/ap/signin");
}

export async function isProfilesGate(page: Page): Promise<Boolean> {
  return false;
}

export async function selectProfile(page: Page) {
  throw Error("selectProfile() not implemented for prime");
}

