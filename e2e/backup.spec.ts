import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers";

test("only the admin can download a backup, and it contains everything", async ({ page, request }) => {
  const anon = await request.get("/admin/export", { maxRedirects: 0 });
  expect([307, 401]).toContain(anon.status());

  await signInAsAdmin(page);
  await page.goto("/admin/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download a backup" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^satchel-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  expect(data.format).toBe("satchel-backup-1");
  for (const t of ["articles", "photos", "films", "journal_entries", "messages", "site_settings"]) expect(Array.isArray(data[t])).toBe(true);
  expect(data.articles.length).toBeGreaterThan(0);
});

test("the keep-alive endpoint refuses callers without the cron secret", async ({ request }) => {
  expect((await request.get("/api/keepalive")).status()).toBe(401);
  expect((await request.get("/api/keepalive", { headers: { Authorization: "Bearer wrong" } })).status()).toBe(401);
});
