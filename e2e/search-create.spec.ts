import { test, expect } from "@playwright/test";
import {
  clearSidebarSearch,
  loginAsGuest,
  loginViaApi,
  sidebarSearch,
} from "./helpers/ui";
import { CHANNELS, MESSAGES, USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
});

test("TC-SRCH-001: локальные каналы", async ({ page }) => {
  await sidebarSearch(page, "общ");
  await expect(page.getByText("Каналы")).toBeVisible();
  await page.getByRole("button", { name: /общий/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/c/${CHANNELS.general.id}`));
});

test("TC-SRCH-002: локальные люди", async ({ page }) => {
  await sidebarSearch(page, "Иван");
  await expect(page.getByText("Люди")).toBeVisible();
  await page.getByRole("button", { name: USERS.ivan.name }).click();
  await expect(page).toHaveURL(/\/app\/d\//);
});

test("TC-SRCH-003: результаты «По серверу»", async ({ page }) => {
  await sidebarSearch(page, "Threads");
  await expect(page.getByText("По серверу")).toBeVisible({ timeout: 10000 });
});

test("TC-SRCH-004: «Загрузка...»", async ({ page }) => {
  await sidebarSearch(page, "мессенджер");
  await expect(page.getByText("Загрузка...").or(page.getByText("По серверу"))).toBeVisible();
});

test("TC-SRCH-005: «Ничего не найдено»", async ({ page }) => {
  await sidebarSearch(page, "zzz-no-match-xyz-123");
  await expect(page.getByText("Ничего не найдено")).toBeVisible({ timeout: 10000 });
});

test("TC-SRCH-006: ошибка API search", async ({ page }) => {
  await page.route("**/search**", (route) => route.fulfill({ status: 500, body: "fail" }));
  await sidebarSearch(page, "query-fail");
  await expect(page.getByText(/fail|ошибка|500/i).first()).toBeVisible({ timeout: 10000 });
  await page.unroute("**/search**");
});

test("TC-SRCH-007: очистка поиска восстанавливает nav", async ({ page }) => {
  await sidebarSearch(page, "общ");
  await clearSidebarSearch(page);
  await expect(page.getByRole("link", { name: "Главная" })).toBeVisible();
});

test("TC-NEW-001: hub — три опции", async ({ page }) => {
  await page.goto("/app/new");
  await expect(page.getByText("# Канал")).toBeVisible();
  await expect(page.getByText("Групповой чат")).toBeVisible();
  await expect(page.getByText("Личное сообщение")).toBeVisible();
});

test("TC-NEW-002: закрытие модалки", async ({ page }) => {
  await page.goto("/app/c/c_general");
  await page.getByRole("link", { name: "Создать", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть" }).click();
  await expect(page).toHaveURL(/\/app\/c\/c_general/);
});

test("TC-NEW-003: создание канала", async ({ page }) => {
  const slug = `test-ch-${Date.now()}`;
  await page.goto("/app/new/channel");
  await page.getByPlaceholder("komanda-ux").fill(slug);
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/app\/c\//);
  await expect(page.getByRole("link", { name: new RegExp(`#${slug}`) })).toBeVisible();
});

test("TC-NEW-004: канал — невалидный slug", async ({ page }) => {
  await page.goto("/app/new/channel");
  await page.getByPlaceholder("komanda-ux").click();
  await page.getByPlaceholder("komanda-ux").fill("bad slug");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByText(/дефис|подчёркивание|пробел|буквы/i).first()).toBeVisible();
});

test("TC-NEW-005: guest не создаёт канал", async ({ page, request }) => {
  if (!(await loginAsGuest(page, request))) test.skip(true, "Guest недоступен");
  await page.goto("/app/new/channel");
  await expect(page.getByText("Гостевые пользователи не могут создавать каналы.")).toBeVisible();
});

test("TC-NEW-006: создание группы", async ({ page }) => {
  await page.goto("/app/new/group");
  await page.getByPlaceholder("Команда запуска").fill(`E2E группа ${Date.now()}`);
  await page.locator("button").filter({ hasText: USERS.ivan.name }).first().click();
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/app\/g\//);
});

test("TC-NEW-007: группа без участников", async ({ page }) => {
  await page.goto("/app/new/group");
  await page.getByPlaceholder("Команда запуска").fill("Группа без людей");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByText(/хотя бы одного сотрудника/i)).toBeVisible();
});

test("TC-NEW-008: поиск участников группы", async ({ page }) => {
  await page.goto("/app/new/group");
  await page.getByPlaceholder("Поиск по имени, e-mail или должности…").fill("Иван");
  await expect(page.getByRole("button", { name: USERS.ivan.name })).toBeVisible();
});

test("TC-NEW-009: новый DM", async ({ page }) => {
  await page.goto("/app/new/dm");
  await page.locator("select").selectOption({ label: `${USERS.ivan.name} — Сотрудник` });
  await page.getByRole("button", { name: "Открыть чат" }).click();
  await expect(page).toHaveURL(/\/app\/d\//);
});

test("TC-NEW-010: DM без выбора", async ({ page }) => {
  await page.goto("/app/new/dm");
  await page.evaluate(() => {
    const sel = document.querySelector("select");
    if (sel) {
      sel.value = "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.getByRole("button", { name: "Открыть чат" }).click();
  await expect(page.getByText("Выберите сотрудника")).toBeVisible();
});

test("TC-GRP-001: создание группы (дублирует NEW-006)", async ({ page }) => {
  await page.goto("/app/new/group");
  await page.getByPlaceholder("Команда запуска").fill(`Grp ${Date.now()}`);
  await page.locator("button").filter({ hasText: USERS.ivan.name }).first().click();
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/app\/g\//);
});
