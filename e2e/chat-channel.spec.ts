import { test, expect } from "@playwright/test";
import { loginApi, postChannel, postMessage, deleteMessage } from "./helpers/api";
import {
  expectComposerVisible,
  loginViaApi,
  openChannel,
  sendChatMessage,
} from "./helpers/ui";
import { CHANNELS, MESSAGES, USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}`);
});

test("TC-CHAN-001: отображение ленты сообщений", async ({ page }) => {
  await expect(page.locator("[data-message-id]").first()).toBeVisible();
  await expect(page.getByText(MESSAGES.welcome.snippet)).toBeVisible();
});

test("TC-CHAN-002: отправка текстового сообщения", async ({ page }) => {
  const body = `E2E-сообщение ${Date.now()}`;
  await sendChatMessage(page, body);
});

test("TC-CHAN-003: Enter vs Shift+Enter", async ({ page }) => {
  const composer = page.getByPlaceholder("Написать сообщение…");
  await composer.fill("строка1");
  await composer.press("Shift+Enter");
  await composer.type("строка2");
  await expect(composer).toHaveValue(/строка1\nстрока2/);
  const body = `E2E multiline ${Date.now()}`;
  await composer.fill(body);
  await composer.press("Enter");
  await expect(page.locator("[data-message-id]").filter({ hasText: body })).toBeVisible();
});

test("TC-CHAN-004: пустой composer — кнопка неактивна", async ({ page }) => {
  const send = page.getByRole("button", { name: "Отправить" });
  await expect(send).toBeDisabled();
});

test("TC-CHAN-005: пустой канал — empty state", async ({ page, request }) => {
  const token = await loginApi(request, USERS.test.email, USERS.test.password);
  const slug = `empty-${Date.now()}`;
  const ch = await postChannel(request, token, slug);
  await page.goto(`/app/c/${ch.id}`);
  await expect(page.getByText("Сообщений пока нет")).toBeVisible();
  await expectComposerVisible(page);
});

test("TC-CHAN-006: ошибка загрузки сообщений", async ({ page }) => {
  await page.route("**/conversations/channel/**/messages**", (route) =>
    route.fulfill({ status: 500, body: "fail" }),
  );
  await page.reload();
  await expect(page.getByText(/ошибка|500|fail/i).first()).toBeVisible({ timeout: 10000 });
  await page.unroute("**/conversations/channel/**/messages**");
});

test("TC-CHAN-008: сообщение с badge «ответ»", async ({ page }) => {
  await expect(page.locator(`[data-message-id="${MESSAGES.reply.id}"]`).getByText("ответ")).toBeVisible();
});

test("TC-CHAN-009: отображение реакций (read-only)", async ({ page }) => {
  const row = page.locator(`[data-message-id="${MESSAGES.welcome.id}"]`);
  await expect(row.getByText("👍")).toBeVisible();
  await expect(row.getByRole("button", { name: /реакц/i })).toHaveCount(0);
});

test("TC-CHAN-010: удалённое сообщение", async ({ page, request }) => {
  const token = await loginApi(request, USERS.test.email, USERS.test.password);
  const msg = await postMessage(request, token, "channel", CHANNELS.general.id, {
    text: `E2E delete ${Date.now()}`,
  });
  await page.reload();
  await expect(page.locator(`[data-message-id="${msg.id}"]`)).toBeVisible();
  await deleteMessage(request, token, msg.id);
  await page.reload();
  await expect(page.locator(`[data-message-id="${msg.id}"]`).getByText("Сообщение удалено.")).toBeVisible();
});

test("TC-ATT-005: отображение PDF/файла в канале", async ({ page }) => {
  await expect(page.getByText(MESSAGES.pdf.fileName)).toBeVisible();
});

test("TC-ATT-006: отображение изображения в канале (file card)", async ({ page }) => {
  await expect(page.getByText("layout.png")).toBeVisible();
  await expect(page.locator(`[data-message-id="${MESSAGES.reply.id}"] img[src*="broken"]`)).toHaveCount(0);
});

test("TC-ATT-007: битое/недоступное изображение — file card", async ({ page }) => {
  await expect(page.getByText(/layout\.png|файл недоступен/i).first()).toBeVisible();
});
