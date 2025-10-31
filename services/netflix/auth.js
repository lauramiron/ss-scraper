// import { chromium } from "playwright";
import { query } from "../../db/index.js";
import { saveSessionState } from "../utils.js";

const ENCRYPTION_KEY = process.env.PG_ENCRYPTION_KEY;
const env = process.env.ENV;

export async function getCredentials(service) {
  // try load from creds.js (used in local debug)
  if (env == "debug") {
    const { creds } = await import("./creds.js");
    return creds;
  }

  // production: load from database
  const { rows } = await query(`
    SELECT
      sa.email,
      pgp_sym_decrypt(sa.encrypted_password, $1) AS password
    FROM streaming_accounts sa
    JOIN streaming_service s ON sa.streaming_service_id = s.id
    WHERE s.name = $2
  `, [ENCRYPTION_KEY, service]);
  return rows[0] || null;
}

export async function saveCredentials(email, password, service) {
  if (env == "debug") return;

  // Get the streaming_service_id for the specified service
  const { rows } = await query(`
    SELECT id FROM streaming_service WHERE name = $1
  `, [service]);

  if (rows.length === 0) {
    throw new Error(`Streaming service '${service}' does not exist in streaming_service table`);
  }

  // @ts-ignore
  const serviceId = rows[0].id;

  await query(`
    INSERT INTO streaming_accounts (streaming_service_id, email, encrypted_password)
    VALUES ($1, $2, pgp_sym_encrypt($3, $4))
    ON CONFLICT (streaming_service_id)
      DO UPDATE SET
        email = $2,
        encrypted_password = pgp_sym_encrypt($3, $4)
  `, [serviceId, email, password, ENCRYPTION_KEY]);
}

async function isProfilesGate(page) {
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

async function waitForBrowseReady(page, { timeout = 30000 } = {}) {
  // We consider browse "ready" when *no* profile tiles are visible
  // AND a known home/browse UI element appears.
  // We check multiple candidates to be robust against A/B changes.

  const browseSelectors = [
    // top nav / profile menu / search box (common)
    '[class="account-dropdown-button"]',
    '[data-uia="account-dropdown-button"]',
    '[class="search-box-input"]',
    // a generic rail/row container often present on home
    '[data-uia="page-section"]',
    // fallback: any “Continue Watching” rail anchor
    '[data-list-context="continueWatching"]',
    '[data-list-context="watchAgain"]',
  ].join(',');

  await page.waitForFunction(
    ({ browseSelectors }) => {
      // const onProfiles =
      //   !!document.querySelector('[class="profile-link"], [class="profile-button"]');
      const hasBrowseUI = !!document.querySelector(browseSelectors);
      return hasBrowseUI;
      // return !onProfiles && hasBrowseUI;
    },
    { browseSelectors },
    { timeout }
  );
}

async function login(page) {
  const creds = await getCredentials("netflix");
  if (!creds) throw new Error("No Netflix credentials stored");

  await page.goto("https://www.netflix.com/login", { waitUntil: "domcontentloaded" });
  // @ts-ignore
  await page.fill('input[name="userLoginId"]', creds.email);
  // @ts-ignore
  await page.fill('input[name="password"]', creds.password);
  
  const signIn = page.locator('button[data-uia="sign-in-button"]');
  await signIn.waitFor({ state: "visible", timeout: 15_000 });


  await Promise.all([
    // wait for either profiles or browse (login destination varies)
    page.waitForURL(/(profiles|browse|YourAccount|profiles\/gate)/, { timeout: 30_000 }),
    signIn.click()
  ]);
}

async function selectProfile(page, profileName="Laura") {
  if (profileName) {
    // Try to click the named profile first
    const named = page.locator(
      `[class="profile-link"]:has-text("${profileName}"), [data-uia="profile-button"]:has-text("${profileName}")`
    );
    if (await named.first().isVisible().catch(() => false)) {
      await Promise.all([
        // waitForBrowseReady(page, { timeout: 30000 }),
        named.first().click(),
      ]);
    } else {
      throw new Error("Netflix: Unable to location profile "+ profileName);
    }
  } else {
    // No profile specified → click first visible tile
    const firstTile = page.locator('[class="profile-link"], [data-uia="profile-button"]').first();
    await Promise.all([
      waitForBrowseReady(page, { timeout: 30000 }),
      firstTile.click(),
    ]);
  }
}

export async function ensureLoggedIn(page) {

  await page.goto("https://www.netflix.com/browse", { waitUntil: "domcontentloaded" });

  const isLoggedIn = !(await page.url()).includes("login");
  if (!isLoggedIn) {
    await login(page);
  }

  /**
   * After clicking the sign-in button, Netflix may:
   *  - land directly on browse, or
   *  - show the profile picker (also under /browse).
   * We wait for DOM to settle, detect profiles, select one if needed,
   * then wait for browse UI to be ready.
   */
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // Are we on the profiles gate?
  if (await isProfilesGate(page)) {
    await selectProfile(page);
  }

  await waitForBrowseReady(page, { timeout: 30000 });

  const context = page.context();
  await saveSessionState(await context.storageState(), "netflix");
  // await browser.close();
  return { context, page };
}
