import express, { Request, Response, Router } from "express";
import { insertStreamingServiceData, ContinueWatchingData } from "./db/dbQuery.js";
import { ContinueWatchingItem } from "./services/netflix/scraper.js";
import { runScrape } from "utils/utils.js";

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

  return router;
}
