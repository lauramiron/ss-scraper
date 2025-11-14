import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { isLoggedIn, login, isProfilesGate, selectProfile } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://www.paramountplus.com/home/"

// Create router using factory with Paramount-specific functions
export const paramountRouter = createStreamingServiceRouter({
  service: "paramount",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "paramount",
    browseUrl,
    isLoggedIn,
    login,
    isProfilesGate,
    selectProfile,
    extractContinueWatching,
    formatRawContinueWatchingData
  })
});
