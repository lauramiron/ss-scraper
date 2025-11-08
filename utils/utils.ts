/* eslint-disable no-debugger */
import { Page } from "playwright";
import { insertSessionState, insertStreamingAccount, selectSessionState, selectStreamingAccount, selectStreamingService, SessionState } from "../db/dbQuery.js";
import { newChromiumBrowserFromPersistentContext, newChromiumBrowserFromSavedState } from "./playwrightUtils.js";

const env = process.env.ENV;


export async function loadSessionState(service: string) {
  // try load from cookies.js (used in local debug)
  debugger;
  // if (env == "debug") {
  //   const cookiesModule = await import(`../services/${service}/cookies.js`);
  //   const cookies = cookiesModule[`${service}Cookies`];
  //   console.log(`Loaded ${cookies.length} cookies for ${service}`);
  //   return {
  //     cookies: cookies,
  //     origins: []
  //   }
  // }

  // production: load from database
  console.log('Loading session state from database for ', service)
  const state = await selectSessionState(service);
  if (!state) console.log("No saved session state found");
  else console.log("Successfully loaded saved session state"); // TODO print time saved state saved
  return state;
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
  // try load from creds.js (used in local debug)
  debugger;
  // if (env == "debug") {
  //   const { creds } = await import("./creds.js");
  //   return creds;
  // }

  // production: load from database
  return selectStreamingAccount(service);
}

export async function saveCredentials(email, password, service) {
  // Get the streaming_service_id for the specified service
  const serviceId = (await selectStreamingService(service)).id;

  await insertStreamingAccount(serviceId, email, password)
}

interface RunScrapeConfig {
  service: string;
  browseUrl: string;
  ensureLoggedIn: (page: any) => Promise<Page>;
  extractContinueWatching: (page: any) => Promise<any[]>;
}

export async function runScrape(config: RunScrapeConfig) {
  const state = await loadSessionState(config.service);
  const { context, page } = await newChromiumBrowserFromSavedState(state);
  // const { context, page } = await newChromiumBrowserFromPersistentContext();

  await config.ensureLoggedIn(page);

  await page.goto(config.browseUrl, { waitUntil: "domcontentloaded" });

  const items = await config.extractContinueWatching(page);
  console.log(items);

  await saveSessionState(await context.storageState(), config.service);
  await context.close();

  return items;
}