import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import { pickUser } from "../lib/utils.js";
import * as api from "../lib/api.js";
import { normalizeApiMessage, resolveDirectThreadId } from "../lib/chatApi.js";
import { Button } from "../components/ui.jsx";
import { Message, Composer, RightPanel, ThreadPanel, ChatSkeleton } from "../components/ChatComponents.jsx";
import { ChatHeader } from "../components/ChatHeader.jsx";
import { IconSearch } from "../design/icons.jsx";

export function AppIndexRedirect() {
  const { channels } = useMessenger();
  const first = channels[0]?.id;
  if (!first) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-sm font-medium text-[color:var(--fg)]">Нет каналов</div>
        <div className="text-xs text-[color:var(--muted)]">Создайте канал через «+ Создать» в сайдбаре.</div>
        <Button to="/app/new/channel">Создать канал</Button>
      </div>
    );
  }
  return <Navigate to={`/app/c/${first}`} replace />;
}

export default function ChatPage({ kind }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const focusHandledRef = useRef(false);
  const messagesScrollRef = useRef(null);
  const focusId = sp.get("focus");
  const threadMessageId = sp.get("thread");
  const panel = sp.get("panel");

  const { token, me, users, channels, groups, directs } = useMessenger();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const apiConversation = useMemo(() => {
    if (kind === "channel") {
      return { type: "channel", id: params.id };
    }
    if (kind === "group") {
      return { type: "group", id: params.id };
    }
    if (kind === "dm") {
      const threadId = resolveDirectThreadId(directs, me.id, params.id);
      return threadId ? { type: "direct", id: threadId } : null;
    }
    return null;
  }, [kind, params.id, directs, me.id]);

  const conversationKey = useMemo(() => {
    if (kind === "channel") return `c:${params.id}`;
    if (kind === "dm") return `d:${params.id}`;
    if (kind === "group") return `g:${params.id}`;
    return "";
  }, [kind, params.id]);

  const loadMessages = useCallback(async () => {
    if (!token || !apiConversation) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await api.getMessages(token, apiConversation.type, apiConversation.id, "limit=80");
      setMessages((raw ?? []).map(normalizeApiMessage).filter(Boolean));
    } catch (e) {
      setLoadError(api.formatApiError(e));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [token, apiConversation]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [conversationKey]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const text = (m.text || "").toLowerCase();
      const attachments = (m.attachments || [])
        .map((a) => `${a.name || ""} ${a.url || ""}`.toLowerCase())
        .join(" ");
      return text.includes(q) || attachments.includes(q);
    });
  }, [messages, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim() || filteredMessages.length === 0) return;
    const firstId = filteredMessages[0]?.id;
    if (!firstId) return;
    const el = document.querySelector(`[data-message-id="${firstId}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [searchQuery, filteredMessages]);

  const visibleMessages = searchQuery.trim() ? filteredMessages : messages;

  useEffect(() => {
    focusHandledRef.current = false;
  }, [focusId, apiConversation?.type, apiConversation?.id]);

  useEffect(() => {
    if (!focusId || loading || messages.length === 0) return;
    if (focusHandledRef.current) return;
    const safe = /^[a-zA-Z0-9_-]+$/.test(focusId) ? focusId : null;
    if (!safe) return;
    const el = document.querySelector(`[data-message-id="${safe}"]`);
    if (el) {
      focusHandledRef.current = true;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const next = new URLSearchParams(sp);
      next.delete("focus");
      const q = next.toString();
      navigate(
        { pathname: location.pathname, search: q ? `?${q}` : "" },
        { replace: true },
      );
    }
  }, [focusId, loading, messages, location.pathname, navigate, sp]);

  const title = useMemo(() => {
    if (kind === "channel") {
      const c = channels.find((x) => x.id === params.id);
      return c ? `#${c.title}` : "Канал";
    }
    if (kind === "dm") {
      const u = pickUser(users, params.id);
      return u ? u.name : "Личное сообщение";
    }
    if (kind === "group") {
      const g = groups.find((x) => x.id === params.id);
      return g ? g.title : "Группа";
    }
    return "Чат";
  }, [kind, params.id, channels, groups, users]);

  const channelMeta = useMemo(() => {
    if (kind !== "channel") return null;
    return channels.find((x) => x.id === params.id) ?? null;
  }, [kind, params.id, channels]);

  const groupMeta = useMemo(() => {
    if (kind !== "group") return null;
    return groups.find((x) => x.id === params.id) ?? null;
  }, [kind, params.id, groups]);

  const kindLabel =
    kind === "channel" ? "Канал" : kind === "dm" ? "Личное сообщение" : "Группа";

  async function handleSend({ text, attachments }) {
    if (!token || !apiConversation || sending) return;
    const att = (attachments || []).filter((a) => a?.url);
    const trimmed = (text || "").trim();
    if (!trimmed && att.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const body = { text: trimmed };
      if (att.length) body.attachments = att;
      await api.postMessage(token, apiConversation.type, apiConversation.id, body);
      await loadMessages();
    } catch (e) {
      setSendError(api.formatApiError(e));
    } finally {
      setSending(false);
    }
  }

  const peerUser = kind === "dm" ? pickUser(users, params.id) : null;
  const messageVariant = kind === "dm" ? "bubble" : "thread";

  const iconUrl =
    kind === "channel" ? channelMeta?.iconUrl : kind === "group" ? groupMeta?.iconUrl : "";
  const iconLabel =
    kind === "channel"
      ? channelMeta?.title
      : kind === "group"
        ? groupMeta?.title
        : peerUser?.name;
  const canEditIcon =
    (kind === "channel" &&
      channelMeta &&
      (me.userType === "admin" || channelMeta.createdBy === me.id)) ||
    (kind === "group" &&
      groupMeta &&
      (me.userType === "admin" || groupMeta.createdBy === me.id));
  const iconTargetType = kind === "channel" ? "channel" : kind === "group" ? "group" : null;
  const iconTargetId =
    kind === "channel" ? channelMeta?.id : kind === "group" ? groupMeta?.id : null;

  if (kind === "dm" && !apiConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[color:var(--muted)]">
        <div>Диалог с этим пользователем ещё не создан.</div>
        <Button to="/app/new/dm">Написать</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="cm-chat-shell min-h-0 min-w-0 flex-1 border-r border-[color:var(--border)]">
        <ChatHeader
          kind={kind}
          title={title}
          kindLabel={kindLabel}
          peerUser={peerUser}
          iconUrl={iconUrl}
          iconLabel={iconLabel}
          token={token}
          editableIcon={canEditIcon}
          iconTargetType={iconTargetType}
          iconTargetId={iconTargetId}
          messagesScrollRef={messagesScrollRef}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchToggle={() => {
            setSearchOpen((open) => {
              if (open) setSearchQuery("");
              return !open;
            });
          }}
          onSearchClose={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
          matchCount={filteredMessages.length}
        />

        <div ref={messagesScrollRef} className="cm-chat-messages bg-[color:var(--bg)]">
          {loading ? (
            <div className="cm-chat-empty gap-2 p-6 text-sm text-[color:var(--muted)]">
              <div>Загрузка...</div>
              <ChatSkeleton />
            </div>
          ) : loadError ? (
            <div className="cm-chat-empty gap-2 p-6 text-center text-sm text-[color:var(--danger)]">
              {loadError}
            </div>
          ) : messages.length === 0 ? (
            <div className="cm-chat-empty gap-3 p-6 text-center">
              <div className="text-4xl" aria-hidden>{"\u{1F4AC}"}</div>
              <div className="text-sm font-semibold text-[color:var(--fg)]">Сообщений пока нет</div>
              <div className="text-xs text-[color:var(--muted)]">Напишите первое сообщение ниже.</div>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="cm-chat-empty gap-3 p-6 text-center">
              <IconSearch className="h-8 w-8 text-[color:var(--muted2)]" aria-hidden />
              <div className="text-sm font-semibold text-[color:var(--fg)]">Ничего не найдено</div>
              <div className="text-xs text-[color:var(--muted)]">Попробуйте другой запрос.</div>
            </div>
          ) : (
            <div className={kind === "dm" ? "space-y-4 px-6 py-5" : "space-y-2 px-5 py-4"}>
              {visibleMessages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  users={users}
                  conversationType={apiConversation.type}
                  conversationId={apiConversation.id}
                  variant={messageVariant}
                  currentUserId={me.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="cm-chat-composer bg-[color:var(--panel)]">
          {sendError && (
            <div className="border-b border-[color:var(--border)] bg-[color:var(--dangerBg)] px-5 py-2 text-xs text-[color:var(--danger)]">
              {sendError}
            </div>
          )}
          <Composer onSend={handleSend} disabled={!apiConversation || sending} />
        </div>
      </div>

      {panel && (
        <aside className="h-full w-[300px] flex-shrink-0 min-h-0 overflow-hidden border-l border-[color:var(--border)]">
          <RightPanel
            kind={kind}
            panel={panel}
            channelMeta={channelMeta}
            groupMeta={groupMeta}
          />
        </aside>
      )}

      {threadMessageId && apiConversation && (
        <div className="fixed inset-y-0 right-0 z-40 w-[400px] border-l border-[color:var(--border)] bg-[color:var(--panel)] shadow-paper backdrop-blur">
          <ThreadPanel
            conversationMessages={messages}
            rootMessageId={threadMessageId}
            users={users}
            conversationType={apiConversation.type}
            conversationId={apiConversation.id}
            onSent={loadMessages}
          />
        </div>
      )}
    </div>
  );
}
