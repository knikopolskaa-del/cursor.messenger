/**
 * HTTP-клиент для FastAPI-бэкенда мессенджера.
 * URL: VITE_API_URL или http://127.0.0.1:8000
 */
export const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

export const TOKEN_KEY = "messenger_access_token";

/** Сообщение для UI из тела ответа (FastAPI detail и т.п.). */
export function messageFromResponseBody(data, statusText = "") {
  if (typeof data === "string" && data.trim()) return data.trim();
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && typeof d.message === "string") return d.message;
  if (Array.isArray(d)) {
    const parts = d.map((x) =>
      typeof x === "object" && x != null && "msg" in x ? String(x.msg) : JSON.stringify(x),
    );
    const joined = parts.filter(Boolean).join("; ");
    if (joined) return joined;
  }
  if (data && typeof data === "object" && typeof data.message === "string") return data.message;
  return statusText || "Ошибка запроса";
}

/** Текст ошибки из исключения после request() или сетевого сбоя. */
export function formatApiError(err) {
  if (err == null) return "Неизвестная ошибка";
  if (typeof err === "string") return err;
  if (err.status === 403) return "Нет прав";
  if (err.status === 400 && (err.data?.detail?.error === "email_taken" || err.data?.detail?.message === "Email already exists")) {
    return "Пользователь с таким email уже зарегистрирован";
  }
  if (err.name === "TypeError" || err.message === "Failed to fetch") {
    return `Нет связи с API (${API_BASE}). Запущен ли бэкенд?`;
  }
  if (err.message) return err.message;
  return messageFromResponseBody(err.data, "");
}

async function request(method, path, { body, token, skipAuth } = {}) {
  const headers = {};
  const hasJsonBody = body !== undefined && body !== null;
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  const t = token ?? localStorage.getItem(TOKEN_KEY);
  if (t && !skipAuth) {
    headers["Authorization"] = `Bearer ${t}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: hasJsonBody ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err = new Error(formatApiError(e));
    err.cause = e;
    throw err;
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error(messageFromResponseBody(data, res.statusText));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function login(email, password) {
  return request("POST", "/auth/login", {
    body: { email, password },
    skipAuth: true,
  });
}

export function register(email, password, name, passwordConfirm) {
  return request("POST", "/auth/register", {
    body: { email, password, passwordConfirm, name },
    skipAuth: true,
  });
}

export function logout(token) {
  return request("POST", "/auth/logout", { token });
}

export function getMe(token) {
  return request("GET", "/me", { token });
}

export function patchMe(token, payload) {
  return request("PATCH", "/me", { token, body: payload });
}

export function getUsers(token) {
  return request("GET", "/users", { token });
}

export function getWorkspace(token) {
  return request("GET", "/workspace", { token });
}

export function getChannels(token) {
  return request("GET", "/channels", { token });
}

export function postChannel(token, payload) {
  return request("POST", "/channels", { token, body: payload });
}

export function getGroups(token) {
  return request("GET", "/groups", { token });
}

export function postGroup(token, payload) {
  return request("POST", "/groups", { token, body: payload });
}

export function getDirects(token) {
  return request("GET", "/directs", { token });
}

export function postDirect(token, peerUserId) {
  return request("POST", "/directs", { token, body: { peerUserId } });
}

export function getMessages(token, conversationType, conversationId, query = "") {
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return request(
    "GET",
    `/conversations/${encodeURIComponent(conversationType)}/${encodeURIComponent(conversationId)}/messages${q}`,
    { token },
  );
}

export function postMessage(token, conversationType, conversationId, payload) {
  return request(
    "POST",
    `/conversations/${encodeURIComponent(conversationType)}/${encodeURIComponent(conversationId)}/messages`,
    { token, body: payload },
  );
}

export function getActivities(token, unreadOnly) {
  const q = unreadOnly ? "?unread_only=true" : "";
  return request("GET", `/activities${q}`, { token });
}

export function getSaved(token) {
  return request("GET", "/saved", { token });
}

export function postSaved(token, body) {
  return request("POST", "/saved", { token, body });
}

export function patchChannel(token, channelId, body) {
  return request("PATCH", `/channels/${encodeURIComponent(channelId)}`, { token, body });
}

export function patchGroup(token, groupId, body) {
  return request("PATCH", `/groups/${encodeURIComponent(groupId)}`, { token, body });
}

/** Multipart загрузка файла; ответ: { fileId, url, name, sizeBytes, mimeType, type } */
export async function postUpload(token, file) {
  const fd = new FormData();
  fd.append("file", file);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}/uploads`, { method: "POST", headers, body: fd });
  } catch (e) {
    throw new Error(formatApiError(e));
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error(messageFromResponseBody(data, res.statusText));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function search(token, q, scope = "messages") {
  return request("GET", `/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(scope)}`, {
    token,
  });
}
