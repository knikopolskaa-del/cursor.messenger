import { test, expect } from "@playwright/test";
import { loginAsMaria, sendChatMessage } from "./helpers/ui";
import { CHANNELS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test("TC-SAV-001: сохранить сообщение из канала", async ({ page }) => {
  const body = `E2E saved ${Date.now()}`;
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await sendChatMessage(page, body);
  const row = page.locator("[data-message-id].group").filter({ hasText: body }).last();
  await row.getByTestId("save-message").click();
  await expect(row.getByText("Сохранено")).toBeVisible();
});

test("TC-SAV-002: список сохранённого", async ({ page }) => {
  const body = `E2E saved list ${Date.now()}`;
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await sendChatMessage(page, body);
  await page.locator("[data-message-id].group").filter({ hasText: body }).last().getByTestId("save-message").click();
  await page.getByRole("link", { name: "Сохранённое" }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
});

test("TC-SAV-003: переход из сохранённого в чат", async ({ page }) => {
  const body = `E2E saved nav ${Date.now()}`;
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await sendChatMessage(page, body);
  await page.locator("[data-message-id].group").filter({ hasText: body }).last().getByTestId("save-message").click();
  await page.getByRole("link", { name: "Сохранённое" }).click();
  await page.locator("[data-saved-id]").filter({ hasText: body }).locator("button").first().click();
  await expect(page).toHaveURL(new RegExp(`/app/c/${CHANNELS.general.id}`));
});

test("TC-SAV-004: удалить из сохранённого", async ({ page }) => {
  const body = `E2E для удаления ${Date.now()}`;
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await sendChatMessage(page, body);
  const row = page.locator("[data-message-id].group").filter({ hasText: body }).last();
  await row.getByTestId("save-message").click();
  await page.getByRole("link", { name: "Сохранённое" }).click();
  const savedRow = page.locator("[data-saved-id]").filter({ hasText: body });
  await savedRow.getByRole("button", { name: "Удалить" }).click();
  await expect(savedRow).toHaveCount(0);
});

test("TC-SAV-005: пустое сохранённое", async ({ page }) => {
  await page.goto("/app/saved");
  const empty = page.getByText("Пока ничего не сохранено");
  const items = page.locator("[data-saved-id]");
  await expect(empty.or(items.first())).toBeVisible();
});

test("TC-MEN-001: загрузка списка упоминаний (seed)", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto("/app/mentions");
  await expect(page.getByText("Загрузка...")).toBeHidden({ timeout: 10000 });
  const hasItems = (await page.getByText("Упоминание").count()) > 0;
  const empty = await page.getByText("Нет активности").isVisible();
  expect(hasItems || empty).toBeTruthy();
});

test("TC-MEN-002: empty state упоминаний", async ({ page }) => {
  await page.goto("/app/mentions");
  await expect(page.getByText("Нет активности").or(page.getByText("Упоминание"))).toBeVisible({
    timeout: 10000,
  });
});

test("TC-MEN-003: «Открыть» из упоминания", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto("/app/mentions");
  const openBtn = page.getByRole("link", { name: "Открыть" }).first();
  if ((await openBtn.count()) === 0) test.skip(true, "Нет seed-упоминаний");
  await openBtn.click();
  await expect(page).toHaveURL(/\/app\/(c|g|d)\//);
});

test("TC-MEN-004: ошибка загрузки activities", async ({ page }) => {
  await page.route("**/activities**", (route) => route.fulfill({ status: 500, body: "fail" }));
  await page.goto("/app/mentions");
  await expect(page.getByText(/fail|ошибка|500/i).first()).toBeVisible({ timeout: 10000 });
  await page.unroute("**/activities**");
});
