import { test, expect } from "@playwright/test";
import {
  API_BASE,
  apiUrl,
  authHeaders,
  expectValidationFields,
  loginApi,
  postMessage,
  uploadFile,
} from "./helpers/api";

/**
 * API-контракт: авторизация, валидация, rate limit.
 * Требует запущенный бэкенд (npm run stack) и npm run e2e:ensure-user.
 */
test.describe.configure({ mode: "serial" });

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "1234";

test.describe("Авторизация", () => {
  test("приватные эндпоинты без токена → 401", async ({ request }) => {
    for (const path of ["/me", "/workspace", "/search?q=hello&scope=messages"]) {
      const res = await request.get(apiUrl(path));
      expect(res.status(), path).toBe(401);
    }
    const postRes = await request.post(apiUrl("/uploads"));
    expect(postRes.status()).toBe(401);
  });

  test("невалидный Bearer → 401", async ({ request }) => {
    const res = await request.get(apiUrl("/me"), {
      headers: { Authorization: "Bearer memtok_invalid" },
    });
    expect(res.status()).toBe(401);
  });

  test("чужое сообщение: PATCH не автор → 403", async ({ request }) => {
    const token = await loginApi(request, TEST_EMAIL, TEST_PASSWORD);
    // m2 в seed: автор u_me (Maria), не test@example.com
    const res = await request.patch(apiUrl("/messages/m2"), {
      headers: authHeaders(token),
      data: { text: "E2E не должен менять чужое" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    const detail = body.detail;
    const msg =
      typeof detail === "object" && detail && "message" in detail
        ? String(detail.message)
        : String(detail ?? "");
    expect(msg.toLowerCase()).toMatch(/author|forbidden|автор/i);
  });

  test("админский эндпоинт для обычного пользователя → 403", async ({ request }) => {
    const token = await loginApi(request, TEST_EMAIL, TEST_PASSWORD);
    const res = await request.post(apiUrl("/admin/invites"), {
      headers: authHeaders(token),
      data: { email: "invite-e2e@example.com", expiresInDays: 7 },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Валидация", () => {
  test("логин: пустое тело → 400 и поля email/password", async ({ request }) => {
    const res = await request.post(apiUrl("/auth/login"), { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail?.error).toBe("validation_error");
    expect(body.detail?.message).toBeTruthy();
    expectValidationFields(body, ["email"]);
    expectValidationFields(body, ["password"]);
  });

  test("логин: некорректный email → 400 с полем email", async ({ request }) => {
    const res = await request.post(apiUrl("/auth/login"), {
      data: { email: "not-an-email", password: "x" },
    });
    expect(res.status()).toBe(400);
    expectValidationFields(await res.json(), ["email"]);
  });

  test("регистрация: короткий пароль → 400 с полем password", async ({ request }) => {
    const res = await request.post(apiUrl("/auth/register"), {
      data: {
        email: `val-${Date.now()}@sharebot.net`,
        password: "short",
        passwordConfirm: "short",
        name: "Valid Name",
      },
    });
    expect(res.status()).toBe(400);
    expectValidationFields(await res.json(), ["password"]);
  });

  test("регистрация: несовпадение паролей → 400", async ({ request }) => {
    const res = await request.post(apiUrl("/auth/register"), {
      data: {
        email: `val-${Date.now()}@sharebot.net`,
        password: "Qwerty!234",
        passwordConfirm: "Qwerty!235",
        name: "Valid Name",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail?.error).toBe("validation_error");
    const fields = body.detail?.fields as Array<{ msg?: string; loc?: unknown[] }> | undefined;
    expect(fields?.length).toBeGreaterThan(0);
    const text = JSON.stringify(fields).toLowerCase();
    expect(text).toMatch(/password|match|совпад/i);
  });
});

test.describe("Сообщения API", () => {
  test("TC-API-006: POST message с attachments", async ({ request }) => {
    const token = await loginApi(request, TEST_EMAIL, TEST_PASSWORD);
    const up = await uploadFile(request, token, {
      name: "api-fixture.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("api e2e attachment"),
    });
    const msg = await postMessage(request, token, "channel", "c_general", {
      text: `API attach ${Date.now()}`,
      attachments: [
        {
          type: up.type || "file",
          name: up.name,
          url: up.url,
          sizeBytes: up.sizeBytes,
          mimeType: up.mimeType,
        },
      ],
    });
    expect(msg.attachments?.length).toBeGreaterThan(0);
    expect(msg.id).toBeTruthy();
  });

  test("TC-API-007: POST message с parentMessageId", async ({ request }) => {
    const token = await loginApi(request, TEST_EMAIL, TEST_PASSWORD);
    const reply = await postMessage(request, token, "channel", "c_general", {
      text: `Thread reply ${Date.now()}`,
      parentMessageId: "m1",
    });
    expect(reply.parentMessageId).toBe("m1");
  });
});

test.describe("Rate limit", () => {
  test("логин: после лимита попыток → 429", async ({ request }) => {
    // Должен быть последним в файле: один IP, окно 60 с (in-memory).
    const attempts = 25;
    let saw429 = false;
    for (let i = 0; i < attempts; i++) {
      const res = await request.post(apiUrl("/auth/login"), {
        data: { email: "rate-limit@example.com", password: "wrong" },
      });
      if (res.status() === 429) {
        saw429 = true;
        const body = await res.json();
        expect(body.detail?.error ?? body.detail).toBeTruthy();
        break;
      }
      expect([401, 429]).toContain(res.status());
    }
    expect(saw429, `ожидали 429 за ${attempts} попыток (AUTH_RATE_LIMIT_PER_MINUTE, API ${API_BASE})`).toBe(
      true,
    );
  });
});
