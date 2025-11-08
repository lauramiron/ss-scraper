import "dotenv/config";
import { lazyScroll } from "../../utils/playwrightUtils.js";

// util: find the Continue Watching rail by heading text
async function locateContinueWatchingRail(page) {
  // Prime Video structure: section[data-testid="standard-carousel"]
  // containing span[data-testid="carousel-title"] > p with text "Continue Watching"
  debugger;
  // try a few times after scrolls
  for (let pass = 0; pass < 3; pass++) {
    // Find all carousel sections
    const sections = await page.$$('section[data-testid="standard-carousel"]');

    for (const section of sections) {
      // Look for the carousel title span within this section
      const titleSpan = await section.$('span[data-testid="carousel-title"]');

      if (titleSpan) {
        // Check if it contains a p element with "Continue Watching" text
        const pElement = await titleSpan.$('p');
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

export async function extractContinueWatching(page) {
  console.log("🔎 Searching for Continue Watching rail (Prime Video)…");
  await lazyScroll(page);  // force some content to mount

  const rail = await locateContinueWatchingRail(page);
  if (!rail) {
    console.warn("⚠️ Continue Watching rail not found (Prime Video).");
    // helpful diagnostics
    await page.screenshot({ path: "diag_prime_no_continue_watching.png", fullPage: true }).catch(()=>{});
    return [];
  }

  // Prime Video card structure: <a> elements with href containing "/detail/"
  debugger;
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
    await page.screenshot({ path: "diag_prime_continue_watching_eval_error.png", fullPage: true }).catch(()=>{});
    return [];
  });

  console.log(`✅ Found ${items.length} continue-watching items (Prime Video)`);
  return items;
}

export async function formatRawContinueWatchingData(data) {
  const formattedData = {};

  data.forEach((item, index) => {
    // TODO: Verify Prime Video's URL structure and extract the appropriate ID
    // Prime Video URLs typically look like:
    //   - /gp/video/detail/B08XYZT123/
    //   - /detail/0TPB6PQ7OVE1234567890
    // Extract the ASIN or identifier
    const match = item.href.match(/\/detail\/([A-Z0-9]+)/);
    const primeId = match ? match[1] : "";

    formattedData[index] = {
      title: item.title,
      id: primeId
    };
  });

  return formattedData;
}
