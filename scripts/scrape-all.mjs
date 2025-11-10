// scripts/scrape-all.mjs
import "dotenv/config";
import { runScrape } from "../dist/utils/utils.js";
import { insertStreamingServiceData } from "../dist/db/dbQuery.js";

// Netflix
import {
  isLoggedIn as netflixIsLoggedIn,
  login as netflixLogin,
  isProfilesGate as netflixIsProfilesGate,
  selectProfile as netflixSelectProfile
} from "../dist/services/netflix/auth.js";
import {
  extractContinueWatching as netflixExtractContinueWatching,
  formatRawContinueWatchingData as netflixFormatRawContinueWatchingData
} from "../dist/services/netflix/scraper.js";

// Prime
import {
  isLoggedIn as primeIsLoggedIn,
  login as primeLogin,
  isProfilesGate as primeIsProfilesGate,
  selectProfile as primeSelectProfile
} from "../dist/services/prime/auth.js";
import {
  extractContinueWatching as primeExtractContinueWatching,
  formatRawContinueWatchingData as primeFormatRawContinueWatchingData
} from "../dist/services/prime/scraper.js";

// HBO
import {
  isLoggedIn as hboIsLoggedIn,
  login as hboLogin,
  isProfilesGate as hboIsProfilesGate,
  selectProfile as hboSelectProfile
} from "../dist/services/hbo/auth.js";
import {
  extractContinueWatching as hboExtractContinueWatching,
  formatRawContinueWatchingData as hboFormatRawContinueWatchingData
} from "../dist/services/hbo/scraper.js";

// Apple
import {
  isLoggedIn as appleIsLoggedIn,
  login as appleLogin,
  isProfilesGate as appleIsProfilesGate,
  selectProfile as appleSelectProfile
} from "../dist/services/apple/auth.js";
import {
  extractContinueWatching as appleExtractContinueWatching,
  formatRawContinueWatchingData as appleFormatRawContinueWatchingData
} from "../dist/services/apple/scraper.js";

// Disney
import {
  isLoggedIn as disneyIsLoggedIn,
  login as disneyLogin,
  isProfilesGate as disneyIsProfilesGate,
  selectProfile as disneySelectProfile
} from "../dist/services/disney/auth.js";
import {
  extractContinueWatching as disneyExtractContinueWatching,
  formatRawContinueWatchingData as disneyFormatRawContinueWatchingData
} from "../dist/services/disney/scraper.js";

const services = [
  {
    name: "netflix",
    browseUrl: "https://www.netflix.com/browse",
    isLoggedIn: netflixIsLoggedIn,
    login: netflixLogin,
    isProfilesGate: netflixIsProfilesGate,
    selectProfile: netflixSelectProfile,
    extractContinueWatching: netflixExtractContinueWatching,
    formatRawContinueWatchingData: netflixFormatRawContinueWatchingData
  },
  {
    name: "prime",
    browseUrl: "https://www.amazon.com/gp/video/storefront",
    isLoggedIn: primeIsLoggedIn,
    login: primeLogin,
    isProfilesGate: primeIsProfilesGate,
    selectProfile: primeSelectProfile,
    extractContinueWatching: primeExtractContinueWatching,
    formatRawContinueWatchingData: primeFormatRawContinueWatchingData
  },
  {
    name: "hbo",
    browseUrl: "https://play.hbomax.com",
    isLoggedIn: hboIsLoggedIn,
    login: hboLogin,
    isProfilesGate: hboIsProfilesGate,
    selectProfile: hboSelectProfile,
    extractContinueWatching: hboExtractContinueWatching,
    formatRawContinueWatchingData: hboFormatRawContinueWatchingData
  },
  {
    name: "apple",
    browseUrl: "https://tv.apple.com",
    isLoggedIn: appleIsLoggedIn,
    login: appleLogin,
    isProfilesGate: appleIsProfilesGate,
    selectProfile: appleSelectProfile,
    extractContinueWatching: appleExtractContinueWatching,
    formatRawContinueWatchingData: appleFormatRawContinueWatchingData
  },
  {
    name: "disney",
    browseUrl: "https://www.disneyplus.com/home",
    isLoggedIn: disneyIsLoggedIn,
    login: disneyLogin,
    isProfilesGate: disneyIsProfilesGate,
    selectProfile: disneySelectProfile,
    extractContinueWatching: disneyExtractContinueWatching,
    formatRawContinueWatchingData: disneyFormatRawContinueWatchingData
  }
];

async function scrapeService(serviceConfig) {
  console.log(`\n🚀 Starting scrape for ${serviceConfig.name}...`);

  try {
    const formattedData = await runScrape({
      service: serviceConfig.name,
      browseUrl: serviceConfig.browseUrl,
      isLoggedIn: serviceConfig.isLoggedIn,
      login: serviceConfig.login,
      isProfilesGate: serviceConfig.isProfilesGate,
      selectProfile: serviceConfig.selectProfile,
      extractContinueWatching: serviceConfig.extractContinueWatching,
      formatRawContinueWatchingData: serviceConfig.formatRawContinueWatchingData
    });

    await insertStreamingServiceData(serviceConfig.name, formattedData);

    console.log(`✅ ${serviceConfig.name} scrape completed successfully`);
    return { service: serviceConfig.name, success: true };
  } catch (error) {
    console.error(`❌ ${serviceConfig.name} scrape failed:`, error.message);
    return { service: serviceConfig.name, success: false, error: error.message };
  }
}

async function run() {
  console.log("🔄 Starting scrape for all services...\n");

  const results = [];

  // Run scrapes sequentially to avoid overwhelming the system
  for (const service of services) {
    const result = await scrapeService(service);
    results.push(result);
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SCRAPE SUMMARY");
  console.log("=".repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => console.log(`   - ${r.service}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => console.log(`   - ${r.service}: ${r.error}`));
  }

  console.log("=".repeat(50) + "\n");

  // Exit with non-zero code if any scrapes failed
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run();
