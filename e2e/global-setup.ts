import { chromium, request, type FullConfig } from "@playwright/test";
import { loginApi } from "./helpers/api";
import { pruneGeneralChannelE2eNoise } from "./helpers/cleanup";
import { TOKEN_KEY, USERS } from "./helpers/seed";
import fs from "node:fs";
import path from "node:path";

const AUTH_FILE = path.join("e2e", ".auth", "test-user.json");

export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:5173";
  const api = await request.newContext();
  await pruneGeneralChannelE2eNoise(api);
  const token = await loginApi(api, USERS.test.email, USERS.test.password);
  await api.dispose();

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: TOKEN_KEY, value: token },
  );
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}
