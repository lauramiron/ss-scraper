import { chromium } from "playwright";
// util: scroll to trigger lazy rails
export async function lazyScroll(page, steps = 6, px = 900) {
    for (let i = 0; i < steps; i++) {
        await page.evaluate(y => window.scrollBy(0, y), px);
        await page.waitForTimeout(350);
    }
}
export async function newChromiumBrowserFromSavedState(state) {
    debugger;
    const chromiumOptions = (process.env.ENV == "debug") ? { headless: false, slowMo: 100 } : { headless: true };
    const browser = await chromium.launch(chromiumOptions);
    //   const state = await loadSessionState(service);
    const context = await browser.newContext({ storageState: state || undefined });
    const page = await context.newPage();
    return { context, page };
}
