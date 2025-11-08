import { Page } from "playwright";
import { waitForPageStable } from "../../utils/playwrightUtils.js";
import { getCredentials, saveSessionState } from "../../utils/utils.js";

async function isProfilesGate(page: Page) {
  // TODO: Inspect HBO's profile selection page to determine correct selectors
  // HBO Max may use different selectors for profile tiles
  // const tiles = page.locator('[data-testid="profile-card"], .profile-card, [class*="profile"]');
  // try {
  //   const count = await tiles.count();
  //   if (count === 0) return false;
  //   return await tiles.first().isVisible({ timeout: 2000 }).catch(() => false);
  // } catch {
  //   return false;
  // }
  return false;
}

async function login(page) {
  const creds = await getCredentials("hbo");
  if (!creds) throw new Error("No HBO credentials stored");

  // TODO: Verify HBO's login URL - it may be play.max.com or hbomax.com depending on region
  await page.goto("https://play.max.com/signIn", { waitUntil: "domcontentloaded" });

  // TODO: Inspect HBO's login form to determine correct input selectors
  // These are educated guesses - HBO Max typically uses email/password fields
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', creds.email);
  await page.fill('input[type="password"], input[name="password"]', creds.password);

  // TODO: Verify the sign-in button selector
  const signIn = page.locator('button[type="submit"], button:has-text("Sign In"), [data-testid="signInButton"]');
  await signIn.waitFor({ state: "visible", timeout: 15_000 });

  await Promise.all([
    // TODO: Verify the URL patterns HBO redirects to after login
    page.waitForURL(/(profile|home|browse)/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

async function selectProfile(page, profileName="Laura") {
  // TODO: Inspect HBO's profile selection page to determine correct selectors
  // This is an educated guess based on common patterns
  // if (profileName) {
  //   const named = page.locator(
  //     `[data-testid="profile-card"]:has-text("${profileName}"), .profile-card:has-text("${profileName}")`
  //   );
  //   if (await named.first().isVisible().catch(() => false)) {
  //     await named.first().click();
  //   } else {
  //     throw new Error("HBO: Unable to locate profile " + profileName);
  //   }
  // } else {
  //   // No profile specified → click first visible tile
  //   const firstTile = page.locator('[data-testid="profile-card"], .profile-card').first();
  //   await firstTile.click();
  // }
  throw Error("selectProfile() not implemented for hbo");
}

export async function ensureLoggedIn(page: Page): Promise<Page> {
  // TODO: Verify HBO's browse/home URL
  await page.goto("https://play.max.com", { waitUntil: "domcontentloaded" });

  // Check login status via header navigation element
  const headerNavDiv = await page.locator('#header-secondary-nav-item').first();
  // const loginLink = await headerNavDiv.locator('a[href*="auth.hbomax.com/login"]').first();
  // const isLoggedIn = !(await loginLink.count().catch(() => 0) > 0);

  const href = await headerNavDiv.getAttribute('href').catch(() => null);
  const isLoggedIn = !href?.includes("auth.hbomax.com/login");
  
  if (!isLoggedIn) {
    await login(page);
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // Are we on the profiles gate?
  if (await isProfilesGate(page)) {
    await selectProfile(page);
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await waitForPageStable(page);

  const context = page.context();
  await saveSessionState(await context.storageState(), "hbo");
  return page;
}
