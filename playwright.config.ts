import { defineConfig, devices } from "@playwright/test";

/**
 * E2E против локального Vite (и API на VITE_API_URL / 127.0.0.1:8001).
 * Перед запуском: `npm run stack` и `npm run e2e:ensure-user`.
 * API-тесты (e2e/api-security.spec.ts): PW_API_BASE при необходимости.
 */
export default defineConfig({
  testDir: "./e2e",
  // Один воркер: все тесты делят одну SQLite (backend/messenger.db), параллельно возможны блокировки.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    locale: "ru-RU",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
