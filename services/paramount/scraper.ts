import "dotenv/config";
import { Page, ElementHandle } from "playwright";
import { ContinueWatchingData } from "db/dbQuery.js";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by id
async function locateContinueWatchingRail(page: Page): Promise<ElementHandle | null> {
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    const rail = await page.$('div[id="keep-watching"]');
    if (rail) {
      return rail;
    }
    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail (Paramount)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (Paramount).");
    return [];
  }

  // Grab cards within the rail; look for links to /shows/ or /movies/
  const items = await rail.$$eval(
    'a[href*="/shows/"], a[href*="/movies/"]',
    (anchors: HTMLAnchorElement[]) => {
      const results: { title: string; href: string }[] = [];
      for (const a of anchors) {
        // Try to get title from aria-label, title attribute, or text content
        const title = a.getAttribute('aria-label')?.trim() ||
                     a.getAttribute('title')?.trim() ||
                     a.textContent?.trim() || "";
        const href = a.href.startsWith('http')
          ? a.href
          : `https://www.paramountplus.com${a.getAttribute('href')}`;

        if (title && href) {
          results.push({ title, href });
        }
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail (Paramount):", e?.message || e);
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (Paramount)`);
  return items;
}

export async function formatRawContinueWatchingData(data, page): Promise<ContinueWatchingData> {
  const formattedData: ContinueWatchingData = {};

  data.forEach((item, index) => {
    // Extract ID from URL (e.g., /shows/video/abc123/ or /movies/xyz789/)
    const match = item.href.match(/\/(shows|movies)\/(?:video\/)?([^/]+)/);
    const paramountId = match ? match[2] : "";

    formattedData[index] = {
      title: item.title,
      id: paramountId
    };
  });

  return formattedData;
}
