import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";
import { Page } from "playwright";
import { ContinueWatchingItem } from "utils/utils.js";

// util: find the Continue Watching rail by heading text
async function locateContinueWatchingRail(page) {
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    const handles = await page.$$('h2 > a > span');

    for (const spanHandle of handles) {
      const text = (await spanHandle.textContent())?.trim().toLowerCase() || "";

      if (text.includes("continue watching")) {
        // Find the closest div with data-testid="section-content"
        const sectionDiv = await spanHandle.evaluateHandle(el =>
          el.closest('div[data-testid="section-content"]')
        );

        if (!sectionDiv) continue;

        // Find the first div with class="shelf" inside that section
        const shelfDiv = await sectionDiv.asElement().$('div.shelf');

        if (shelfDiv) {
          return shelfDiv;
        }
      }
    }

    await lazyScroll(page, 2, 1200);
  }
  return null;
}

export async function extractContinueWatching(page: Page): Promise<ContinueWatchingItem[]> {
  console.log("🔎 Searching for Continue Watching rail (Apple TV+)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (Apple TV+).");
    await page.screenshot({ path: "diag_apple_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  // TODO: Inspect Apple TV+'s card/link structure to determine correct selectors
  // Apple TV+ likely uses different URL patterns
  const items = await rail.$$eval(
    'a[href*="/movie/"], a[href*="/episode/"]',
    (anchors) => {
      const results = [];
      for (const a of anchors) {
        const href = a.href;
        const isEpisode = href.includes("episode");

        // Apple only gives episode titles (no show title) for tv shows
        // Will follow link and extract title in formatRawContinueWatchingData
        const title = isEpisode ? null : a.getAttribute("aria-label")?.trim();

        if ((title && href) || (isEpisode && href)) {
          results.push({ title, href });
        }
      }
      return results;
    }
  ).catch(async (e) => {
    console.warn("⚠️ Could not eval card anchors in rail (Apple TV+):", e?.message || e);
    await page.screenshot({ path: "diag_apple_continue_watching_eval_error.png", fullPage: true }).catch(()=>{});
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (Apple TV+)`);
  return items;
}

export async function formatRawContinueWatchingData(data, page) {
  const formattedData = {};

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    const isEpisode = item.href.includes("episode");

    // Extract ID: everything after "episode/" or "movie/"
    let appleId = "";
    if (isEpisode) {
      const match = item.href.match(/\/episode\/(.+)/);
      appleId = match ? match[1] : "";
    } else {
      const match = item.href.match(/\/movie\/(.+)/);
      appleId = match ? match[1] : "";
    }

    let title = item.title;

    // For episodes, we need to navigate to the page to get the show title
    if (isEpisode) {
      try {
        await page.goto(item.href, { waitUntil: "domcontentloaded" });

        // Find anchor with href containing "/show/"
        const showLink = await page.$('a[href*="/show/"]');
        if (showLink) {
          title = (await showLink.textContent())?.trim() || null;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to extract show title for episode: ${item.href}`, e?.message);
      }
    }

    formattedData[index] = {
      title,
      id: appleId
    };
  }

  return formattedData;
}
