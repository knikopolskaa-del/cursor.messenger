import { APIRequestContext, expect } from "@playwright/test";

/** Прямой URL API (Playwright не использует Vite proxy). */
export const API_BASE = (process.env.PW_API_BASE || "http://127.0.0.1:8001").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const slug = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${slug}`;
}

export function authHeaders(token: string | null | undefined): Record<string, string> {
  if (!token) return { "Content-Type": "application/json" };
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(apiUrl("/auth/login"), {
    data: { email, password },
  });
  expect(res.ok(), `login ${email} → ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.accessToken).toBeTruthy();
  return body.accessToken as string;
}

/** Pydantic/FastAPI validation errors from our 400 handler. */
export function expectValidationFields(body: unknown, fieldPath: (string | number)[]) {
  const detail = (body as { detail?: { fields?: unknown[] } })?.detail;
  expect(detail?.fields, "ожидается detail.fields").toBeTruthy();
  const fields = detail!.fields as Array<{ loc?: (string | number)[]; msg?: string }>;
  const suffix = fieldPath.join(".");
  const match = fields.some((f) => {
    const loc = f.loc ?? [];
    const tail = loc.slice(-fieldPath.length);
    return (
      tail.length === fieldPath.length &&
      fieldPath.every((p, i) => String(tail[i]) === String(p))
    );
  });
  expect(match, `поле ${suffix} среди fields: ${JSON.stringify(fields)}`).toBeTruthy();
}
