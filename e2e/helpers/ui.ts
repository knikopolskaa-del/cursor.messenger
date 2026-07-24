import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginApi } from "./api";
import { TOKEN_KEY, USERS } from "./seed";

export type Credentials = { email: string; password: string; name?: string };

async function fillAuthInput(page: Page, placeholder: string, value: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(value);
}

export async function clearAuth(page: Page) {
  await page.goto("/login");
  await page.evaluate((key) => localStorage.removeItem(key), TOKEN_KEY);
}

/** Кэш токенов в рамках одного прогона — меньше POST /auth/login и 429. */
const tokenCache = new Map<string, string>();

export async function loginViaApi(
  page: Page,
  request: APIRequestContext,
  creds: Credentials = USERS.test,
) {
  let token = tokenCache.get(creds.email);
  if (!token) {
    token = await loginApi(request, creds.email, creds.password);
    tokenCache.set(creds.email, token);
  }
  await page.goto("/login");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: TOKEN_KEY, value: token },
  );
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app/);
}

export async function loginViaUI(page: Page, creds: Credentials = USERS.test) {
  await page.goto("/login");
  await fillAuthInput(page, "user@company.ru", creds.email);
  await fillAuthInput(page, "Qwerty!234", creds.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/app/);
}

export async function loginAsMaria(page: Page, request: APIRequestContext): Promise<boolean> {
  try {
    await loginViaApi(page, request, USERS.mariaSeed);
    return true;
  } catch {
    return false;
  }
}

export async function loginAsGuest(page: Page, request: APIRequestContext): Promise<boolean> {
  try {
    await loginViaApi(page, request, USERS.guest);
    return true;
  } catch {
    return false;
  }
}

export async function loginAsAdmin(page: Page, request: APIRequestContext): Promise<boolean> {
  try {
    await loginViaApi(page, request, USERS.anna);
    return true;
  } catch {
    try {
      await loginViaApi(page, request, USERS.maria);
      return true;
    } catch {
      return false;
    }
  }
}

export async function expectLoggedInShell(page: Page, userName?: string) {
  await expect(page.getByText("Мессенджер", { exact: true }).first()).toBeVisible();
  if (userName) {
    await expect(page.getByText(userName, { exact: true }).first()).toBeVisible();
  }
}

export async function openChannel(page: Page, channelId: string) {
  await page.goto(`/app/c/${channelId}`);
  await expect(page).toHaveURL(new RegExp(`/app/c/${channelId}`));
}

export async function expectComposerVisible(page: Page) {
  const composer = page.getByPlaceholder("Написать сообщение…");
  await expect(composer).toBeVisible();
  const box = await composer.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "composer bounding box").toBeTruthy();
  if (viewport && box) {
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 2);
  }
}

export async function sendChatMessage(page: Page, text: string) {
  const composer = page.getByPlaceholder("Написать сообщение…");
  await composer.fill(text);
  const postResponse = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/messages\/?$/.test(new URL(res.url()).pathname) &&
      res.status() === 201,
  );
  await page.getByRole("button", { name: "Отправить" }).click();
  const resp = await postResponse;
  const body = (await resp.json()) as { id?: string };
  if (body.id) {
    await expect(page.locator(`[data-message-id="${body.id}"]`)).toBeVisible({ timeout: 15000 });
    return;
  }
  await expect(page.locator("[data-message-id]").filter({ hasText: text }).last()).toBeVisible({
    timeout: 15000,
  });
}

export async function getTheme(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.dataset.theme || "light");
}

export async function toggleThemeInSidebar(page: Page) {
  await page.getByLabel("Переключить тему").first().click();
}

export async function sidebarSearch(page: Page, query: string) {
  await page.getByPlaceholder("Поиск…").fill(query);
}

export async function clearSidebarSearch(page: Page) {
  await page.getByLabel("Очистить").click();
}
