import { Page } from "playwright";
import { waitForPageStable } from "../../utils/playwrightUtils.js";
import { getCredentials, saveSessionState } from "../../utils/utils.js";

export async function isProfilesGate(page: Page) {
  return false;
}

export async function login(page) {
  /* TODO: Verify full sign-in flow */

  // const creds = await getCredentials("hbo");
  // if (!creds) throw new Error("No HBO credentials stored");

  // await page.goto("https://play.max.com/signIn", { waitUntil: "domcontentloaded" });

  // await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', creds.email);
  // await page.fill('input[type="password"], input[name="password"]', creds.password);

  // const signIn = page.locator('button[type="submit"], button:has-text("Sign In"), [data-testid="signInButton"]');
  // await signIn.waitFor({ state: "visible", timeout: 15_000 });

  // await Promise.all([
  //   page.waitForURL(/(profile|home|browse)/, { timeout: 30_000 }),
  //   signIn.click()
  // ]);
}

export async function selectProfile(page, profileName="Laura") {
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

export async function isLoggedIn(page: Page): Promise<Boolean> {
  const headerNavDiv = await page.locator('#header-secondary-nav-item').first();
  // const loginLink = await headerNavDiv.locator('a[href*="auth.hbomax.com/login"]').first();
  // const isLoggedIn = !(await loginLink.count().catch(() => 0) > 0);

  const href = await headerNavDiv.getAttribute('href').catch(() => null);
  return !href?.includes("auth.hbomax.com/login");
}

export async function ensureLoggedIn(page: Page): Promise<Page> {
  await page.goto("https://play.max.com", { waitUntil: "domcontentloaded" });
  
  if (!isLoggedIn(page)) {
    await login(page);
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // Are we on the profiles gate?
  if (await isProfilesGate(page)) {
    await selectProfile(page);
  }

  await waitForPageStable(page);

  const context = page.context();
  await saveSessionState(await context.storageState(), "hbo");
  return page;
}
