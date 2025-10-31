import { chromium } from "playwright";
import { query } from "../../db/index.js";

const env = process.env.ENV;

// util: scroll to trigger lazy rails
export async function lazyScroll(page, steps = 6, px = 900) {
    for (let i = 0; i < steps; i++) {
      await page.evaluate(y => window.scrollBy(0, y), px);
      await page.waitForTimeout(350);
    }
  }

export async function loadSessionState(service) {
  // try load from cookies.js (used in local debug)
  if (env == "debug") {
    const cookiesModule = await import(`./${service}/cookies.js`);
    const cookies = cookiesModule[`${service}Cookies`];
    console.log(`Loaded ${cookies.length} cookies for ${service}`);
    return {
      cookies: cookies,
      origins: []
    }
  }

  // production: load from database
  const { rows } = await query("SELECT json_state FROM session_states WHERE service=$1", [service]);
  return rows[0]?.json_state || null;
}

export async function saveSessionState(state, service) {
  if (env == "debug") return;

  await query(`
    INSERT INTO session_states (service, json_state)
    VALUES ($2, $1)
    ON CONFLICT (service) DO UPDATE SET json_state=$1, updated_at=now()
  `, [state, service]);
}

export async function newChromiumBrowserFromSavedState(service) {
  const browser = await chromium.launch({ headless: true });
  // const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const state = await loadSessionState(service);
  const context = await browser.newContext({ storageState: state || undefined });
  const page = await context.newPage();

  return { context, page };
}