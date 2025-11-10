import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { netflixRouter } from "./services/netflix/routes.js";
import { primeRouter } from "./services/prime/routes.js";
import { hboRouter } from "./services/hbo/routes.js";
import { appleRouter } from "./services/apple/routes.js";
import { disneyRouter } from "./services/disney/routes.js";
import { selectResumeData, selectServiceStatuses } from "./db/dbQuery.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));


const ALLOWED_IPS = (process.env.ALLOWED_IPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req: Request, res: Response, next: NextFunction) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]).trim()
    : req.socket.remoteAddress;

  // For debugging; remove later if noisy
  console.log("REQ", req.method, req.path, "from", ip);

  // 1️⃣  Allow whitelisted IPs
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

// Homepage route
app.get("/", async (req: Request, res: Response) => {
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
app.get("/resume", async (req: Request, res: Response) => {
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

app.use("/netflix", netflixRouter);
app.use("/prime", primeRouter);
app.use("/hbo", hboRouter);
app.use("/apple", appleRouter);
app.use("/disney", disneyRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));
