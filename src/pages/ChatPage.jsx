import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { channels, groups, messagesByConversationKey } from "../mock.js";
import { getUser } from "../lib/utils.js";
import { Button } from "../components/ui.jsx";
import { Message, Composer, RightPanel, ThreadPanel, ChatSkeleton } from "../components/ChatComponents.jsx";

export function AppIndexRedirect() {
  return <Navigate to="/app/c/c_general" replace />;
}

export default function ChatPage({ kind }) {
  const params = useParams();
  const [sp] = useSearchParams();
  const threadMessageId = sp.get("thread");
  const panel = sp.get("panel");

  // ── Loading-state при переходе между чатами ──────────────────────────────
  // Имитирует задержку загрузки истории — в реальном продукте здесь будет
  // запрос к API. Сбрасывается при каждом изменении conversationKey.
  const [loading, setLoading] = useState(true);

  const conversationKey = useMemo(() => {
    if (kind === "channel") return `c:${params.id}`;
    if (kind === "dm") return `d:${params.id}`;
    if (kind === "group") return `g:${params.id}`;
    return "";
  }, [kind, params.id]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [conversationKey]);

  const title = useMemo(() => {
    if (kind === "channel") {
      const c = channels.find((x) => x.id === params.id);
      return c ? `#${c.title}` : "Канал";
    }
    if (kind === "dm") {
      const u = getUser(params.id);
      return u ? u.name : "Личное сообщение";
    }
    if (kind === "group") {
      const g = groups.find((x) => x.id === params.id);
      return g ? g.title : "Группа";
    }
    return "Чат";
  }, [kind, params.id]);

  const kindLabel =
    kind === "channel" ? "Канал" : kind === "dm" ? "Личное сообщение" : "Группа";

  const messages = messagesByConversationKey[conversationKey] ?? [];

  return (
    <div className="grid h-full grid-cols-[1fr_300px]">

      {/* Основная колонка */}
      <div className="flex min-h-0 flex-col border-r border-white/10">
        {/* Хедер */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{title}</div>
            <div className="text-xs text-white/45">{kindLabel}</div>
          </div>
          <div className="flex gap-2">
            <Button to="?panel=info" variant="ghost" size="sm">Инфо</Button>
            <Button to="?panel=files" variant="ghost" size="sm">Файлы</Button>
          </div>
        </div>

        {/* Лента сообщений: loading / empty / list */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            // loading-state: скелетон-анимация
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            // empty-state
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-4xl">💬</div>
              <div className="text-sm font-semibold text-white/70">Сообщений пока нет</div>
              <div className="text-xs text-white/40">
                Начните переписку — напишите первое сообщение.
              </div>
            </div>
          ) : (
            // список сообщений
            <div className="space-y-2 px-5 py-4">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        <Composer />
      </div>

      {/* Правая панель */}
      <RightPanel kind={kind} panel={panel} />

      {/* Тред-оверлей */}
      {threadMessageId && (
        <div className="fixed inset-y-0 right-0 z-40 w-[400px] border-l border-white/10 bg-slate-950">
          <ThreadPanel
            conversationKey={conversationKey}
            rootMessageId={threadMessageId}
          />
        </div>
      )}
    </div>
  );
}
