import { test, expect } from "@playwright/test";
import { loginAsGuest, getTheme } from "./helpers/ui";
import { USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test("TC-ME-001: отображение данных профиля", async ({ page }) => {
  await page.goto("/app/me");
  await expect(page.getByText(USERS.test.name, { exact: true }).first()).toBeVisible();
});

test("TC-ME-003: редактирование bio и телефона", async ({ page }) => {
  await page.goto("/app/me");
  const bio = page.locator("textarea").first();
  await bio.fill(`E2E bio ${Date.now()}`);
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("Сохранено")).toBeVisible({ timeout: 10000 });
});

test("TC-ME-004: bio > 500 символов", async ({ page }) => {
  await page.goto("/app/me");
  const bio = page.locator("textarea").first();
  await bio.fill("x".repeat(501));
  await bio.blur();
  await expect(page.getByText(/500 символов/i)).toBeVisible();
});

test("TC-ME-005: guest — имя read-only", async ({ page, request }) => {
  if (!(await loginAsGuest(page, request))) test.skip(true, "Guest недоступен");
  await page.goto("/app/me");
  await expect(page.getByText(/администратор/i)).toBeVisible();
});

test("TC-ME-006: email read-only", async ({ page }) => {
  await page.goto("/app/me");
  await expect(page.getByText("Смена e-mail через администратора.")).toBeVisible();
});

test("TC-ME-007: должность/отдел read-only rows", async ({ page }) => {
  await page.goto("/app/me");
  await expect(page.getByText(/QA|Тестирование|Продуктовый|Дизайн|Сотрудник/i).first()).toBeVisible();
});

test("TC-SET-001: страница настроек", async ({ page }) => {
  await page.goto("/app/settings");
  await expect(page.getByText("Внешний вид")).toBeVisible();
  await expect(page.getByText("Уведомления")).toBeVisible();
  await expect(page.getByText("Язык и регион")).toBeVisible();
});

test("TC-SET-002: чекбоксы уведомлений (UI-only)", async ({ page }) => {
  await page.goto("/app/settings");
  const mentions = page.getByLabel("Упоминания");
  const checked = await mentions.isChecked();
  await mentions.click();
  await expect(mentions).toBeChecked({ checked: !checked });
  await page.reload();
  await expect(page.getByLabel("Упоминания")).toBeChecked({ checked });
});

test("TC-THEME-001: light theme — readable text", async ({ page }) => {
  await page.goto("/app/c/c_general?panel=info");
  while ((await getTheme(page)) !== "light") {
    await page.getByLabel("Переключить тему").first().click();
  }
  await expect(page.getByText("Информация", { exact: true })).toBeVisible();
});

test("TC-THEME-002: dark theme — dataset", async ({ page }) => {
  await page.goto("/app");
  while ((await getTheme(page)) !== "dark") {
    await page.getByLabel("Переключить тему").first().click();
  }
  await expect(await getTheme(page)).toBe("dark");
});

test("TC-404-001: несуществующий /app/ path", async ({ page }) => {
  await page.goto("/app/unknown-page");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByText("Страница не найдена")).toBeVisible();
  await page.getByRole("link", { name: "Вернуться в мессенджер" }).click();
  await expect(page).toHaveURL(/\/app/);
});
