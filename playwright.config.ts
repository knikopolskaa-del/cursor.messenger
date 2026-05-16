import { defineConfig, devices } from "@playwright/test";

/**
 * E2E против локального Vite (и API на VITE_API_URL / 127.0.0.1:8001).
 * Перед запуском: `npm run dev` и бэкенд (например `npm run api` из корня).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    locale: "ru-RU",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
