import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { netflixRouter } from "./services/netflix/routes.js";
import { primeRouter } from "./services/prime/routes.js";
import { hboRouter } from "./services/hbo/routes.js";
import { appleRouter } from "./services/apple/routes.js";
import { selectResumeData, selectServiceStatuses } from "./db/dbQuery.js";

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
  const serviceStatuses = await selectServiceStatuses();

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
        }
        .status-true {
          color: #27ae60;
          font-weight: bold;
          font-size: 18px;
        }
        .status-false {
          color: #e74c3c;
          font-weight: bold;
          font-size: 18px;
        }
        .status-null {
          color: #95a5a6;
          font-style: italic;
        }
        .scrape-button {
          width: 100%;
          padding: 10px;
          margin-top: 15px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }
        .scrape-button:hover {
          background: #2980b9;
        }
        .scrape-button:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }
        .scrape-results {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          border: 1px solid #dee2e6;
          max-height: 400px;
          overflow-y: auto;
          display: none;
        }
        .scrape-results.visible {
          display: block;
        }
        .scrape-results.loading {
          text-align: center;
          color: #666;
        }
        .scrape-results.error {
          background: #fee;
          border-color: #fcc;
          color: #c33;
        }
        .scrape-results pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 12px;
          font-family: 'Monaco', 'Courier New', monospace;
        }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 10px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
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
      <script>
        async function scrapeService(service) {
          const button = event.target;
          const resultsDiv = document.getElementById(service + '-results');

          // Disable button and show loading
          button.disabled = true;
          resultsDiv.className = 'scrape-results visible loading';
          resultsDiv.innerHTML = '<div class="spinner"></div><p>Scraping ' + service + '... This may take 30-60 seconds.</p>';

          try {
            const response = await fetch('/' + service + '/resume', {
              method: 'GET'
            });

            if (!response.ok) {
              throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            const data = await response.json();

            // Display success results
            resultsDiv.className = 'scrape-results visible';
            resultsDiv.innerHTML = '<strong>Scrape successful!</strong><pre>' + JSON.stringify(data, null, 2) + '</pre>';

          } catch (error) {
            // Display error
            resultsDiv.className = 'scrape-results visible error';
            resultsDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
            button.disabled = false;
          }
        }
      </script>
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
