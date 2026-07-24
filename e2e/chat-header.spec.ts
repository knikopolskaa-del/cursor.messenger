import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginViaApi, openChannel } from "./helpers/ui";
import { CHANNELS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}`);
});

test("TC-CHAN-HDR-001: заголовок канала", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Информация о чате" })).toContainText("#общий");
  await expect(page.getByRole("button", { name: "Информация о чате" })).toContainText("Канал");
});

test("TC-CHAN-HDR-002: клик по названию → panel=info", async ({ page }) => {
  await page.getByRole("button", { name: "Информация о чате" }).click();
  await expect(page).toHaveURL(/\?panel=info/);
  await expect(page.getByText("Информация", { exact: true })).toBeVisible();
});

test("TC-CHAN-HDR-003: меню ⋮ — категории медиа", async ({ page }) => {
  await page.getByLabel("Меню чата").click();
  for (const label of ["Документы", "Видео", "Фото", "Ссылки", "Аудио"]) {
    await expect(page.getByRole("menuitem", { name: label })).toBeVisible();
  }
  await page.getByRole("menuitem", { name: "Фото" }).click();
  await expect(page).toHaveURL(/\?panel=photo/);
  await expect(page.getByText("Пока нет файлов этого типа")).toBeVisible();
});

test("TC-CHAN-HDR-004: меню ⋮ закрывается при скролле", async ({ page }) => {
  await page.getByLabel("Меню чата").click();
  await expect(page.getByRole("menuitem", { name: "Документы" })).toBeVisible();
  await page.locator(".cm-chat-messages").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByRole("menuitem", { name: "Документы" })).toHaveCount(0);
});

test("TC-CHAN-HDR-005: закрытие panel", async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}?panel=info`);
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await expect(page).not.toHaveURL(/\?panel=/);
});

test("TC-CHAN-HDR-006: panel — участники и закреплённые из info", async ({ page }) => {
  await page.goto(`/app/c/${CHANNELS.general.id}?panel=info`);
  await page.getByRole("link", { name: "Участники" }).click();
  await expect(page).toHaveURL(/\?panel=members/);
  await page.goto(`/app/c/${CHANNELS.general.id}?panel=info`);
  await page.getByRole("link", { name: "Закреплённые" }).click();
  await expect(page).toHaveURL(/\?panel=pins/);
});

test("TC-CHAN-HDR-007: in-chat search — открытие и фильтрация", async ({ page }) => {
  await page.getByLabel("Поиск по чату").click();
  await page.getByLabel("Поиск по сообщениям").fill("Threads");
  await expect(page.locator("[data-message-id]").filter({ hasText: "Threads" })).toBeVisible();
});

test("TC-CHAN-HDR-008: in-chat search — нет результатов", async ({ page }) => {
  await page.getByLabel("Поиск по чату").click();
  await page.getByLabel("Поиск по сообщениям").fill("zzz-no-match-xyz");
  await expect(page.getByText("Ничего не найдено")).toBeVisible();
});

test("TC-CHAN-HDR-009: in-chat search — закрытие", async ({ page }) => {
  await page.getByLabel("Поиск по чату").click();
  await page.getByLabel("Закрыть поиск").click();
  await expect(page.getByLabel("Поиск по сообщениям")).toHaveCount(0);
});

test("TC-CHAN-HDR-011: иконка канала без прав редактирования", async ({ page }) => {
  await expect(page.getByLabel("Загрузить иконку")).toHaveCount(0);
});

test("TC-CHAN-HDR-010: загрузка иконки канала (admin)", async ({ page, request }) => {
  if (!(await loginAsAdmin(page, request))) test.skip(true, "Admin недоступен");
  await openChannel(page, CHANNELS.general.id);
  await expect(page.getByLabel("Загрузить иконку")).toBeVisible();
});
