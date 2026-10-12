import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("main navigation reaches every section", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [label, heading] of [
      ["Writing", "Writing"],
      ["Photography", "Photography"],
      ["Sachinema", "Sachinema"],
      ["Journal", "Journal"],
      ["About", "About"],
    ]) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
    await nav.getByRole("link", { name: "Leave a note" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Leave a note" })).toBeVisible();
  });

  test("every page has a unique title, a description and a canonical URL", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of ["/", "/writing", "/writing/on-paying-attention", "/photography", "/photography/frame-01", "/cinema", "/cinema/paris-texas", "/journal", "/about", "/note"]) {
      await page.goto(path);
      const title = await page.title();
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http/);
    }
  });

  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("/writing/on-paying-attention");
    expect(xml).toContain("/cinema/paris-texas");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*/i);
  });

  test("missing pages return a real 404", async ({ request, page }) => {
    expect((await request.get("/writing/does-not-exist")).status()).toBe(404);
    expect((await request.get("/cinema/does-not-exist")).status()).toBe(404);
    await page.goto("/nowhere");
    await expect(page.getByRole("heading", { name: "This page has wandered off." })).toBeVisible();
  });

  test("article pages have reading time, tags, related pieces and structured data", async ({ page }) => {
    await page.goto("/writing/on-paying-attention");
    await expect(page.getByText(/\d+ min read/).first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Tags" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Read next" })).toBeVisible();
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(ld["@type"]).toBe("Article");
  });

  test("writing can be filtered by category", async ({ page }) => {
    await page.goto("/writing");
    await page.getByRole("navigation", { name: "Filter by category" }).getByRole("link", { name: "Poetry" }).click();
    await expect(page).toHaveURL(/category=Poetry/);
    await expect(page.getByRole("link", { name: "Sample poem" })).toBeVisible();
    await expect(page.getByRole("link", { name: "On paying attention" })).toHaveCount(0);
  });

  test("films can be filtered by genre and rating", async ({ page }) => {
    await page.goto("/cinema");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Genre").selectOption("Comedy");
    await expect(page).toHaveURL(/genre=Comedy/);
    await expect(page.getByRole("heading", { name: "1 film" })).toBeVisible();
    await page.getByLabel("Rating").selectOption("5");
    await expect(page.getByText("No films match these filters.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.getByRole("heading", { name: "Every film" })).toBeVisible();
  });

  test("the lightbox works with the keyboard", async ({ page }) => {
    await page.goto("/photography");
    await page.waitForLoadState("networkidle");
    const first = page.getByRole("link", { name: /Platform, early light/ });
    await first.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Platform, early light");
    await page.keyboard.press("ArrowRight");
    await expect(dialog).not.toContainText("Platform, early light");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("search finds content across sections", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("searchbox").fill("wenders");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: "Paris, Texas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Perfect Days" })).toBeVisible();
  });

  test("dark mode can be switched and is remembered", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("sample content is clearly marked", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sample", { exact: true }).first()).toBeVisible();
  });
});
