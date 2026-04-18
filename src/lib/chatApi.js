/** Найти id треда DM по паре (я, собеседник). */
export function resolveDirectThreadId(directs, meId, peerUserId) {
  if (!directs?.length || !meId || !peerUserId) return null;
  const want = [meId, peerUserId].sort().join(",");
  const d = directs.find((x) => [...x.userIds].sort().join(",") === want);
  return d?.id ?? null;
}

export function formatAttachmentSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Ответ API → форма, ожидаемая компонентами чата. */
export function normalizeApiMessage(m) {
  if (!m) return null;
  const createdAt =
    typeof m.createdAt === "string" ? m.createdAt : m.createdAt?.toString?.() ?? "";
  return {
    id: m.id,
    authorId: m.authorId,
    text: m.deletedAt ? "Сообщение удалено." : m.text ?? "",
    createdAt,
    replyToId: m.parentMessageId ?? null,
    attachments: (m.attachments ?? []).map((a) => ({
      type: a.type,
      name: a.name,
      size: formatAttachmentSize(a.sizeBytes),
    })),
    reactions: m.reactions ?? [],
  };
}

/** Сохранённое / активность: ключ c: → channel + id */
export function parseConversationKey(key) {
  const [kind, id] = key.split(":");
  if (kind === "c") return { type: "channel", id };
  if (kind === "g") return { type: "group", id };
  if (kind === "d") return { type: "direct", peerUserId: id };
  return null;
}

export function conversationKeyFromApi(type, id, meId, directs) {
  if (type === "channel") return `c:${id}`;
  if (type === "group") return `g:${id}`;
  if (type === "direct") {
    const d = directs?.find((x) => x.id === id);
    const peer = d?.userIds?.find((u) => u !== meId);
    return peer ? `d:${peer}` : `d:${meId}`;
  }
  return "";
}

/** Маршрут приложения для чата (в URL DM — id собеседника). */
export function appPathForConversation(conversationType, conversationId, meId, directs) {
  if (conversationType === "channel") return `/app/c/${encodeURIComponent(conversationId)}`;
  if (conversationType === "group") return `/app/g/${encodeURIComponent(conversationId)}`;
  const d = directs?.find((x) => x.id === conversationId);
  const peer = d?.userIds?.find((u) => u !== meId) ?? conversationId;
  return `/app/d/${encodeURIComponent(peer)}`;
}
