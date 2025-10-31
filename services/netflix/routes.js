import express from "express";
import { scrapeNetflixContinueWatching } from "./scraper.js";
import { getCredentials, saveCredentials } from "./auth.js";

export const netflixRouter = express.Router();

netflixRouter.get("/resume", async (req, res) => {
  try {
    const data = await scrapeNetflixContinueWatching();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Scrape failed");
  }
});

// Serve a simple HTML form to enter credentials manually
netflixRouter.get("/login", async (_req, res) => {
  const creds = await getCredentials();
  res.send(`
    <html><body>
      <h2>Netflix Login</h2>
      <form method="POST" action="/netflix/login">
        <label>Email: <input name="email" value="${creds?.
// @ts-ignore
        email || ""}" /></label><br/>
        <label>Password: <input name="password" type="password" /></label><br/>
        <button type="submit">Save</button>
      </form>
    </body></html>
  `);
});

netflixRouter.post("/login", express.urlencoded({ extended: true }), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");
  await saveCredentials(email, password);
  res.send("Credentials saved. The next scrape will log in automatically.");
});
