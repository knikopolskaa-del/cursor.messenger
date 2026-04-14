import { users } from "../mock.js";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getUser(userId) {
  return users.find((u) => u.id === userId);
}

export function presenceColor(status) {
  if (status === "online") return "bg-emerald-400";
  if (status === "away") return "bg-amber-300";
  if (status === "dnd") return "bg-rose-400";
  return "bg-slate-500";
}

export function userTypeLabel(type) {
  if (type === "admin") return "Администратор";
  if (type === "guest") return "Гость";
  return "Сотрудник";
}

export function statusLabel(status) {
  if (status === "online") return "В сети";
  if (status === "away") return "Отошёл";
  if (status === "dnd") return "Не беспокоить";
  return "Не в сети";
}

export function conversationPath(key) {
  const [kind, id] = key.split(":");
  if (kind === "c") return `/app/c/${id}`;
  if (kind === "d") return `/app/d/${id}`;
  return `/app/g/${id}`;
}
