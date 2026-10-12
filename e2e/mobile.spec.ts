import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers";

// Runs in the "mobile" project (Pixel 7 viewport and touch).

test("mobile menu opens, navigates, and closes", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const menu = page.locator('button[aria-controls="mobile-menu"]');
  await expect(menu).toHaveText("Menu");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toHaveText("Close");
  await page.locator("#mobile-menu").getByRole("link", { name: "Journal" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("no page scrolls sideways on a phone", async ({ page }) => {
  for (const path of ["/", "/writing/on-paying-attention", "/photography", "/cinema", "/cinema/lists/quiet-films", "/journal", "/about", "/note"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("the dashboard works on a phone: write and publish a journal entry", async ({ page, browser }) => {
  await signInAsAdmin(page);
  for (const path of ["/admin", "/admin/writing/new", "/admin/photos/new", "/admin/settings", "/admin/notes"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
  const text = `E2E from my phone ${Date.now()}`;
  await page.goto("/admin/journal/new");
  await page.getByLabel("Entry").fill(text);
  // The action bar is pinned to the bottom of the screen.
  const publish = page.getByRole("button", { name: "Publish" });
  await page.waitForLoadState("networkidle");
  const box = (await publish.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.y).toBeGreaterThan(vp.height / 2);
  await publish.click();
  await expect(page).toHaveURL(/\/admin\/journal\/[0-9a-f-]{36}/);

  const visitor = await browser.newPage();
  await visitor.goto("/journal");
  await expect(visitor.getByText(text)).toBeVisible();
  await visitor.goto("/");
  await expect(visitor.getByText(text)).toBeVisible();
  await visitor.close();
});
