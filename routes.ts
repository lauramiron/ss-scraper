import express, { Request, Response, Router } from "express";
import { insertStreamingServiceData, ContinueWatchingData, insertSessionState, selectStreamingService, SessionState } from "./db/dbQuery.js";
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

        <h3>Save Credentials</h3>
        <form method="POST" action="/${config.service}/login">
          <label>Email: <input name="email" value="${creds?.email || ""}" /></label><br/>
          <label>Password: <input name="password" type="password" /></label><br/>
          <button type="submit">Save Credentials</button>
        </form>

        <hr style="margin: 30px 0;"/>

        <h3>Upload Session State</h3>
        <form method="POST" action="/${config.service}/login/session">
          <label>Paste Session State JSON:<br/>
            <textarea name="sessionState" rows="10" cols="60" placeholder='{"cookies": [...], "origins": [...]}'></textarea>
          </label><br/>
          <button type="submit">Upload Session State</button>
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

  // POST /login/session - Upload session state
  router.post("/login/session", express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
    const { sessionState } = req.body;

    if (!sessionState) {
      return res.status(400).send("Missing session state");
    }

    try {
      // Parse and validate JSON
      const state: SessionState = JSON.parse(sessionState);

      if (!state.cookies || !Array.isArray(state.cookies)) {
        return res.status(400).send("Invalid session state format: missing or invalid 'cookies' array");
      }

      // Find earliest cookie expiration
      let expiresEpoch: number | null = null;
      const cookiesWithExpires = state.cookies.filter(cookie => cookie.expires !== undefined && cookie.expires > 0);
      if (cookiesWithExpires.length > 0) {
        expiresEpoch = Math.min(...cookiesWithExpires.map(cookie => cookie.expires));
      }

      // Get service ID and save session state
      const serviceRow = await selectStreamingService(config.service);
      await insertSessionState(serviceRow.id, state, expiresEpoch);

      res.send("Session state uploaded successfully. The next scrape will use this session.");
    } catch (error) {
      if (error instanceof SyntaxError) {
        return res.status(400).send("Invalid JSON format");
      }
      console.error("Error uploading session state:", error);
      res.status(500).send("Failed to upload session state");
    }
  });

  return router;
}
