import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { isLoggedIn, login, isProfilesGate, selectProfile } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://play.max.com"

// Create router using factory with HBO-specific functions
export const hboRouter = createStreamingServiceRouter({
  service: "hbo",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "hbo",
    browseUrl,
    isLoggedIn,
    login,
    isProfilesGate,
    selectProfile,
    extractContinueWatching
  }),
  formatRawContinueWatchingData,
});
