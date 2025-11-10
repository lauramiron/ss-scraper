import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { Page } from "playwright";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by heading text (case-insensitive)
async function locateContinueWatchingRail(page: Page) {
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    // Find all h2 elements
    const handles = await page.$$('h2');

    for (const h of handles) {
      const txt = (await h.textContent())?.trim().toLowerCase() || "";
      if (txt.includes("continue watching") || txt.includes("keep watching")) {
        // rail container is usually the closest section/container ancestor
        const rail = await h.evaluateHandle(el => el.closest('section') || el.closest('div[class*="collection"]') || el.parentElement);
        return rail.asElement();
      }
    }
    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail (Disney+)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (Disney+).");
    // helpful diagnostics
    await page.screenshot({ path: "diag_disney_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  // Grab cards within the rail
  const items = await rail.$$eval(
    'a[href*="/video/"], a[href*="/movies/"], a[href*="/series/"]',
    (anchors: HTMLAnchorElement[]) => {
      const results: { title: string; href: string }[] = [];
      for (const a of anchors) {
        // Try to get title from aria-label or img alt text
        const title = a.getAttribute('aria-label')?.trim() ||
                     a.querySelector('img')?.getAttribute('alt')?.trim() || "";
        const href = a.href.startsWith('http')
          ? a.href
          : `https://www.disneyplus.com${a.getAttribute('href')}`;

        if (title && href) {
          results.push({ title, href });
        }
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail (Disney+):", e?.message || e);
    await page.screenshot({ path: "diag_disney_continue_watching_eval_error.png", fullPage: true }).catch(()=>{});
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (Disney+)`);
  return items;
}

export async function formatRawContinueWatchingData(data, page: Page = null) {
  const formattedData = {};

  data.forEach((item, index) => {
    // Extract ID from URL - Disney+ uses patterns like /video/GUID or /series/SLUG
    let disneyId = "";

    // Try to extract from /video/, /movies/, or /series/ URLs
    const videoMatch = item.href.match(/\/video\/([^/?]+)/);
    const movieMatch = item.href.match(/\/movies\/([^/?]+)/);
    const seriesMatch = item.href.match(/\/series\/([^/?]+)/);

    disneyId = videoMatch?.[1] || movieMatch?.[1] || seriesMatch?.[1] || "";

    formattedData[index] = {
      title: item.title,
      id: disneyId
    };
  });

  return formattedData;
}
