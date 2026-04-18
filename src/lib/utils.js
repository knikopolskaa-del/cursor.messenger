export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/** Пользователь из списка API. */
export function pickUser(usersList, userId) {
  const list = usersList;
  if (!userId || !list?.length) return null;
  return list.find((u) => u.id === userId) ?? null;
}

export function userStub(userId) {
  return {
    id: userId,
    name: userId,
    title: "",
    email: "",
    avatarUrl: "",
    status: "offline",
    userType: "employee",
  };
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** @deprecated Используйте pickUser(users, id) из контекста. */
export function getUser() {
  return null;
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
  if (type === "intern") return "Стажёр";
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
