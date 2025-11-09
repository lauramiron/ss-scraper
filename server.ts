import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { netflixRouter } from "./services/netflix/routes.js";
import { primeRouter } from "./services/prime/routes.js";
import { hboRouter } from "./services/hbo/routes.js";
import { appleRouter } from "./services/apple/routes.js";
import { selectResumeData } from "./db/dbQuery.js";

const app = express();
app.use(express.json());


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
  const services = ["netflix", "hbo", "hulu", "disney", "apple", "prime", "paramount"];

  // TODO: Implement data fetching for each service
  const serviceStatuses = services.map(service => ({
    name: service,
    hasCredentials: null, // TODO: check if credentials exist
    hasSessionState: null, // TODO: check if session state exists
    lastLogin: null, // TODO: get last successful login timestamp
    lastScrape: null // TODO: get last successful scrape timestamp
  }));

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Streaming Service Scrape Statuses</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        h1 {
          text-align: center;
          margin-bottom: 40px;
          color: #333;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .service-box {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .service-title {
          font-size: 20px;
          font-weight: bold;
          text-transform: capitalize;
          margin-bottom: 15px;
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
        }
        .status-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #ecf0f1;
        }
        .status-row:last-child {
          border-bottom: none;
        }
        .status-label {
          font-weight: 500;
          color: #555;
        }
        .status-value {
          color: #777;
          font-style: italic;
        }
        .status-true {
          color: #27ae60;
          font-weight: bold;
        }
        .status-false {
          color: #e74c3c;
          font-weight: bold;
        }
        .status-null {
          color: #95a5a6;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Streaming Service Scrape Statuses</h1>
        <div class="services-grid">
          ${serviceStatuses.map(service => `
            <div class="service-box">
              <div class="service-title">${service.name}</div>
              <div class="status-row">
                <span class="status-label">Login Credentials:</span>
                <span class="status-value status-null">${service.hasCredentials ?? 'N/A'}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Session State:</span>
                <span class="status-value status-null">${service.hasSessionState ?? 'N/A'}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Last Login:</span>
                <span class="status-value status-null">${service.lastLogin ?? 'N/A'}</span>
              </div>
              <div class="status-row">
                <span class="status-label">Last Scrape:</span>
                <span class="status-value status-null">${service.lastScrape ?? 'N/A'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
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

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));
