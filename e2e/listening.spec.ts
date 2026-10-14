import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers";

test.describe("Listening", () => {
  test("index, filters, entry and playlist pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Listening" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Listening" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "On repeat" })).toBeVisible();

    await page.getByRole("navigation", { name: "Filter by kind" }).getByRole("link", { name: "Songs" }).click();
    await expect(page.getByRole("heading", { name: "1 record" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Pink \+ White/ }).first()).toBeVisible();

    await page.goto("/listening/kid-a");
    await expect(page.getByRole("heading", { level: 1, name: "Kid A" })).toBeVisible();
    await expect(page.getByText("Radiohead, 2000")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Played alongside" })).toBeVisible();

    await page.goto("/listening/playlists/late-trains");
    await expect(page.getByRole("heading", { level: 1, name: /Late trains/ })).toBeVisible();
    await expect(page.locator("ol > li")).toHaveCount(3);

    expect((await page.request.get("/listening/does-not-exist")).status()).toBe(404);
  });

  test("home page shows what's on repeat; search and sitemap include records", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "On repeat" })).toBeVisible();
    await page.goto("/search?q=miles");
    await expect(page.getByRole("link", { name: "Kind of Blue" })).toBeVisible();
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/listening/kid-a");
  });

  test("add a record with a Spotify link; the player loads only after pressing Play", async ({ page, browser }) => {
    const title = `E2E record ${Date.now()}`;
    await signInAsAdmin(page);
    await page.goto("/admin/listening/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Artist").fill("Test Artist");
    await page.getByLabel("Year").fill("2024");
    await page.getByLabel("Listening link").fill("https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX?si=x");
    await page.getByLabel("Genres").fill("Jazz");
    await page.getByLabel("On repeat").check();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/listening\/[0-9a-f-]{36}/);
    const slug = await page.getByLabel("Web address").inputValue();

    // A bad link is explained, not saved.
    await page.getByLabel("Listening link").fill("open.spotify.com/album/x");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Paste the full link, starting with https://")).toBeVisible();

    const visitor = await browser.newPage();
    await visitor.goto(`/listening/${slug}`);
    await expect(visitor.getByRole("heading", { level: 1, name: title })).toBeVisible();
    // Nothing from Spotify on the page until Play is pressed.
    await expect(visitor.locator("iframe")).toHaveCount(0);
    await visitor.waitForLoadState("load");
    await visitor.getByRole("button", { name: "Play on Spotify" }).click();
    await expect(visitor.locator('iframe[src="https://open.spotify.com/embed/album/1ATL5GLyefJaxhQzSPVrLX"]')).toHaveCount(1);
    await visitor.close();
  });

  test("build a playlist from records", async ({ page, browser }) => {
    const title = `E2E playlist ${Date.now()}`;
    await signInAsAdmin(page);
    await page.goto("/admin/playlists/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    const add = page.getByLabel("Record to add");
    await add.selectOption({ label: "Roja, A. R. Rahman" });
    await page.getByRole("button", { name: "Add to list" }).click();
    await add.selectOption({ label: "Blonde, Frank Ocean" });
    await page.getByRole("button", { name: "Add to list" }).click();
    await page.getByRole("button", { name: "Move Blonde up" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/playlists\/[0-9a-f-]{36}/);
    const slug = await page.getByLabel("Web address").inputValue();

    const visitor = await browser.newPage();
    await visitor.goto(`/listening/playlists/${slug}`);
    const rows = visitor.locator("ol > li");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Blonde");
    await expect(rows.nth(1)).toContainText("Roja");
    await visitor.close();
  });
});
