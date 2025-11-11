/* eslint-disable no-debugger */
import { Page } from "playwright";
import { existsSync } from "fs";
import { ContinueWatchingData, insertSessionState, insertStreamingAccount, selectSessionState, selectStreamingAccount, selectStreamingService, SessionState } from "../db/dbQuery.js";
import { newChromiumBrowserFromPersistentContext, newChromiumBrowserFromSavedState, waitForPageStable } from "./playwrightUtils.js";

const env = process.env.ENV;


export async function loadSessionState(service: string) {
  // Always try database first
  console.log(`[${service}] Looking for session state in database...`);
  const state = await selectSessionState(service);

  if (state) {
    console.log(`[${service}] ✓ Successfully loaded session state from database`);
    return state;
  }

  console.log(`[${service}] ✗ No session state found in database`);

  // Fallback: check if cookies.js file exists
  const cookiesPath = `./services/${service}/cookies.js`;
  if (!existsSync(cookiesPath)) {
    console.log(`[${service}] ✗ No cookies.js file found at ${cookiesPath}`);
    console.log(`[${service}] ⚠ No session state available - will need to log in`);
    return null;
  }

  // Load from cookies.js file (using path relative to project root)
  console.log(`[${service}] Looking for session state in cookies.js file...`);
  const { pathToFileURL } = await import('url');
  const cookiesModule = await import(pathToFileURL(cookiesPath).href);
  const cookies = cookiesModule[`${service}Cookies`];

  if (cookies && cookies.length > 0) {
    console.log(`[${service}] ✓ Loaded ${cookies.length} cookies from cookies.js file`);
    return {
      cookies: cookies,
      origins: []
    };
  }

  console.log(`[${service}] ✗ cookies.js file exists but contains no cookies`);
  console.log(`[${service}] ⚠ No session state available - will need to log in`);
  return null;
}

export async function saveSessionState(state: SessionState, service: string) {
  const serviceId = (await selectStreamingService(service)).id;

  // Find the earliest expiration time from cookies
  let expiresEpoch = null;
  if (state.cookies && Array.isArray(state.cookies)) {
    const cookiesWithExpires = state.cookies.filter(cookie => cookie.expires !== undefined && cookie.expires > 0);
    if (cookiesWithExpires.length > 0) {
      expiresEpoch = Math.min(...cookiesWithExpires.map(cookie => cookie.expires));
    }
  }

  await insertSessionState(serviceId, state, expiresEpoch);
}

export async function getCredentials(service) {
  return selectStreamingAccount(service);
}

export async function saveCredentials(email, password, service) {
  // Get the streaming_service_id for the specified service
  const serviceId = (await selectStreamingService(service)).id;

  await insertStreamingAccount(serviceId, email, password)
}

interface LoginConfig {
  service: string;
  browseUrl: string;
  isLoggedIn: (page: Page) => Promise<Boolean>;
  login: (page: Page) => Promise<void>;
  isProfilesGate: (page: Page) => Promise<Boolean>;
  selectProfile: (page: Page) => Promise<void>;
}

export async function ensureLoggedIn(config: LoginConfig, page: Page): Promise<Page> {

  await page.goto(config.browseUrl, { waitUntil: "domcontentloaded" });

  if (!await config.isLoggedIn(page)) {
    await config.login(page);
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 120000 });

  if (await config.isProfilesGate(page)) {
    await config.selectProfile(page);
  }

  await waitForPageStable(page);

  await saveSessionState(await page.context().storageState(), config.service);
  return page;
}

export interface ContinueWatchingItem {
  title: string;
  href: string;
}

interface RunScrapeConfig {
  service: string;
  browseUrl: string;
  isLoggedIn: (page: Page) => Promise<Boolean>;
  login: (page: Page) => Promise<void>;
  isProfilesGate: (page: Page) => Promise<Boolean>;
  selectProfile: (page: Page) => Promise<void>;
  extractContinueWatching: (page: any) => Promise<any[]>;
  formatRawContinueWatchingData: (data: any[], page: Page) => Promise<any>;
}

export async function runScrape(config: RunScrapeConfig): Promise<ContinueWatchingData> {
  const state = await loadSessionState(config.service);
  const { context, page } = await newChromiumBrowserFromSavedState(state);
  // const { context, page } = await newChromiumBrowserFromPersistentContext();

  await ensureLoggedIn({
    service: config.service,
    browseUrl: config.browseUrl,
    isLoggedIn: config.isLoggedIn,
    login: config.login,
    isProfilesGate: config.isProfilesGate,
    selectProfile: config.selectProfile
  }, page);

  await page.goto(config.browseUrl, { waitUntil: "domcontentloaded" });

  let items = [];
  let formattedData = {};
  try {
    items = await config.extractContinueWatching(page);
    formattedData = await config.formatRawContinueWatchingData(items, page);
    console.log(formattedData);
    await saveSessionState(await context.storageState(), config.service);
  } catch(e) {
    console.log("Failed to extract continue watching data: ", e);
  }

  await context.close();
  return formattedData;
}