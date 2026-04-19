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

export function AppIndexRedirect() {
  const { channels } = useMessenger();
  const first = channels[0]?.id;
  if (!first) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-sm font-medium text-white/70">Нет каналов</div>
        <div className="text-xs text-white/45">Создайте канал через «+ Создать» в сайдбаре.</div>
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
  const focusId = sp.get("focus");
  const threadMessageId = sp.get("thread");
  const panel = sp.get("panel");

  const { token, me, users, channels, groups, directs } = useMessenger();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

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

  if (kind === "dm" && !apiConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/50">
        <div>Диалог с этим пользователем ещё не создан.</div>
        <Button to="/app/new/dm">Написать</Button>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[1fr_300px]">
      <div className="flex min-h-0 flex-col border-r border-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{title}</div>
            <div className="text-xs text-white/45">{kindLabel}</div>
          </div>
          <div className="flex gap-2">
            <Button to="?panel=info" variant="ghost" size="sm">
              Инфо
            </Button>
            <Button to="?panel=files" variant="ghost" size="sm">
              Файлы
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-white/50">
              <div>Загрузка...</div>
              <ChatSkeleton />
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-rose-300">
              {loadError}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-4xl" aria-hidden>{"\u{1F4AC}"}</div>
              <div className="text-sm font-semibold text-white/70">Сообщений пока нет</div>
              <div className="text-xs text-white/40">Напишите первое сообщение ниже.</div>
            </div>
          ) : (
            <div className="space-y-2 px-5 py-4">
              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  users={users}
                  conversationType={apiConversation.type}
                  conversationId={apiConversation.id}
                />
              ))}
            </div>
          )}
        </div>

        {sendError && (
          <div className="border-t border-rose-400/20 bg-rose-400/10 px-5 py-2 text-xs text-rose-200">
            {sendError}
          </div>
        )}
        <Composer onSend={handleSend} disabled={!apiConversation || sending} />
      </div>

      <RightPanel
        kind={kind}
        panel={panel}
        channelMeta={channelMeta}
        groupMeta={groupMeta}
      />

      {threadMessageId && apiConversation && (
        <div className="fixed inset-y-0 right-0 z-40 w-[400px] border-l border-white/10 bg-slate-950">
          <ThreadPanel
            conversationMessages={messages}
            rootMessageId={threadMessageId}
            users={users}
            conversationType={apiConversation.type}
            conversationId={apiConversation.id}
          />
        </div>
      )}
    </div>
  );
}
