import "dotenv/config";
import { Page, ElementHandle } from "playwright";
import { ContinueWatchingData } from "db/dbQuery.js";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by heading text (case-insensitive)
async function locateContinueWatchingRail(page: Page): Promise<ElementHandle | null> {
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

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found.");
    return [];
  }

  // Grab cards within the rail; prefer deep links to watch/title
  const items = await rail.$$eval(
    'a[href*="/watch/"], a[href*="/title/"]',
    (anchors: HTMLAnchorElement[]) => {
      const results: { title: string; href: string }[] = [];
      for (const a of anchors) {
        const title = a.getAttribute('aria-label')?.trim() || "";
        const href = a.href.startsWith('http')
          ? a.href
          : `https://www.netflix.com${a.getAttribute('href')}`;
        results.push({ title, href });
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail:", e?.message || e);
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items`);
  return items;
}

export async function formatRawContinueWatchingData(data, page): Promise<ContinueWatchingData> {
    const formattedData: ContinueWatchingData = {};
    
    data.forEach((item, index) => {
      // Extract numeric ID from URL (e.g., /watch/81234567 or /title/81234567)
      const match = item.href.match(/\/(watch|title)\/(\d+)/);
      const netflixId = match ? match[2] : "";

      formattedData[index] = {
        title: item.title,
        id: netflixId
      };
   });
   return formattedData;
}