import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => sessionStorage.setItem("gaia-loading-done", "1"));
await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(1500);

const shot = (name) => page.screenshot({ path: `/tmp/shots/${name}.png` });
const scrollTo = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1200);
};

await shot("01-hero");
await scrollTo(450);
await shot("02-hero-mid-transition");
await scrollTo(900);
await shot("03-grid-landed");
await scrollTo(1400);
await shot("04-grid-full");
const bene = await page.evaluate(() => document.querySelector("#beneficios").offsetTop);
await scrollTo(bene - 100);
await shot("05-benefits-top");
await scrollTo(bene + 800);
await shot("06-benefits-cards");
const depo = await page.evaluate(() => document.querySelector("#depoimentos").offsetTop);
await scrollTo(depo);
await shot("07-testimonials");
const faq = await page.evaluate(() => document.querySelector("#faq").offsetTop);
await scrollTo(faq);
await shot("08-faq");
await page.click("text=O que é a Gaia?");
await page.waitForTimeout(400);
await shot("09-faq-typing");
await page.waitForTimeout(900);
await shot("10-faq-answer");

// Loading screen (fresh session)
const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page2.goto("http://localhost:3000");
await page2.waitForTimeout(1500);
await page2.screenshot({ path: "/tmp/shots/00-loading.png" });

// Mobile hero
const page3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page3.addInitScript(() => sessionStorage.setItem("gaia-loading-done", "1"));
await page3.goto("http://localhost:3000", { waitUntil: "load", timeout: 120000 });
await page3.waitForTimeout(1500);
await page3.screenshot({ path: "/tmp/shots/11-mobile-hero.png" });
await page3.evaluate(() => window.scrollTo(0, 1200));
await page3.waitForTimeout(1000);
await page3.screenshot({ path: "/tmp/shots/12-mobile-grid.png" });

await browser.close();
console.log("done");
