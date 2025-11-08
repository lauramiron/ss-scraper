import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { ensureLoggedIn } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://www.amazon.com/gp/video/storefront"

// Create router using factory with Prime-specific functions
export const primeRouter = createStreamingServiceRouter({
  service: "prime",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "prime",
    browseUrl,
    ensureLoggedIn,
    extractContinueWatching
  }),
  formatRawContinueWatchingData,
});
