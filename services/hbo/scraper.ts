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
    return [];
  }

  const anchors = await rail.$$('a[href*="/video/watch"]');
  const items = [];

  for (const a of anchors) {
    const href = await a.getAttribute('href');

    // Find span with className containing "StyledPrimaryTitle"
    const titleSpan = await a.$('span[class*="StyledPrimaryTitle"]');
    const secondaryTitleSpan = await a.$('span[class*="StyledSecondaryTitle"]');
    const type = (secondaryTitleSpan) ? "episode" : "movie"

    let title;
    if (type == "movie") {
      title = titleSpan ? await titleSpan.textContent() : "";
    } else {
      const ariaLabel = await a.getAttribute('aria-label');
      const match = ariaLabel?.match(/Watch (.+?)\./);
      title = match ? match[1] : "";
    }

    if (title && href) {
      items.push({ title, href, type });
    }
  }
  return items;
  // console.warn("⚠️ Could not eval card anchors in rail (HBO):", e?.message || e);
  // return [];

  console.log(`✅ Found ${items.length} continue-watching items (HBO)`);
  return items;
}

export async function formatRawContinueWatchingData(data, page) {
  const formattedData = {};

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    // Extract the ID from /video/watch/ID format
    if (item.type == "episode") {
      const searchUrl = "https://play.hbomax.com/search/result?q=" + encodeURIComponent(item.title)
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

      // Find the search results section
      const section = await page.$('section[data-sonic-id="search-page-rail-results"]');
      if (section) {
        // Find anchor element with aria-label containing the title
        const anchor = await section.$(`a[aria-label*="${item.title.replace(/"/g, '\\"')}"]`);
        if (anchor) {
          const href = await anchor.getAttribute('href');
          // Extract ID from /show/[id] format
          const showMatch = href?.match(/\/show\/([^/]+)/);
          const showId = showMatch ? showMatch[1] : "";

          formattedData[index] = {
            title: item.title,
            id: showId
          };
          continue;
        }
      }
    }

    const match = item.href.match(/\/watch\/(.+?)(?:\/|$|\?)/);
    const hboId = match ? match[1] : "";

    formattedData[index] = {
      title: item.title,
      id: hboId
    };
  }

  return formattedData;
}
