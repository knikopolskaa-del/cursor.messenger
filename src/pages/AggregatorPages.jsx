import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { formatTime, pickUser, userStub } from "../lib/utils.js";
import { appPathForConversation } from "../lib/chatApi.js";
import { Card, Button, PageHeader, Avatar } from "../components/ui.jsx";

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="mt-2 text-sm font-semibold text-white/75">{title}</div>
      <div className="mt-1 text-xs text-white/45">{text}</div>
    </div>
  );
}

export function ThreadsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Треды" />
      <div className="mt-4">
        <EmptyState
          icon="*"
          title="Скоро"
          text="Список тредов с бэкенда будет добавлен позже. Открывайте тред через «Тред» у сообщения."
        />
      </div>
    </div>
  );
}

export function MentionsPage() {
  const { token, me, directs, users } = useMessenger();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await api.getActivities(token, false);
        if (!cancelled) {
          setItems(
            (list ?? []).filter((a) => a.type === "mention" || a.type === "reaction"),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setLoadError(api.formatApiError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="p-6">
      <PageHeader title="Упоминания и реакции" />
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-sm text-white/45">Загрузка...</div>
        ) : loadError ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="*"
            title="Нет активности"
            text="Когда вас упомянут или отреагируют — увидите здесь."
          />
        ) : (
          items.map((a) => {
            const actor = pickUser(users, a.actorId);
            const path =
              a.conversationType && a.conversationId
                ? appPathForConversation(a.conversationType, a.conversationId, me.id, directs)
                : "/app";
            const emoji = a.payload?.emoji;
            const title = a.type === "mention" ? "Упоминание" : "Реакция";
            const body =
              a.type === "mention"
                ? a.payload?.text ?? "Вас упомянули"
                : `${actor?.name ?? "Кто-то"} отреагировал ${emoji ?? ""}`;
            return (
              <Card
                key={a.id}
                title={title}
                subtitle={`${formatTime(a.createdAt)}${actor ? ` · ${actor.name}` : ""}`}
                right={
                  <Button to={`${path}?thread=${a.messageId ?? ""}`} variant="ghost" size="sm">
                    Открыть
                  </Button>
                }
              >
                <div className="text-sm text-white/70">{body}</div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SavedPage() {
  const navigate = useNavigate();
  const { token, me, directs, users } = useMessenger();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await api.getSaved(token);
        if (!cancelled) setItems(list ?? []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setLoadError(api.formatApiError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="p-6">
      <PageHeader title="Сохранённое" />
      <div className="mt-4 grid gap-3">
        {loading ? (
          <div className="text-sm text-white/45">Загрузка...</div>
        ) : loadError ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="*"
            title="Пока ничего не сохранено"
            text="Нажмите «Сохранить» у сообщения в чате — запись появится здесь."
          />
        ) : (
          items.map((s) => {
            const path = appPathForConversation(s.conversationType, s.conversationId, me.id, directs);
            const goTarget = `${path}${
              s.type === "message" && s.messageId
                ? `${path.includes("?") ? "&" : "?"}focus=${encodeURIComponent(s.messageId)}`
                : ""
            }`;
            const author =
              s.type === "message" && s.authorId
                ? pickUser(users, s.authorId) ?? userStub(s.authorId)
                : null;
            const preview =
              s.preview ||
              (s.type === "file" ? s.fileName || "Файл" : "") ||
              (s.type === "message" ? "Сообщение" : "");

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(goTarget)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                {author ? (
                  <Avatar user={author} size="sm" />
                ) : (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm text-white/40" aria-hidden>
                    {"\u{1F4CE}"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {author ? (
                      <span className="text-sm font-semibold text-white/90">{author.name}</span>
                    ) : (
                      <span className="text-sm font-semibold text-white/90">Файл</span>
                    )}
                    <span className="text-[11px] text-white/35">{formatTime(s.savedAt)}</span>
                  </div>
                  <div
                    className={`mt-1 line-clamp-2 text-sm ${
                      s.previewUnavailable ? "text-white/40" : "text-white/70"
                    }`}
                  >
                    {preview}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
