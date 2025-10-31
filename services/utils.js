import { chromium } from "playwright";
import { query } from "../db/index.js";

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
  const { rows } = await query(`
    SELECT ss.json_state
    FROM session_states ss
    JOIN streaming_service s ON ss.streaming_service_id = s.id
    WHERE s.name = $1
  `, [service]);
  // @ts-ignore
  return rows[0]?.json_state || null;
}

export async function saveSessionState(state, service) {
  if (env == "debug") return;

  // Get the streaming_service_id, throw error if it doesn't exist
  const { rows } = await query(`
    SELECT id FROM streaming_service WHERE name = $1
  `, [service]);

  if (rows.length === 0) {
    throw new Error(`Streaming service '${service}' does not exist in streaming_service table`);
  }

  // @ts-ignore
  const serviceId = rows[0].id;

  // Save the session state
  await query(`
    INSERT INTO session_states (streaming_service_id, json_state)
    VALUES ($1, $2)
    ON CONFLICT (streaming_service_id) DO UPDATE
      SET json_state = $2, updated_at = now()
  `, [serviceId, state]);
}

export async function newChromiumBrowserFromSavedState(service) {
  const browser = await chromium.launch({ headless: true });
  // const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const state = await loadSessionState(service);
  const context = await browser.newContext({ storageState: state || undefined });
  const page = await context.newPage();

  return { context, page };
}