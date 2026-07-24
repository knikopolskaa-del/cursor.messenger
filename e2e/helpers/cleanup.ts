import type { APIRequestContext } from "@playwright/test";
import { apiUrl, authHeaders, loginApi } from "./api";
import { CHANNELS, USERS } from "./seed";

const SEED_MESSAGE_IDS = new Set(["m1", "m2", "m3"]);

function isE2eNoise(id: string, text: string): boolean {
  if (SEED_MESSAGE_IDS.has(id)) return false;
  if (/^m_/.test(id)) return true;
  return /^(E2E|Smoke|API verify)/.test(text.trim());
}

/** Удаляет накопившийся шум E2E в #общий, чтобы seed m1–m3 снова попадали в limit=80. */
export async function pruneGeneralChannelE2eNoise(request: APIRequestContext): Promise<void> {
  let token: string | null = null;
  for (const creds of [USERS.maria, USERS.test]) {
    try {
      token = await loginApi(request, creds.email, creds.password);
      break;
    } catch {
      /* try next */
    }
  }
  if (!token) return;

  const res = await request.get(
    apiUrl(
      `/conversations/channel/${CHANNELS.general.id}/messages?limit=200`,
    ),
    { headers: authHeaders(token) },
  );
  if (!res.ok()) return;

  const msgs = (await res.json()) as Array<{ id: string; text?: string }>;
  for (const m of msgs) {
    if (!isE2eNoise(m.id, m.text ?? "")) continue;
    await request.delete(apiUrl(`/messages/${encodeURIComponent(m.id)}`), {
      headers: authHeaders(token),
    });
  }
}
