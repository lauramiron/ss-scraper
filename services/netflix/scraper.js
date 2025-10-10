import { ensureLoggedIn, saveSessionState } from "./auth.js";

export async function scrapeNetflixContinueWatching() {
  const context = await ensureLoggedIn();
  const page = await context.newPage();

  await page.goto("https://www.netflix.com/browse", { waitUntil: "networkidle" });

  const items = await page.$$eval('[data-uia="continue-watching"] a', (links) =>
    links.map((l) => ({
      title: l.textContent?.trim(),
      href: l.getAttribute("href"),
    }))
  );

  await saveSessionState(await context.storageState());
  await context.close();

  return items;
}
