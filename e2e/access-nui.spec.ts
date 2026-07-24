import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsGuest, loginViaApi } from "./helpers/ui";
import { CHANNELS, USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test("TC-ACL-001: guest — список каналов ограничен", async ({ page, request }) => {
  if (!(await loginAsGuest(page, request))) test.skip(true, "Guest недоступен");
  await expect(page.getByRole("link", { name: /#общий/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /#дизайн/ })).toHaveCount(0);
});

test("TC-ACL-002: guest — приватный канал без membership", async ({ page, request }) => {
  if (!(await loginAsGuest(page, request))) test.skip(true, "Guest недоступен");
  await page.goto(`/app/c/${CHANNELS.design.id}`);
  await expect(page.getByText(/Conversation not found|не найден|403|ошибка/i).first()).toBeVisible({
    timeout: 10000,
  });
});

test("TC-ACL-003: employee создаёт канал и группу", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto("/app/new/channel");
  const slug = `acl-ch-${Date.now()}`;
  await page.getByPlaceholder("komanda-ux").fill(slug);
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/app\/c\//);
  await page.goto("/app/new/group");
  await page.getByPlaceholder("Команда запуска").fill(`ACL grp ${Date.now()}`);
  await page.locator("button").filter({ hasText: USERS.ivan.name }).first().click();
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/app\/g\//);
});

test("TC-ACL-004: admin — upload icon на чужом канале", async ({ page, request }) => {
  if (!(await loginAsAdmin(page, request))) test.skip(true, "Admin недоступен");
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await expect(page.getByLabel("Загрузить иконку")).toBeVisible();
});

test("TC-ACL-005: роли в UI", async ({ page, request }) => {
  await loginViaApi(page, request);
  await expect(page.getByText("Сотрудник").first()).toBeVisible();
  if (!(await loginAsGuest(page, request))) test.skip(true, "Guest недоступен");
  await expect(page.getByText("Гость").first()).toBeVisible();
  if (!(await loginAsAdmin(page, request))) test.skip(true, "Admin недоступен");
  await expect(page.getByText("Администратор").first()).toBeVisible();
});

test("TC-NUI-001: нет кнопки редактирования сообщения", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await expect(page.getByRole("button", { name: /редактир/i })).toHaveCount(0);
});

test("TC-NUI-002: нет кнопки удаления сообщения", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await expect(page.getByRole("button", { name: /удалить сообщение/i })).toHaveCount(0);
});

test("TC-NUI-003: реакции только read-only", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/c/${CHANNELS.general.id}`);
  await expect(page.getByText("👍").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /реакц/i })).toHaveCount(0);
});

test("TC-NUI-007: /app/directory nav disabled", async ({ page, request }) => {
  await loginViaApi(page, request);
  await expect(page.getByText("Сотрудники")).toBeVisible();
  await expect(page.getByRole("link", { name: "Сотрудники" })).toHaveCount(0);
});

test("TC-NUI-008: settings notifications не persist", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto("/app/settings");
  const box = page.getByLabel("Треды");
  await box.click();
  await page.reload();
  await expect(box).not.toBeChecked();
});
