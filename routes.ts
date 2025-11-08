import express, { Request, Response, Router } from "express";
import { insertStreamingServiceData, ContinueWatchingData } from "./db/dbQuery.js";
import { ContinueWatchingItem } from "./services/netflix/scraper.js";
import { getCredentials, saveCredentials } from "./utils/utils.js";

interface StreamingServiceRouterConfig {
  service: string;
  browseUrl: string;
  runScrape: () => Promise<ContinueWatchingItem[]>;
  formatRawContinueWatchingData: (data: ContinueWatchingItem[]) => Promise<ContinueWatchingData>;
}

export function createStreamingServiceRouter(config: StreamingServiceRouterConfig): Router {
  const router = express.Router();

  router.get("/resume", async (req: Request, res: Response) => {
    // Debug double requests
    const purpose = req.headers['sec-fetch-dest'] || req.headers['purpose'];
    const accept = req.headers['accept'] || '';

    if (purpose === 'prefetch') {
      console.log('⚠️ Pre-fetch request:', { purpose, accept: accept.substring(0, 50) })
    }

    if (req.headers['sec-fetch-mode'] === 'no-cors') {
      console.log('⚠️ No-cors request:', { purpose, accept: accept.substring(0, 50) })
    }
    
    if (accept.includes('image/')) {
      console.log('⚠️ Image request:', { purpose, accept: accept.substring(0, 50) })
    }
    
    if (req.url.includes('favicon')) {
      console.log('⚠️ Favicon request:', { purpose, accept: accept.substring(0, 50) })
    }

    // console.log('⚠️ Ignoring non-user request:', { purpose, accept: accept.substring(0, 50) });
    // return res.status(204).send();

    try {
      const data = await config.runScrape();
      const formattedData = await config.formatRawContinueWatchingData(data);

      await insertStreamingServiceData(config.service, formattedData);

      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).send("Scrape failed");
    }
  });

  // GET /login - Serve a simple HTML form to enter credentials manually
  router.get("/login", async (_req: Request, res: Response) => {
    const creds = await getCredentials(config.service);
    const serviceName = config.service.charAt(0).toUpperCase() + config.service.slice(1);

    res.send(`
      <html><body>
        <h2>${serviceName} Login</h2>
        <form method="POST" action="/${config.service}/login">
          <label>Email: <input name="email" value="${creds?.email || ""}" /></label><br/>
          <label>Password: <input name="password" type="password" /></label><br/>
          <button type="submit">Save</button>
        </form>
      </body></html>
    `);
  });

  // POST /login - Save credentials
  router.post("/login", express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Missing fields");
    await saveCredentials(email, password, config.service);
    res.send("Credentials saved. The next scrape will log in automatically.");
  });

  return router;
}
