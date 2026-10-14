// Takes full-page screenshots for visual review: node scripts/shot.mjs <path> <outfile> [width] [theme]
import { chromium } from "@playwright/test";

const [, , path = "/", out = "shot.png", width = "1440", theme = "light"] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/google/chrome/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(width) < 600 ? 844 : 900 },
  colorScheme: theme === "dark" ? "dark" : "light",
  deviceScaleFactor: 1,
});
await page.goto(`${process.env.BASE_URL || "http://localhost:3000"}${path}`, { waitUntil: "load" });
// Scroll through the page so lazy-loaded images load before the capture.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: process.env.FULL !== "0" });
await browser.close();
console.log("saved", out);
