import { test, expect } from "@playwright/test";
import {
  clearSidebarSearch,
  expectComposerVisible,
  loginViaApi,
  openChannel,
  sidebarSearch,
  toggleThemeInSidebar,
  getTheme,
} from "./helpers/ui";
import { CHANNELS, GROUPS, USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
});

test("TC-SHELL-001: структура сайдбара после входа", async ({ page }) => {
  await expect(page.getByText("Мессенджер", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Главная" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Сохранённое" })).toBeVisible();
  await expect(page.getByText(USERS.test.name, { exact: true }).first()).toBeVisible();
});

test("TC-SHELL-002: профиль в шапке → /app/me", async ({ page }) => {
  await page.getByRole("link", { name: USERS.test.name }).first().click();
  await expect(page).toHaveURL(/\/app\/me/);
});

test("TC-SHELL-003: переключение темы в сайдбаре", async ({ page }) => {
  const before = await getTheme(page);
  await toggleThemeInSidebar(page);
  await expect(await getTheme(page)).not.toBe(before);
});

test("TC-SHELL-004: навигация «Главная»", async ({ page }) => {
  await page.getByRole("link", { name: "Упоминания" }).click();
  await page.getByRole("link", { name: "Главная" }).click();
  await expect(page).toHaveURL(/\/app(\/c\/|$)/);
});

test("TC-SHELL-005: навигация «Треды» / «Упоминания» / «Сохранённое»", async ({ page }) => {
  await page.getByRole("link", { name: "Треды" }).click();
  await expect(page).toHaveURL(/\/app\/threads/);
  await page.getByRole("link", { name: "Упоминания" }).click();
  await expect(page).toHaveURL(/\/app\/mentions/);
  await page.getByRole("link", { name: "Сохранённое" }).click();
  await expect(page).toHaveURL(/\/app\/saved/);
});

test("TC-SHELL-006: «Сотрудники» disabled", async ({ page }) => {
  await expect(page.getByText("Сотрудники")).toBeVisible();
  await expect(page.getByRole("link", { name: "Сотрудники" })).toHaveCount(0);
});

test("TC-SHELL-007: список каналов — переход и бейдж «Приватный»", async ({ page }) => {
  const designLink = page.getByRole("link", { name: /#дизайн/ });
  if ((await designLink.count()) === 0) {
    test.skip(true, "У test-пользователя нет доступа к #дизайн");
  }
  await expect(page.getByText("Приватный").first()).toBeVisible();
  await designLink.click();
  await expect(page).toHaveURL(new RegExp(`/app/c/${CHANNELS.design.id}`));
});

test("TC-SHELL-008: иконки каналов/групп в сайдбаре", async ({ page }) => {
  await expect(page.locator("aside").getByRole("link", { name: /#общий/ }).locator("img, span").first()).toBeVisible();
  const groupLink = page.getByRole("link", { name: GROUPS.launch.title });
  if ((await groupLink.count()) > 0) {
    await expect(groupLink).toBeVisible();
  }
});

test("TC-SHELL-009: личные сообщения в сайдбаре", async ({ page }) => {
  await expect(page.getByText("Личные сообщения")).toBeVisible();
});

test("TC-SHELL-010: группы — счётчик участников", async ({ page }) => {
  const groupLink = page.getByRole("link", { name: GROUPS.launch.title });
  if ((await groupLink.count()) === 0) test.skip(true, "Seed-группа недоступна");
  await expect(groupLink.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible();
});

test("TC-SHELL-011: «+ Создать» открывает hub", async ({ page }) => {
  await page.getByRole("link", { name: "Создать", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/new/);
  await expect(page.getByText("# Канал")).toBeVisible();
});

test("TC-SHELL-012: быстрые «+» у секций", async ({ page }) => {
  await page.getByLabel("Создать канал").click();
  await expect(page).toHaveURL(/\/app\/new\/channel/);
  await page.getByRole("button", { name: "Закрыть" }).click();
  await page.getByLabel("Новое сообщение").click();
  await expect(page).toHaveURL(/\/app\/new\/dm/);
});

test("TC-SHELL-013: ошибка workspace", async ({ page }) => {
  await page.route("**/channels**", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "fail" }),
    });
  });
  await page.goto("/app");
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible({ timeout: 10000 });
  await page.unroute("**/channels**");
});

test("TC-SHELL-014: layout — composer всегда виден", async ({ page }) => {
  await openChannel(page, CHANNELS.general.id);
  await expectComposerVisible(page);
});

test("TC-SHELL-015: поиск скрывает обычное меню", async ({ page }) => {
  await sidebarSearch(page, "общ");
  await expect(page.getByText("Каналы")).toBeVisible();
  await expect(page.getByRole("link", { name: "Главная" })).toHaveCount(0);
  await clearSidebarSearch(page);
  await expect(page.getByRole("link", { name: "Главная" })).toBeVisible();
});

test("TC-ROUTE-002: /app с каналами → первый канал", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/c\//);
});

test("TC-ROUTE-003: несуществующий канал", async ({ page }) => {
  await page.goto("/app/c/c_nonexistent_xyz");
  await expect(page.getByText(/Conversation not found|не найден|ошибка/i).first()).toBeVisible({
    timeout: 10000,
  });
});
