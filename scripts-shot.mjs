import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => sessionStorage.setItem("gaia-loading-done", "1"));
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

for (const y of [0, 225, 450, 675, 900, 1100]) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/gaia-v2-${y}.png` });
  console.log(`shot ${y}`);
}
await browser.close();
