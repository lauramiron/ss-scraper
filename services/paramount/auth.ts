import { Page } from "playwright";
import { waitForPageStable } from "../../utils/playwrightUtils.js";
import { getCredentials, saveSessionState } from "../../utils/utils.js";

export async function isProfilesGate(page: Page) {
  // Check if we're on the profiles selection page
  const profileTiles = page.locator('[data-testid="profile-card"], .profile-avatar');
  try {
    const count = await profileTiles.count();
    if (count === 0) return false;
    return await profileTiles.first().isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

export async function login(page: Page) {
  // const creds = await getCredentials("paramount");
  // if (!creds) throw new Error("No Paramount credentials stored");

  // await page.goto("https://www.paramountplus.com/account/signin/", { waitUntil: "domcontentloaded" });

  // await page.fill('input[type="email"], input[name="email"], input[id="email"]', creds.email);
  // await page.fill('input[type="password"], input[name="password"], input[id="password"]', creds.password);

  // const signIn = page.locator('button[type="submit"], button:has-text("Sign In"), .aa-button--signin');
  // await signIn.waitFor({ state: "visible", timeout: 15_000 });

  // await Promise.all([
  //   page.waitForURL(/(profile|home|shows)/, { timeout: 30_000 }),
  //   signIn.click()
  // ]);
  throw Error("login() not implemented for paramount")
}

export async function selectProfile(page: Page, profileName="Laura") {
  // if (profileName) {
  //   const named = page.locator(
  //     `[data-testid="profile-card"]:has-text("${profileName}"), .profile-avatar:has-text("${profileName}")`
  //   );
  //   if (await named.first().isVisible().catch(() => false)) {
  //     await Promise.all([
  //       waitForPageStable(page),
  //       named.first().click(),
  //     ]);
  //   } else {
  //     throw new Error("Paramount: Unable to locate profile " + profileName);
  //   }
  // } else {
  //   // No profile specified → click first visible tile
  //   const firstTile = page.locator('[data-testid="profile-card"], .profile-avatar').first();
  //   await Promise.all([
  //     waitForPageStable(page),
  //     firstTile.click(),
  //   ]);
  // }
  throw new Error("selectProfile() not implemented for Paramount")
}

export async function isLoggedIn(page: Page): Promise<Boolean> {
  // Check if login link is present on the page
  const loginLink = await page.locator('a[href="/account/flow/f-upsell/action/login/"]').count();
  return (loginLink == 0)
}
