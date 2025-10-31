import "dotenv/config";
import { ensureLoggedIn, saveSessionState } from "./auth.js";
import { lazyScroll, newChromiumBrowserFromSavedState } from "../utils.js";


// util: find the Continue Watching rail by heading text (case-insensitive)
async function locateContinueWatchingRail(page) {
  // common heading nodes Netflix uses
  const headingSelector = [
    'h2[data-uia]',        // typical rail titles
    'h3[data-uia]',
    'h2', 'h3'
  ].join(',');

  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    const handles = await page.$$(headingSelector);
    for (const h of handles) {
      const txt = (await h.textContent())?.trim().toLowerCase() || "";
      if (txt.includes("continue watching")) {
        // rail container is usually the closest section/container ancestor
        const rail = await h.evaluateHandle(el => el.closest('section') || el.parentElement);
        return rail.asElement();
      }
    }
    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page) {
  console.log("🔎 Searching for Continue Watching rail…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found.");
    // helpful diagnostics
    await page.screenshot({ path: "diag_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  // Grab cards within the rail; prefer deep links to watch/title
  const items = await rail.$eval(
    // anchor targets can vary; match both
    'a[href*="/watch/"], a[href*="/title/"]',
    // this callback runs for the *first* matching element only, so we can’t map here.
    // Instead we’ll use evaluateAll from a locator below.
    () => true
  ).then(async () => {
    const cardLinks = await rail.$$('a[href*="/watch/"], a[href*="/title/"]');
    const results = [];
    for (const a of cardLinks) {
      const href = await a.getAttribute('href');
      const titleEl = await a.$('[data-uia], img[alt], span'); // heuristics
      const titleText =
        (await titleEl?.getAttribute('aria-label')) ||
        (await titleEl?.getAttribute('alt')) ||
        (await titleEl?.textContent()) || "";
      results.push({
        title: titleText.trim(),
        href: href && (href.startsWith('http') ? href : `https://www.netflix.com${href}`)
      });
    }
    return results;
  }).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail:", e?.message || e);
    await page.screenshot({ path: "diag_continue_watching_eval_error.png", fullPage: true }).catch(()=>{});
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items`);
  return items;
}


export async function scrapeNetflixContinueWatching() {
  const { context, page } = await newChromiumBrowserFromSavedState("netflix");

  await ensureLoggedIn(page);
  // const page = await context.newPage();

  await page.goto("https://www.netflix.com/browse", { waitUntil: "domcontentloaded" });

  const items = await extractContinueWatching(page);
  console.log(items);

  // const items = await page.$$eval('[class="continue-watching"] a', (links) =>
  //   links.map((l) => ({
  //     title: l.textContent?.trim(),
  //     href: l.getAttribute("href"),
  //   }))
  // );

  // const browser = await chromium.launch({ headless: false, slowMo: 100 });
  // const context = await browser.newContext();
  // await context.addCookies(netflixCookies);
  // const page = await context.newPage();
  // await page.goto("https://www.netflix.com/");

  await saveSessionState(await context.storageState());
  await context.close();

  return items;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await scrapeNetflixContinueWatching();
  console.log(result);
  process.exit(0);
}