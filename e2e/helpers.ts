import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@example.test", password: process.env.E2E_ADMIN_PASSWORD ?? "correct horse battery" };
export const VISITOR = { email: "visitor@example.test", password: ADMIN.password };

export async function signIn(page: Page, who = ADMIN) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signInAsAdmin(page: Page) {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}
