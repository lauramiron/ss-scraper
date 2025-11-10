import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cron from "node-cron";
import { netflixRouter } from "./services/netflix/routes.js";
import { primeRouter } from "./services/prime/routes.js";
import { hboRouter } from "./services/hbo/routes.js";
import { appleRouter } from "./services/apple/routes.js";
import { disneyRouter } from "./services/disney/routes.js";
import { router } from "./routes.js";
import { ALLOWED_IPS } from "./utils/const.js";
import { runAllScrapes } from "./utils/scheduledScrape.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/**
 * Middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]).trim()
    : req.socket.remoteAddress;

  // Log all requests
  console.log("REQ", req.method, req.path, "from", ip);

  // Only allow whitelisted IPs
  if (ALLOWED_IPS.includes(ip || "")) {
    console.log("Allowed IP:", ip);
    console.log(process.env.PLAYWRIGHT_BROWSERS_PATH);

    return next();
  } else {
    console.warn("Requiring x-api-key header from IP:", ip);
    const key = req.headers["x-api-key"];
    if (!key || key !== process.env.API_KEY) {
      console.warn("Bad/missing API key from", ip, "path:", req.path);
      return res.status(401).send("unauthorized");
    }
    else {
      next();
    }
  }
});


/**
 * Mount Routes
 */
app.use("/", router);
app.use("/netflix", netflixRouter);
app.use("/prime", primeRouter);
app.use("/hbo", hboRouter);
app.use("/apple", appleRouter);
app.use("/disney", disneyRouter);


/**
 * Start App
 */
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));


/**
 * Scheduled Tasks
 */
// Run scrape for all services once an hour, on the hour
cron.schedule('0 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled scrape...`);
  try {
    await runAllScrapes();
    console.log('✅ Scheduled scrape completed successfully');
  } catch (err) {
    console.error('❌ Scheduled scrape failed:', err);
  }
});

console.log('⏰ Cron job scheduled: scraping all services every hour on the hour');
