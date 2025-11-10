import { Page } from "playwright";
import { getCredentials } from "../../utils/utils.js";

export async function isLoggedIn(page: Page): Promise<Boolean> {
  // Disney+ shows a "Sign Up" or "Log In" button when not logged in
  const loginButton = await page.locator('a[href*="/login"], button:has-text("Log In")').first();
  const isLoginVisible = await loginButton.isVisible().catch(() => false);
  return !isLoginVisible;
}

export async function login(page: Page) {
  const creds = await getCredentials("disney");
  if (!creds) throw new Error("No Disney+ credentials stored");

  await page.goto("https://www.disneyplus.com/login", { waitUntil: "domcontentloaded" });

  // Fill in email
  await page.fill('input[type="email"]', creds.email);
  await page.click('button[type="submit"]');

  // Wait for password field and fill it
  await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
  await page.fill('input[type="password"]', creds.password);

  // Click login button and wait for navigation
  await Promise.all([
    page.waitForURL(/disneyplus\.com\/(?!login)/, { timeout: 30_000 }),
    page.click('button[type="submit"]')
  ]);
}

export async function isProfilesGate(page: Page): Promise<Boolean> {
  // Disney+ may show profile selection screen
  const profileTiles = page.locator('[data-testid="avatar-selector"]');
  try {
    const count = await profileTiles.count();
    if (count === 0) return false;
    return await profileTiles.first().isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

export async function selectProfile(page: Page, profileName = "Laura") {
  // Click the first available profile
  const firstProfile = page.locator('[data-testid="avatar-selector"]').first();
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    firstProfile.click()
  ]);
}
