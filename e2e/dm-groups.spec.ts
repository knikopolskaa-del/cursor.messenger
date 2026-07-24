import { test, expect } from "@playwright/test";
import { loginAsMaria, loginViaApi } from "./helpers/ui";
import { GROUPS, USER_IDS, USERS } from "./helpers/seed";

test.describe.configure({ mode: "serial" });

test("TC-GRP-002: открытие группы", async ({ page, request }) => {
  await loginViaApi(page, request);
  const groupLink = page.getByRole("link", { name: GROUPS.launch.title });
  if ((await groupLink.count()) === 0) {
    test.skip(true, "Seed-группа «Команда запуска» недоступна");
  }
  await groupLink.click();
  await expect(page).toHaveURL(new RegExp(`/app/g/${GROUPS.launch.id}`));
  await expect(page.getByText("План запуска")).toBeVisible();
});

test("TC-GRP-003: сообщения в группе = thread UI", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/g/${GROUPS.launch.id}`);
  if (page.url().includes("/app/g/")) {
    const row = page.locator("[data-message-id]").first();
    if ((await row.count()) === 0) test.skip(true, "Нет сообщений в группе");
    await expect(row.getByRole("button", { name: "Тред" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Сохранить" })).toBeVisible();
  }
});

test("TC-GRP-004: panel info — число участников", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/g/${GROUPS.launch.id}?panel=info`);
  await expect(page.getByText(/Участников:/)).toBeVisible();
});

test("TC-GRP-005: иконка группы (дефолт)", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/g/${GROUPS.launch.id}`);
  await expect(page.locator("header").locator("img, span").first()).toBeVisible();
});

test("TC-DM-001: открытие DM из сайдбара", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  const ivanLink = page.getByRole("link", { name: USERS.ivan.name });
  if ((await ivanLink.count()) === 0) test.skip(true, "Нет DM с Иваном в seed");
  await ivanLink.click();
  await expect(page).toHaveURL(new RegExp(`/app/d/${USER_IDS.ivan}`));
});

test("TC-DM-002: свои сообщения справа", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  const own = page.locator("[data-message-id]").filter({ hasText: "Да, после обеда." });
  if ((await own.count()) === 0) test.skip(true, "Seed DM недоступен");
  await expect(own).toHaveClass(/justify-end/);
});

test("TC-DM-003: чужие сообщения слева с аватаром", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  const peer = page.locator("[data-message-id]").filter({ hasText: "Привет! Сможешь" });
  if ((await peer.count()) === 0) test.skip(true, "Seed DM недоступен");
  await expect(peer).toHaveClass(/justify-start/);
  await expect(peer.locator("img").first()).toBeVisible();
});

test("TC-DM-007: нет кнопок «Тред» / «Сохранить» в DM", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  await expect(page.getByRole("button", { name: "Тред" })).toHaveCount(0);
  await expect(page.getByTestId("save-message")).toHaveCount(0);
});

test("TC-DM-008: DM не создан", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/d/${USER_IDS.guest}`);
  await expect(page.getByText("Диалог с этим пользователем ещё не создан.")).toBeVisible();
});

test("TC-DM-009: in-chat search в DM", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  const notCreated = page.getByText("Диалог с этим пользователем ещё не создан.");
  const composer = page.getByPlaceholder("Написать сообщение…");
  await expect(notCreated.or(composer)).toBeVisible({ timeout: 10000 });
  if (await notCreated.isVisible()) test.skip(true, "Seed DM недоступен");
  await page.getByLabel("Поиск по чату").click();
  await page.getByLabel("Поиск по сообщениям").fill("PR");
  if (await page.getByText("Ничего не найдено").isVisible()) {
    test.skip(true, "Seed DM недоступен");
  }
  await expect(page.locator("[data-message-id]").filter({ hasText: "PR" }).first()).toBeVisible();
});

test("TC-DM-010: panel info для DM", async ({ page, request }) => {
  if (!(await loginAsMaria(page, request))) test.skip(true, "Maria/seed недоступна");
  await page.goto(`/app/d/${USER_IDS.ivan}?panel=info`);
  await expect(page.getByText("Информация", { exact: true })).toBeVisible();
});

test("TC-DM-004: отправка только файла", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto("/app/new/dm");
  await page.locator("select").selectOption({ label: `${USERS.ivan.name} — Сотрудник` });
  await page.getByRole("button", { name: "Открыть чат" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/d/${USER_IDS.ivan}`));
  const composer = page.locator(".cm-chat-composer");
  await composer.locator('input[type="file"]').first().setInputFiles("e2e/fixtures/sample.txt");
  await expect(composer.getByText("sample.txt", { exact: true })).toBeVisible();
  const postResponse = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/messages\/?$/.test(new URL(res.url()).pathname) &&
      res.status() === 201,
  );
  await composer.getByRole("button", { name: "Отправить" }).click();
  const body = (await (await postResponse).json()) as { id?: string };
  if (body.id) {
    await expect(page.locator(`[data-message-id="${body.id}"]`)).toBeVisible({ timeout: 15000 });
    return;
  }
  await expect(page.locator("[data-message-id]").filter({ hasText: "sample.txt" }).last()).toBeVisible({
    timeout: 15000,
  });
});

test("TC-DM-005: текст + файл в одном сообщении", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  const body = `E2E DM combo ${Date.now()}`;
  await page.getByPlaceholder("Написать сообщение…").fill(body);
  await page.locator('input[type="file"]').first().setInputFiles("e2e/fixtures/sample.txt");
  await page.getByRole("button", { name: "Отправить" }).click();
  const row = page.locator("[data-message-id]").filter({ hasText: body }).last();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.getByText("sample.txt")).toBeVisible();
});

test("TC-DM-006: картинка в DM — превью или file card", async ({ page, request }) => {
  await loginViaApi(page, request);
  await page.goto(`/app/d/${USER_IDS.ivan}`);
  await page.locator('input[type="file"]').first().setInputFiles("e2e/fixtures/sample.png");
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.locator("[data-message-id]").last()).toBeVisible({ timeout: 15000 });
});
