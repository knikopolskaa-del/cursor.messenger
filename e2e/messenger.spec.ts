import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "1234";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("user@gmail.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("Qwerty!234").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("Пользователь регистрируется и попадает на главную страницу", async ({ page }) => {
  const stamp = Date.now();
  const email = `pw-e2e-${stamp}@sharebot.net`;

  await page.goto("/register");
  await page.getByPlaceholder("user@gmail.com").fill(email);
  await page.getByPlaceholder("Иванов Иван").fill("Иванов Иван");
  const pwd = "Qwerty!234";
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).fill(pwd);
  await pwInputs.nth(1).fill(pwd);

  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("Мессенджер компании")).toBeVisible();
});

test("Пользователь создаёт запись, она появляется в списке", async ({ page }) => {
  const body = `E2E-сообщение ${Date.now()}`;
  await login(page);

  await expect(page).toHaveURL(/\/app\/c\//);
  await page.getByPlaceholder("Написать сообщение…").fill(body);
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.locator('[data-message-id]').filter({ hasText: body })).toBeVisible();
});

test("Пользователь выходит из аккаунта и перестает быть авторизованным", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);
  const token = await page.evaluate(() => localStorage.getItem("messenger_access_token"));
  expect(token).toBeNull();
});

test("Без авторизации пользователь не может попасть на страницу с чатом", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.removeItem("messenger_access_token");
  });
  await page.goto("/app/c/c_general");
  await expect(page).toHaveURL(/\/login/);
});

test("Пользователь удаляет запись она исчезает из списка", async ({ page }) => {
  const body = `E2E для сохранённого ${Date.now()}`;
  await login(page);

  await page.getByPlaceholder("Написать сообщение…").fill(body);
  await page.getByRole("button", { name: "Отправить" }).click();
  const row = page.locator(`[data-message-id].group`).filter({ hasText: body });
  await row.hover();
  await row.getByRole("button", { name: "Сохранить" }).click();

  await page.getByRole("link", { name: "Сохранённое" }).click();
  await expect(page).toHaveURL(/\/app\/saved/);
  await expect(page.getByText(body)).toBeVisible();

  const savedRow = page.locator("[data-saved-id]").filter({ hasText: body });
  await savedRow.getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByText(body)).not.toBeVisible();
});
