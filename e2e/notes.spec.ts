import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { signInAsAdmin } from "./helpers";

const send = async (page: import("@playwright/test").Page, text: string) => {
  // Wait for the form to be interactive before typing (hydration).
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Your note" }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
};

test.describe("leave a note", () => {
  test("the form is simple, explains privacy, and never sends the sample text", async ({ page }) => {
    await page.goto("/note");
    await expect(page.getByRole("heading", { name: "Leave a note" })).toBeVisible();
    await expect(page.getByText("A little space for something you want to say.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What happens to your note" })).toBeVisible();
    // No name or email fields.
    await expect(page.getByLabel(/name|email/i)).toHaveCount(0);
    // Development builds start with the sample value; it is never sent as a real note.
    await expect(page.getByRole("textbox", { name: "Your note" })).toHaveValue("gcng");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("That is the sample text used for previews")).toBeVisible();
  });

  test("empty and over-long notes are refused with clear messages", async ({ page }) => {
    await page.goto("/note");
    await send(page, "   ");
    await expect(page.getByText("Write something before sending.")).toBeVisible();
    await page.getByRole("textbox", { name: "Your note" }).fill("x".repeat(2001));
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
    await expect(page.getByText("2001 / 2000")).toBeVisible();
  });

  test("a note arrives privately, renders as text, and can be read, archived and deleted", async ({ page, browser }) => {
    const text = `E2E hello <script>window.__pwned = true</script> <img src=x onerror="window.__pwned=true"> ${Date.now()}`;
    await page.goto("/note");
    await send(page, text);
    await expect(page.getByText("Thank you. Your note is on its way.")).toBeVisible();

    // Not visible anywhere public.
    for (const path of ["/", "/journal", "/note"]) {
      await page.goto(path);
      await expect(page.getByText("E2E hello")).toHaveCount(0);
    }
    await page.goto(`/search?q=${encodeURIComponent("E2E hello")}`);
    await expect(page.getByText(/Nothing found for/)).toBeVisible();

    const admin = await browser.newPage();
    await signInAsAdmin(admin);
    await expect(admin.getByRole("link", { name: /Notes.*1 unread/ })).toBeVisible();
    await admin.goto("/admin/notes");
    const card = admin.getByRole("article", { name: "Unread note" }).filter({ hasText: "E2E hello" });
    await expect(card).toBeVisible();
    // Shown literally; nothing executed.
    await expect(card).toContainText("<script>window.__pwned = true</script>");
    expect(await admin.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();

    await card.getByRole("button", { name: "Mark as read" }).click();
    await expect(admin.getByRole("article", { name: "Note" }).filter({ hasText: "E2E hello" })).toBeVisible();
    await admin.getByRole("article").filter({ hasText: "E2E hello" }).getByRole("button", { name: "Archive" }).click();
    await expect(admin.getByText("E2E hello")).toHaveCount(0);
    await admin.goto("/admin/notes?view=archived");
    const archived = admin.getByRole("article").filter({ hasText: "E2E hello" });
    await archived.getByRole("button", { name: "Delete" }).click();
    await archived.getByRole("button", { name: "Yes, delete" }).click();
    await expect(admin.getByText("E2E hello")).toHaveCount(0);
    await admin.close();
  });

  test("rate limiting stops a burst of notes", async ({ page }) => {
    // The earlier test already sent one; the limit is 5 per 10 minutes.
    let limited = false;
    for (let i = 0; i < 6 && !limited; i++) {
      await page.goto("/note");
      await send(page, `E2E burst ${i}`);
      const result = page.getByText(/Thank you|Too many notes/);
      await expect(result).toBeVisible();
      limited = (await result.textContent())!.includes("Too many notes");
    }
    expect(limited).toBe(true);
  });

  test("the honeypot field rejects bots", async ({ page }) => {
    await page.goto("/note");
    await page.locator('input[name="website"]').fill("http://spam.example", { force: true });
    await send(page, "E2E bot");
    await expect(page.getByText("This note could not be sent")).toBeVisible();
  });
});

test.describe("database permissions through the public API", () => {
  // Uses the same publishable key the browser has.
  const env = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  const api = env.NEXT_PUBLIC_SUPABASE_URL;
  const headers = { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" };

  test("visitors cannot read or write notes directly", async ({ request }) => {
    const read = await request.get(`${api}/rest/v1/messages?select=*`, { headers });
    expect(read.status()).toBe(401);
    const write = await request.post(`${api}/rest/v1/messages`, { headers, data: { body: "direct" } });
    expect(write.status()).toBe(401);
  });

  test("visitors cannot see drafts, private settings, or edit content", async ({ request }) => {
    const drafts = await request.get(`${api}/rest/v1/articles?select=slug&status=eq.draft`, { headers });
    expect(await drafts.json()).toEqual([]);
    const priv = await request.get(`${api}/rest/v1/private_settings?select=*`, { headers });
    expect(priv.status()).toBe(401);
    const edit = await request.patch(`${api}/rest/v1/articles?slug=eq.on-paying-attention`, { headers, data: { title: "hacked" } });
    expect(edit.status()).toBe(401);
    const upload = await request.post(`${api}/storage/v1/object/media/hack.jpg`, { headers: { ...headers, "Content-Type": "image/jpeg" }, data: Buffer.from("x") });
    expect(upload.status()).toBe(403);
  });
});
