import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { Page } from "playwright";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by heading text
async function locateContinueWatchingRail(page) {
  // Prime Video structure: section[data-testid="standard-carousel"]
  // containing span[data-testid="carousel-title"] > p with text "Continue Watching"
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    // Find all carousel sections
    const sections = await page.$$('section[data-testid="standard-carousel"]');

    for (const section of sections) {
      // Look for the carousel title span within this section
      const titleSpan = await section.$('span[data-testid="carousel-title"]');

      if (titleSpan) {
        // Check if it contains a p element with "Continue Watching" text
        const pElement = await titleSpan.$('span, p');
        if (pElement) {
          const text = await pElement.textContent();
          if (text?.trim().toLowerCase() === "continue watching") {
            return section;
          }
        }
      }
    }

    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail (Prime Video)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (Prime Video).");
    return [];
  }

  // Prime Video card structure: <a> elements with href containing "/detail/"
  const items = await rail.$$eval(
    'a[href*="/detail/"], a[href*="/gp/video/detail/"]',
    (anchors) => {
      const results = [];
      for (const a of anchors) {
        // Get title from the text content of the anchor element
        const title = a.textContent?.trim() || "";

        const href = a.href.startsWith('http')
          ? a.href
          : `https://www.amazon.com${a.getAttribute('href')}`;

        if (title && href) {
          results.push({ title, href });
        }
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail (Prime Video):", e?.message || e);
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (Prime Video)`);
  return items;
}

export async function formatRawContinueWatchingData(data, page: Page = null) {
  const formattedData = {};

  data.forEach((item, index) => {
    const match = item.href.match(/\/detail\/([A-Z0-9]+)/);
    const primeId = match ? match[1] : "";

    formattedData[index] = {
      title: item.title,
      id: primeId
    };
  });

  return formattedData;
}
