 
import { Page } from "playwright";
import { getCredentials, saveSessionState } from "../../utils/utils.js";
import { waitForPageStable } from "../../utils/playwrightUtils.js";

export async function isProfilesGate(page) {
  // Any profile tiles visible?
  const tiles = page.locator('[data-uia="profile-link"], [data-uia="profile-button"]');
  try {
    const count = await tiles.count();
    if (count === 0) return false;
    // ensure at least one is actually visible
    return await tiles.first().isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

// async function waitForBrowseReady(page, { timeout = 30000 } = {}) {
//   // We consider browse "ready" when *no* profile tiles are visible
//   // AND a known home/browse UI element appears.
//   // We check multiple candidates to be robust against A/B changes.

//   const browseSelectors = [
//     // top nav / profile menu / search box (common)
//     '[class="account-dropdown-button"]',
//     '[data-uia="account-dropdown-button"]',
//     '[class="search-box-input"]',
//     // a generic rail/row container often present on home
//     '[data-uia="page-section"]',
//     // fallback: any “Continue Watching” rail anchor
//     '[data-list-context="continueWatching"]',
//     '[data-list-context="watchAgain"]',
//   ].join(',');

//   await page.waitForFunction(
//     ({ browseSelectors }) => {
//       const hasBrowseUI = !!document.querySelector(browseSelectors);
//       return hasBrowseUI;
//     },
//     { browseSelectors },
//     { timeout }
//   );
// }

export async function login(page: Page) {
  const creds = await getCredentials("netflix");
  if (!creds) throw new Error("No Netflix credentials stored");

  await page.goto("https://www.netflix.com/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[name="userLoginId"]', creds.email);
  await page.fill('input[name="password"]', creds.password);

  const signIn = page.locator('button[data-uia="sign-in-button"]');
  await signIn.waitFor({ state: "visible", timeout: 15_000 });


  await Promise.all([
    // wait for either profiles or browse (login destination varies)
    page.waitForURL(/(profiles|browse|YourAccount|profiles\/gate)/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

export async function selectProfile(page: Page, profileName="Laura") {
  if (profileName) {
    // Try to click the named profile first
    const named = page.locator(
      `[class="profile-link"]:has-text("${profileName}"), [data-uia="profile-button"]:has-text("${profileName}")`
    );
    if (await named.first().isVisible().catch(() => false)) {
      await Promise.all([
        named.first().click(),
      ]);
    } else {
      throw new Error("Netflix: Unable to location profile "+ profileName);
    }
  } else {
    // No profile specified → click first visible tile
    const firstTile = page.locator('[class="profile-link"], [data-uia="profile-button"]').first();
    await Promise.all([
      waitForPageStable(page),
      // waitForBrowseReady(page, { timeout: 30000 }),
      firstTile.click(),
    ]);
  }
}

export async function isLoggedIn(page: Page) : Promise<Boolean> {
  return !(page.url()).includes("login");
}

