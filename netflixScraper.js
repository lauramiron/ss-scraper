import { chromium } from "playwright";
import fs from "fs";

const cookiesFile = "./cookies.json";

export async function scrapeNetflixContinueWatching() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // reuse cookies if they exist
  if (fs.existsSync(cookiesFile)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesFile, "utf8"));
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  await page.goto("https://www.netflix.com/browse", { waitUntil: "networkidle" });

  // TODO: you may need to select your profile manually once (store cookies after)
  const items = await page.$$eval('[data-uia="continue-watching"] a', (links) =>
    links.map((link) => ({
      title: link.textContent?.trim() || "",
      href: link.getAttribute("href"),
    }))
  );

  fs.writeFileSync(cookiesFile, JSON.stringify(await context.cookies(), null, 2));
  await browser.close();
  return items;
}
