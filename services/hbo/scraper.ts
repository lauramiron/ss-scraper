import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { Page } from "playwright";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by heading text (case-insensitive)
async function locateContinueWatchingRail(page) {
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    // Find all section elements
    const sections = await page.$$('section');

    for (const section of sections) {
      // Check if this section contains a div with id="tileList"
      const tileListDiv = await section.$('div[id="tileList"]');
      if (!tileListDiv) continue;

      // Get the first h2 within this section
      const h2 = await section.$('h2');
      if (!h2) continue;

      // Check if h2 text equals "continue watching"
      const text = (await h2.textContent())?.trim().toLowerCase() || "";
      if (text === "continue watching") {
        return tileListDiv;
      }
    }

    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail (HBO)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (HBO).");
    // helpful diagnostics
    await page.screenshot({ path: "diag_hbo_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  const items = await rail.$$eval(
    'a[href*="/video/watch"]',
    (anchors) => {
      const results = [];
      for (const a of anchors) {
        const href = a.href;

        // Find span with className containing "StyledPrimaryTitle"
        const titleSpan = a.querySelector('span[class*="StyledPrimaryTitle"]');
        const title = titleSpan?.textContent?.trim() || "";

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

export async function formatRawContinueWatchingData(data, page) {
  const formattedData = {};

  data.forEach((item, index) => {
    // Extract the ID from /video/watch/ID format
    const match = item.href.match(/\/watch\/(.+?)(?:\/|$|\?)/);
    const hboId = match ? match[1] : "";

    formattedData[index] = {
      title: item.title,
      id: hboId
    };
  });

  return formattedData;
}
