import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";

// util: find the Continue Watching rail by heading text (case-insensitive)
async function locateContinueWatchingRail(page) {
  // TODO: Inspect HBO's page structure to determine correct heading selectors
  // HBO Max may use different heading tags or data attributes
  const headingSelector = [
    'h2[data-testid]',
    'h3[data-testid]',
    '[class*="heading"]',
    'h2', 'h3', 'h4'
  ].join(',');

  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    const handles = await page.$$(headingSelector);
    for (const h of handles) {
      const txt = (await h.textContent())?.trim().toLowerCase() || "";
      // TODO: Verify the exact text HBO uses - might be "Continue Watching", "Keep Watching", etc.
      if (txt.includes("continue watching") || txt.includes("keep watching")) {
        // TODO: Verify the correct parent container structure for HBO rails
        // rail container is usually the closest section/container ancestor
        const rail = await h.evaluateHandle(el =>
          el.closest('[data-testid*="rail"]') ||
          el.closest('section') ||
          el.closest('[class*="rail"]') ||
          el.parentElement
        );
        return rail.asElement();
      }
    }
    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page) {
  console.log("🔎 Searching for Continue Watching rail (HBO)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (HBO).");
    // helpful diagnostics
    await page.screenshot({ path: "diag_hbo_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  // TODO: Inspect HBO's card/link structure to determine correct selectors
  // HBO Max typically uses different URL patterns than Netflix
  // Common patterns: /series/, /feature/, /episode/, /watch/
  const items = await rail.$$eval(
    'a[href*="/series/"], a[href*="/feature/"], a[href*="/episode/"], a[href*="/watch/"]',
    (anchors) => {
      const results = [];
      for (const a of anchors) {
        // TODO: Verify how HBO stores title information in the DOM
        // Try multiple possible sources for the title
        const title =
          a.getAttribute('aria-label')?.trim() ||
          a.querySelector('img')?.getAttribute('alt')?.trim() ||
          a.querySelector('[class*="title"]')?.textContent?.trim() ||
          "";

        const href = a.href.startsWith('http')
          ? a.href
          : `https://play.max.com${a.getAttribute('href')}`;

        if (title && href) {
          results.push({ title, href });
        }
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail (HBO):", e?.message || e);
    await page.screenshot({ path: "diag_hbo_continue_watching_eval_error.png", fullPage: true }).catch(()=>{});
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (HBO)`);
  return items;
}

export async function formatRawContinueWatchingData(data) {
  const formattedData = {};

  data.forEach((item, index) => {
    // TODO: Verify HBO's URL structure and extract the appropriate ID
    // HBO Max uses different URL patterns than Netflix
    // Examples:
    //   - /series/urn:hbo:series:...
    //   - /feature/urn:hbo:feature:...
    //   - /episode/urn:hbo:episode:...
    // Extract the URN or other identifier
    const match = item.href.match(/\/(series|feature|episode|watch)\/(urn:hbo:[^/]+|[\w-]+)/);
    const hboId = match ? match[2] : "";

    formattedData[index] = {
      title: item.title,
      id: hboId
    };
  });

  return formattedData;
}
