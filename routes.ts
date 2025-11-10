import express, { Request, Response, Router } from "express";
import { insertStreamingServiceData, ContinueWatchingData, insertSessionState, selectStreamingService, SessionState, selectResumeData, selectServiceStatuses } from "./db/dbQuery.js";
import { getCredentials, saveCredentials } from "./utils/utils.js";

interface StreamingServiceRouterConfig {
  service: string;
  browseUrl: string;
  runScrape: () => Promise<ContinueWatchingData>;
}

export function createStreamingServiceRouter(config: StreamingServiceRouterConfig): Router {
  const router = express.Router();

  router.get("/scrape", async (req: Request, res: Response) => {
    try {
      const formattedData = await config.runScrape();

      await insertStreamingServiceData(config.service, formattedData);

      res.json(formattedData);
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

// General router for homepage and data retrieval endpoints
const router = express.Router();

// Homepage route
router.get("/", async (req: Request, res: Response) => {
  const serviceStatuses = await selectServiceStatuses();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Streaming Service Scrape Statuses</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <div class="container">
        <h1>Streaming Service Scrape Statuses</h1>
        <div class="services-grid">
          ${serviceStatuses.map(service => `
            <div class="service-box">
              <div class="service-title">${service.service}</div>
              <div class="status-row">
                <span class="status-label">Login Credentials:</span>
                <span class="${service.has_credentials ? 'status-true' : 'status-false'}">${service.has_credentials ? '✓' : '✗'}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Session State:</span>
                <span class="${service.has_session_state ? 'status-true' : 'status-false'}">${service.has_session_state ? '✓' : '✗'}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Last Scrape:</span>
                <span class="status-value ${service.last_scrape ? '' : 'status-null'}">${service.last_scrape ? new Date(service.last_scrape).toLocaleString() : 'N/A'}</span>
              </div>
              <button class="scrape-button" onclick="scrapeService('${service.service}')">Scrape Now</button>
              <div id="${service.service}-results" class="scrape-results"></div>
            </div>
          `).join('')}
        </div>
      </div>
      <script src="/homepage.js"></script>
    </body>
    </html>
  `;

  res.send(html);
});

// Resume/Continue Watching data endpoint
router.get("/resume", async (req: Request, res: Response) => {
  try {
    const service = req.query.service as string | undefined;

    const data = await selectResumeData(service);

    if (!data) {
      return res.status(404).json({ error: `No resume data found${service ? ` for service: ${service}` : ''}` });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching resume data:", error);
    res.status(500).json({ error: "Failed to fetch resume data" });
  }
});

export { router as router };
