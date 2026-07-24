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
  let lastStatus = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.post(apiUrl("/auth/login"), {
      data: { email, password },
    });
    lastStatus = res.status();
    if (res.status() === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    expect(res.ok(), `login ${email} → ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    return body.accessToken as string;
  }
  expect(false, `login ${email} → ${lastStatus}`).toBeTruthy();
  throw new Error("unreachable");
}

/** Pydantic/FastAPI validation errors from our 400 handler. */
export async function postMessage(
  request: APIRequestContext,
  token: string,
  conversationType: "channel" | "group" | "direct",
  conversationId: string,
  body: Record<string, unknown>,
) {
  const res = await request.post(
    apiUrl(
      `/conversations/${encodeURIComponent(conversationType)}/${encodeURIComponent(conversationId)}/messages`,
    ),
    { headers: authHeaders(token), data: body },
  );
  expect(res.ok(), `postMessage → ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function deleteMessage(request: APIRequestContext, token: string, messageId: string) {
  const res = await request.delete(apiUrl(`/messages/${encodeURIComponent(messageId)}`), {
    headers: authHeaders(token),
  });
  expect(res.ok(), `deleteMessage ${messageId} → ${res.status()}`).toBeTruthy();
}

export async function postChannel(
  request: APIRequestContext,
  token: string,
  slug: string,
  opts: { isPrivate?: boolean } = {},
) {
  const res = await request.post(apiUrl("/channels"), {
    headers: authHeaders(token),
    data: { slug, title: slug, topic: "", isPrivate: Boolean(opts.isPrivate) },
  });
  expect(res.ok(), `postChannel → ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function uploadFile(
  request: APIRequestContext,
  token: string,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const res = await request.post(apiUrl("/uploads"), {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      file: {
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer,
      },
    },
  });
  expect(res.ok(), `upload → ${res.status()}`).toBeTruthy();
  return res.json();
}

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
