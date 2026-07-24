/**
 * Smoke: быстрая проверка, что E2E-инфраструктура жива.
 * Полное покрытие — см. e2e/*.spec.ts и docs/TEST_CASES.md § «Карта автотестов».
 */
import { test, expect } from "@playwright/test";
import { sendChatMessage } from "./helpers/ui";
import { CHANNELS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test("smoke: login → channel → send message", async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await sendChatMessage(page, `Smoke ${Date.now()}`);
  await expect(page.getByPlaceholder("Написать сообщение…")).toBeVisible();
});
