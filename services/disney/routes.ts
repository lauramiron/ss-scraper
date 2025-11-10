import { runScrape } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { isLoggedIn, login, isProfilesGate, selectProfile } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://www.disneyplus.com/home";

// Create router using factory with Disney+-specific functions
export const disneyRouter = createStreamingServiceRouter({
  service: "disney",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "disney",
    browseUrl,
    isLoggedIn,
    login,
    isProfilesGate,
    selectProfile,
    extractContinueWatching,
    formatRawContinueWatchingData
  })
});
