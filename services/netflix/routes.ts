import express, { Request, Response } from "express";
import { getCredentials, runScrape, saveCredentials } from "../../utils/utils.js";
import { formatRawContinueWatchingData, extractContinueWatching } from "./scraper.js";
import { ensureLoggedIn } from "./auth.js";
import { createStreamingServiceRouter } from "../../routes.js";

const browseUrl = "https://www.netflix.com/browse"

// Create router using factory with Netflix-specific functions
export const netflixRouter = createStreamingServiceRouter({
  service: "netflix",
  browseUrl: browseUrl,
  runScrape: () => runScrape({
    service: "netflix",
    browseUrl,
    ensureLoggedIn,
    extractContinueWatching
  }),
  formatRawContinueWatchingData,
});

// Serve a simple HTML form to enter credentials manually
netflixRouter.get("/login", async (_req: Request, res: Response) => {
  const creds = await getCredentials("netflix");
  res.send(`
    <html><body>
      <h2>Netflix Login</h2>
      <form method="POST" action="/netflix/login">
        <label>Email: <input name="email" value="${creds?.email || ""}" /></label><br/>
        <label>Password: <input name="password" type="password" /></label><br/>
        <button type="submit">Save</button>
      </form>
    </body></html>
  `);
});

netflixRouter.post("/login", express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");
  await saveCredentials(email, password, "netflix");
  res.send("Credentials saved. The next scrape will log in automatically.");
});
