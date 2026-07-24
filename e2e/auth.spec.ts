import { test, expect } from "@playwright/test";
import {
  clearAuth,
  getTheme,
  loginViaApi,
  loginViaUI,
  expectLoggedInShell,
  toggleThemeInSidebar,
} from "./helpers/ui";
import { TOKEN_KEY, USERS } from "./helpers/seed";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

test("TC-AUTH-001: пустая форма входа — ошибки валидации", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Введите e-mail")).toBeVisible();
  await expect(page.getByText("Введите пароль")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("TC-AUTH-002: успешный вход перенаправляет в приложение", async ({ page }) => {
  await loginViaUI(page);
  await expectLoggedInShell(page, USERS.test.name);
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  expect(token).toBeTruthy();
});

test("TC-AUTH-003: неверный пароль", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("user@company.ru").click();
  await page.getByPlaceholder("user@company.ru").fill(USERS.test.email);
  await page.getByPlaceholder("Qwerty!234").click();
  await page.getByPlaceholder("Qwerty!234").fill("wrong-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Неверный e-mail или пароль.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  expect(token).toBeNull();
});

test("TC-AUTH-004: невалидный формат e-mail", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("user@company.ru").click();
  await page.getByPlaceholder("user@company.ru").fill("not-email");
  await page.getByPlaceholder("Qwerty!234").click();
  await page.getByPlaceholder("Qwerty!234").fill("1234");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Введите корректный e-mail")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("TC-AUTH-005: показ/скрытие пароля", async ({ page }) => {
  await page.goto("/login");
  const pwd = page.getByPlaceholder("Qwerty!234");
  await expect(pwd).toHaveAttribute("type", "password");
  await page.getByLabel("Показать пароль").click();
  await expect(pwd).toHaveAttribute("type", "text");
  await page.getByLabel("Скрыть пароль").click();
  await expect(pwd).toHaveAttribute("type", "password");
});

test("TC-AUTH-006: переход на регистрацию", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/register/);
});

test("TC-AUTH-007: уже авторизованный пользователь на /login", async ({ page }) => {
  await loginViaUI(page);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/app/);
});

test("TC-AUTH-008: выход из аккаунта", async ({ page }) => {
  await loginViaUI(page);
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  expect(token).toBeNull();
});

test("TC-AUTH-009: доступ к /app без токена", async ({ page }) => {
  await clearAuth(page);
  await page.goto("/app/c/c_general");
  await expect(page).toHaveURL(/\/login/);
});

test("TC-AUTH-010: экран ошибки сессии", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(({ key, fake }) => {
    localStorage.setItem(key, fake);
  }, { key: TOKEN_KEY, fake: "memtok_fake_session_token" });
  await page.route("**/me", (route) => route.fulfill({ status: 500, body: "fail" }));
  await page.goto("/app");
  await expect(page.getByText("Не удалось загрузить профиль")).toBeVisible();
  await page.unroute("**/me");
});

test("TC-AUTH-011: boot loading на login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});

test("TC-AUTH-012: тема на странице входа", async ({ page }) => {
  await page.goto("/login");
  const before = await getTheme(page);
  await page.getByLabel("Переключить тему").click();
  const after = await getTheme(page);
  expect(after).not.toBe(before);
});

test("TC-THEME-003: тема на auth и в app согласована", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Переключить тему").click();
  const loginTheme = await getTheme(page);
  await loginViaApi(page, request);
  await expect(await getTheme(page)).toBe(loginTheme);
  await toggleThemeInSidebar(page);
  await expect(await getTheme(page)).not.toBe(loginTheme);
});
