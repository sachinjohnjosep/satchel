import { expect, test } from "@playwright/test";
import path from "node:path";
import { ADMIN, signIn, signInAsAdmin, VISITOR } from "./helpers";

test.describe("dashboard access", () => {
  test("signed-out visitors are sent to the login page", async ({ page }) => {
    await page.goto("/admin/writing");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a wrong password shows a clear error", async ({ page }) => {
    await signIn(page, { email: ADMIN.email, password: "nope" });
    await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
  });

  test("a signed-in account that is not an admin cannot reach the dashboard", async ({ page }) => {
    await signIn(page, VISITOR);
    await expect(page.getByText("is not an admin of this site")).toBeVisible();
    await page.goto("/admin/notes");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText("is not an admin of this site")).toBeVisible();
  });
});

test.describe("publishing", () => {
  test.beforeEach(async ({ page }) => signInAsAdmin(page));

  test("draft → publish → edit → unpublish → schedule → delete", async ({ page, browser }) => {
    const title = `E2E essay ${Date.now()}`;
    const visitor = await browser.newPage();

    await page.goto("/admin/writing/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Text" }).click();
    await page.keyboard.type("A first paragraph written in the end-to-end test.");
    await page.getByLabel("Category").fill("Essay");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/writing\/[0-9a-f-]{36}\?saved=1/);
    await expect(page.getByText("Draft. Only you can see it.")).toBeVisible();
    const editUrl = page.url().split("?")[0];
    const slug = await page.getByLabel("Web address").inputValue();
    expect(slug).toMatch(/^e2e-essay-\d+$/);

    // Drafts are private.
    expect((await visitor.goto(`/writing/${slug}`))!.status()).toBe(404);
    // ...but the admin can preview them.
    await page.goto(editUrl.replace("/admin/writing/", "/admin/preview/writing/"));
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Not visible to visitors.")).toBeVisible();

    // Publish.
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published." })).toBeVisible();
    await visitor.goto(`/writing/${slug}`);
    await expect(visitor.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(visitor.getByText("A first paragraph written")).toBeVisible();
    // It shows up in the list and on the home page.
    await visitor.goto("/writing");
    await expect(visitor.getByRole("link", { name: title })).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.getByText(title).first()).toBeVisible();

    // Edit.
    await page.reload();
    await page.getByLabel("Title", { exact: true }).fill(`${title} (revised)`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toBeVisible();
    await visitor.goto(`/writing/${slug}`);
    await expect(visitor.getByRole("heading", { level: 1, name: `${title} (revised)` })).toBeVisible();

    // Unpublish.
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Unpublished." })).toBeVisible();
    expect((await visitor.goto(`/writing/${slug}`))!.status()).toBe(404);

    // Schedule for tomorrow: published, but not visible yet.
    await page.reload();
    const tomorrow = new Date(Date.now() + 86_400_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page
      .getByLabel("Publish date")
      .fill(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published." })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Scheduled. Goes live at the date below.")).toBeVisible();
    expect((await visitor.goto(`/writing/${slug}`))!.status()).toBe(404);

    // Delete (two steps, no browser dialog).
    await page.getByRole("button", { name: "Delete piece" }).click();
    await page.getByRole("button", { name: "Yes, delete piece" }).click();
    await expect(page).toHaveURL(/\/admin\/writing\?deleted=1/);
    await expect(page.getByText(title)).toHaveCount(0);
    await visitor.close();
  });

  test("validation errors keep what you typed", async ({ page }) => {
    await page.goto("/admin/writing/new");
    await page.getByLabel("Subtitle").fill("A subtitle that must survive");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Some fields need attention" })).toBeVisible();
    await expect(page.getByText("A title is required.")).toBeVisible();
    await expect(page.getByLabel("Subtitle")).toHaveValue("A subtitle that must survive");
  });

  test("duplicate web addresses are explained, not crashed", async ({ page }) => {
    await page.goto("/admin/writing/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E duplicate");
    await page.getByText("Web address and sharing").click();
    await page.getByLabel("Web address").fill("on-paying-attention");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Another item already uses this web address")).toBeVisible();
  });

  test("upload a photograph and publish it to the gallery", async ({ page, browser }) => {
    const title = `E2E photo ${Date.now()}`;
    await page.goto("/admin/photos/new");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, "fixtures", "frame.jpg"));
    await expect(page.getByText("Uploading…")).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText("Replace image")).toBeVisible();
    await expect(page.locator('input[name="image_path"]')).toHaveValue(/^photos\/\d{4}\/\d{2}\/[0-9a-f-]+\.jpg$/);
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Describe the photograph").fill("A test frame");
    await page.getByLabel("Category").fill("Street");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/photos\/[0-9a-f-]{36}/);

    const visitor = await browser.newPage();
    await visitor.goto("/photography");
    const thumb = visitor.getByRole("link", { name: new RegExp(title) });
    await expect(thumb).toBeVisible();
    // The uploaded file is served and is a real image.
    const src = await thumb.locator("img").getAttribute("src");
    const res = await visitor.request.get(src!.startsWith("http") ? src! : new URL(src!, visitor.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/image\/jpeg/);
    // The lightbox opens, and Escape closes it.
    await thumb.click();
    await expect(visitor.getByRole("dialog")).toBeVisible();
    await visitor.keyboard.press("Escape");
    await expect(visitor.getByRole("dialog")).toBeHidden();
    await visitor.close();
  });

  test("files that are not images are refused before upload", async ({ page }) => {
    await page.goto("/admin/photos/new");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("alert").filter({ hasText: "Use a JPEG, PNG, WebP or AVIF image" })).toBeVisible();
  });

  test("settings change the public site", async ({ page, browser }) => {
    await page.goto("/admin/settings");
    const headline = page.getByLabel("Home page headline");
    const before = await headline.inputValue();
    const next = `E2E headline ${Date.now()}`;
    await headline.fill(next);
    await page.getByLabel("Accent colour").selectOption("olive");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();

    const visitor = await browser.newPage();
    await visitor.goto("/");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(next);
    await expect(visitor.locator("html")).toHaveAttribute("data-accent", "olive");
    await visitor.close();

    await headline.fill(before);
    await page.getByLabel("Accent colour").selectOption("oxblood");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
  });
});
