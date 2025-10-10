import { chromium } from "playwright";
import { query } from "../../db/index.js";

const ENCRYPTION_KEY = process.env.PG_ENCRYPTION_KEY;

export async function getCredentials() {
  const { rows } = await query(`
    SELECT
      email,
      pgp_sym_decrypt(encrypted_password, $1) AS password
    FROM streaming_accounts
    WHERE service='netflix'
  `, [ENCRYPTION_KEY]);
  return rows[0] || null;
}

export async function saveCredentials(email, password) {
  await query(`
    INSERT INTO streaming_accounts (service, email, encrypted_password)
    VALUES ('netflix', $1, pgp_sym_encrypt($2, $3))
    ON CONFLICT (service)
      DO UPDATE SET
        email=$1,
        encrypted_password=pgp_sym_encrypt($2, $3),
        updated_at=now()
  `, [email, password, ENCRYPTION_KEY]);
}

export async function loadSessionState() {
  const { rows } = await query("SELECT json_state FROM session_states WHERE service='netflix'");
  return rows[0]?.json_state || null;
}

export async function saveSessionState(state) {
  await query(`
    INSERT INTO session_states (service, json_state)
    VALUES ('netflix', $1)
    ON CONFLICT (service) DO UPDATE SET json_state=$1, updated_at=now()
  `, [state]);
}

export async function ensureLoggedIn() {
  const creds = await getCredentials();
  if (!creds) throw new Error("No Netflix credentials stored");

  const browser = await chromium.launch({ headless: true });
  const state = await loadSessionState();
  const context = await browser.newContext({ storageState: state || undefined });
  const page = await context.newPage();

  await page.goto("https://www.netflix.com/browse", { waitUntil: "domcontentloaded" });

  const isLoggedIn = !(await page.url()).includes("login");
  if (isLoggedIn) {
    await saveSessionState(await context.storageState());
    await browser.close();
    return context;
  }

  // otherwise login manually
  await page.goto("https://www.netflix.com/login", { waitUntil: "networkidle" });
  await page.fill('input[name="userLoginId"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await page.click('button[data-uia="login-submit-button"]');
  await page.waitForLoadState("networkidle");

  // Select second profile
  // TODO: Make general
  const profileBtn = await page.$('[data-uia="action-select-profile+secondary"]');
  if (profileBtn) await profileBtn.click();

  await saveSessionState(await context.storageState());
  await browser.close();
  return context;
}
