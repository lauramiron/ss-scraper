import { Page } from "playwright";
import { getCredentials, saveSessionState } from "../../utils/utils.js";
import { waitForPageStable } from "../../utils/playwrightUtils.js";


export async function login(page: Page) {
  // TODO: Verify Apple TV+ login flow
  const creds = await getCredentials("apple");
  if (!creds) throw new Error("No Apple TV+ credentials stored");

  // TODO: Determine correct login URL and selectors for Apple TV+
  // Apple TV+ may redirect to appleid.apple.com for authentication
  await page.goto("https://tv.apple.com/signin", { waitUntil: "domcontentloaded" });

  // TODO: Verify input selectors for Apple ID login
  await page.fill('input[type="email"], input[name="email"], input[id="account_name_text_field"]', creds.email);

  // TODO: Verify continue/next button selector
  const continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first();
  await continueButton.click();

  await page.waitForLoadState('domcontentloaded');

  // TODO: Verify password input selector
  await page.fill('input[type="password"], input[name="password"], input[id="password_text_field"]', creds.password);

  const signIn = page.locator('button[type="submit"], button:has-text("Sign In")').first();
  await signIn.waitFor({ state: "visible", timeout: 15_000 });

  await Promise.all([
    page.waitForURL(/tv\.apple\.com/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

export async function isLoggedIn(page: Page): Promise<Boolean> {
  // Check for sign-in button with specific test ID
  const signInButton = await page.locator('button[data-testid="sign-in-button"]').first();
  const isSignInVisible = await signInButton.isVisible().catch(() => false);

  return !isSignInVisible;
}

export async function isProfilesGate(page: Page): Promise<Boolean> {
  // Apple TV+ does not have a profile selection screen
  return false;
}

export async function selectProfile(page: Page) {
  throw Error("selectProfile() not implemented for apple - Apple TV+ does not have profiles");
}

