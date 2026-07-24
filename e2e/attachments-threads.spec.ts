import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { loginViaApi, openChannel, sendChatMessage } from "./helpers/ui";
import { CHANNELS, MESSAGES } from "./helpers/seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}`);
});

test("TC-ATT-001: прикрепление через «+»", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(path.join(fixturesDir, "sample.txt"));
  await expect(page.getByText("sample.txt")).toBeVisible();
});

test("TC-ATT-002: несколько файлов", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles([
    path.join(fixturesDir, "sample.txt"),
    path.join(fixturesDir, "sample.png"),
  ]);
  await expect(page.getByText("sample.txt")).toBeVisible();
  await expect(page.getByText("sample.png")).toBeVisible();
});

test("TC-ATT-003: удаление файла до отправки", async ({ page }) => {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(path.join(fixturesDir, "sample.txt"));
  await page.getByLabel("Убрать вложение").click();
  await expect(page.getByText("sample.txt")).toHaveCount(0);
});

test("TC-ATT-004: ошибка upload", async ({ page }) => {
  await page.route("**/uploads", (route) => route.fulfill({ status: 500, body: "fail" }));
  await page.locator('input[type="file"]').first().setInputFiles(path.join(fixturesDir, "sample.txt"));
  await expect(page.locator('[title], .text-\\[color\\:var\\(--danger\\)\\]').filter({ hasText: /!/ }).first()).toBeVisible({
    timeout: 10000,
  });
  await page.unroute("**/uploads");
});

test("TC-ATT-009: сохранить сообщение с вложением", async ({ page }) => {
  const row = page.locator(`[data-message-id="${MESSAGES.pdf.id}"]`);
  const saveResponse = page.waitForResponse(
    (res) => res.request().method() === "POST" && /\/saved\/?$/.test(new URL(res.url()).pathname),
  );
  await row.getByTestId("save-message").click();
  expect((await saveResponse).status()).toBe(201);
  await expect(row.getByText("Сохранено")).toBeVisible();
});

test("TC-THR-001: открытие треда", async ({ page }) => {
  const msg = page.locator(`[data-message-id="${MESSAGES.welcome.id}"]`);
  if ((await msg.count()) === 0) test.skip(true, "Seed-сообщение m1 недоступно");
  await msg.getByRole("button", { name: "Тред" }).click();
  await expect(page).toHaveURL(new RegExp(`\\?thread=${MESSAGES.welcome.id}`));
  await expect(page.getByText("Тред", { exact: true })).toBeVisible();
});

test("TC-THR-002: исходное сообщение в треде", async ({ page }) => {
  if ((await page.locator(`[data-message-id="${MESSAGES.welcome.id}"]`).count()) === 0) {
    test.skip(true, "Seed m1 недоступно");
  }
  await page.goto(`/app/c/${CHANNELS.general.id}?thread=${MESSAGES.welcome.id}`);
  await expect(page.getByText("Исходное сообщение")).toBeVisible();
  await expect(page.getByText(MESSAGES.welcome.snippet)).toBeVisible();
});

test("TC-THR-003: пустые ответы или seed-reply", async ({ page }) => {
  if ((await page.locator(`[data-message-id="${MESSAGES.welcome.id}"]`).count()) === 0) {
    test.skip(true, "Seed m1 недоступно");
  }
  await page.goto(`/app/c/${CHANNELS.general.id}?thread=${MESSAGES.welcome.id}`);
  await expect(
    page
      .getByText("Пока нет ответов в треде.")
      .or(page.getByText(MESSAGES.reply.snippet)),
  ).toBeVisible();
});

test("TC-THR-004: отправка ответа в треде", async ({ page }) => {
  if ((await page.locator(`[data-message-id="${MESSAGES.welcome.id}"]`).count()) === 0) {
    test.skip(true, "Seed m1 недоступно");
  }
  await page.goto(`/app/c/${CHANNELS.general.id}?thread=${MESSAGES.welcome.id}`);
  const reply = `E2E thread ${Date.now()}`;
  await page.getByPlaceholder("Ответить в треде…").fill(reply);
  await page.getByLabel("Отправить").click();
  await expect(page.getByText(reply)).toBeVisible();
});

test("TC-THR-005: закрытие треда", async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}?thread=${MESSAGES.welcome.id}`);
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await expect(page).not.toHaveURL(/\?thread=/);
});

test("TC-THR-006: несуществующий thread id", async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}?thread=m_missing_xyz`);
  await expect(page.getByText("Сообщение не найдено.")).toBeVisible();
});

test("TC-THR-007: страница /app/threads", async ({ page }) => {
  await page.goto("/app/threads");
  await expect(page.getByText("Скоро")).toBeVisible();
});

test("TC-CHAN-007: ошибка отправки", async ({ page }) => {
  await page.route("**/conversations/channel/**/messages", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({ status: 500, body: "fail" });
      return;
    }
    route.continue();
  });
  await sendChatMessage(page, `fail ${Date.now()}`).catch(() => {});
  await expect(page.getByText(/fail|ошибка|500/i).first()).toBeVisible({ timeout: 10000 });
  await page.unroute("**/conversations/channel/**/messages");
});
