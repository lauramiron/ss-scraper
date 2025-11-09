import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { isLoggedIn, login, isProfilesGate, selectProfile } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://www.netflix.com/browse"

// Create router using factory with Netflix-specific functions
export const netflixRouter = createStreamingServiceRouter({
  service: "netflix",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "netflix",
    browseUrl,
    isLoggedIn,
    login,
    isProfilesGate,
    selectProfile,
    extractContinueWatching
  }),
  formatRawContinueWatchingData,
});
