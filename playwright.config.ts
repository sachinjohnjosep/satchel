import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. They expect the site on :3000 backed by a database with the
// e2e admin user; see TESTING.md (scripts/e2e-env.sh + scripts/e2e-services.sh).
export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROME_PATH || !process.env.CI ? { executablePath: process.env.CHROME_PATH ?? "/opt/google/chrome/chrome" } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
