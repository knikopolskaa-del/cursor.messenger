import { test, expect } from "@playwright/test";
import { expectLoggedInShell } from "./helpers/ui";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

async function fillRegisterField(page: import("@playwright/test").Page, placeholder: string, value: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(value);
}

test("TC-REG-001: успешная регистрация", async ({ page }) => {
  const email = `pw-e2e-${Date.now()}@sharebot.net`;
  await page.goto("/register");
  await fillRegisterField(page, "user@company.ru", email);
  await fillRegisterField(page, "Иванов Иван", "Иванов Иван");
  const pwd = "Qwerty!234";
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).click();
  await pwInputs.nth(0).fill(pwd);
  await pwInputs.nth(1).click();
  await pwInputs.nth(1).fill(pwd);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expectLoggedInShell(page);
});

test("TC-REG-002: пустая форма регистрации", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText("Введите e-mail")).toBeVisible();
  await expect(page.getByText("Введите ФИО")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("TC-REG-003: несовпадение паролей", async ({ page }) => {
  await page.goto("/register");
  await fillRegisterField(page, "user@company.ru", `reg-${Date.now()}@sharebot.net`);
  await fillRegisterField(page, "Иванов Иван", "Петров Петр");
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).click();
  await pwInputs.nth(0).fill("Qwerty!234");
  await pwInputs.nth(1).click();
  await pwInputs.nth(1).fill("Qwerty!235");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByText(/совпад|парол/i).first()).toBeVisible();
});

test("TC-REG-004: чеклист требований к паролю", async ({ page }) => {
  await page.goto("/register");
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).click();
  await pwInputs.nth(0).fill("short");
  await pwInputs.nth(0).blur();
  await expect(page.getByText(/8 символов|заглавн|строчн|цифр|спец/i).first()).toBeVisible();
});

test("TC-REG-005: ФИО — только кириллица", async ({ page }) => {
  await page.goto("/register");
  const name = page.getByPlaceholder("Иванов Иван");
  await name.click();
  await name.pressSequentially("John");
  await expect(name).toHaveValue("");
});

test("TC-REG-007: телефон — невалидный формат", async ({ page }) => {
  await page.goto("/register");
  const phone = page.getByPlaceholder("+7 (999) 000-00-00");
  if ((await phone.count()) === 0) test.skip(true, "Поле телефона не на форме");
  await phone.click();
  await phone.pressSequentially("+7 (999) 12");
  await phone.blur();
  await expect(page.getByText(/корректный номер/i)).toBeVisible();
});

test("TC-REG-008: ссылка «Войти»", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("link", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/login/);
});
