import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { isLoggedIn, login, isProfilesGate, selectProfile } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://tv.apple.com"

// Create router using factory with Apple-specific functions
export const appleRouter = createStreamingServiceRouter({
  service: "apple",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "apple",
    browseUrl,
    isLoggedIn,
    login,
    isProfilesGate,
    selectProfile,
    extractContinueWatching,
    formatRawContinueWatchingData
  })
});
