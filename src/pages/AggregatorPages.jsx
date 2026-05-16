import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { formatTime, pickUser, userStub } from "../lib/utils.js";
import { appPathForConversation } from "../lib/chatApi.js";
import { Card, Button, PageHeader, Avatar } from "../components/ui.jsx";

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] p-8 text-center shadow-paper backdrop-blur">
      <div className="text-3xl">{icon}</div>
      <div className="mt-2 font-proto text-2xl font-bold leading-[0.95] tracking-tight text-[color:var(--fg)]">
        {title}
      </div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{text}</div>
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
          <div className="text-sm text-[color:var(--muted)]">Загрузка...</div>
        ) : loadError ? (
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--dangerBg)] px-5 py-4 text-sm font-semibold text-[color:var(--danger)] shadow-paper backdrop-blur">
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
                <div className="text-sm text-[color:var(--muted)]">{body}</div>
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
  const location = useLocation();
  const { token, me, directs, users } = useMessenger();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const reloadSaved = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    try {
      const list = await api.getSaved(token);
      setItems(list ?? []);
    } catch (e) {
      setItems([]);
      setLoadError(api.formatApiError(e));
    }
  }, [token]);

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
  }, [token, location.pathname]);

  return (
    <div className="p-6">
      <PageHeader title="Сохранённое" />
      <div className="mt-4 grid gap-3">
        {loading ? (
          <div className="text-sm text-[color:var(--muted)]">Загрузка...</div>
        ) : loadError ? (
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--dangerBg)] px-5 py-4 text-sm font-semibold text-[color:var(--danger)] shadow-paper backdrop-blur">
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
              <div
                key={s.id}
                data-saved-id={s.id}
                className="flex w-full items-start gap-2 rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] p-3 pl-5 shadow-paper backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => navigate(goTarget)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl py-2 text-left transition hover:bg-[color:var(--panel)]/80"
                >
                  {author ? (
                    <Avatar user={author} size="sm" />
                  ) : (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] text-sm text-[color:var(--muted)]" aria-hidden>
                      {"\u{1F4CE}"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {author ? (
                        <span className="text-sm font-semibold text-[color:var(--fg)]">{author.name}</span>
                      ) : (
                        <span className="text-sm font-semibold text-[color:var(--fg)]">Файл</span>
                      )}
                      <span className="text-[11px] text-[color:var(--muted2)]">{formatTime(s.savedAt)}</span>
                    </div>
                    <div
                      className={`mt-1 line-clamp-2 text-sm ${
                        s.previewUnavailable ? "text-[color:var(--muted2)]" : "text-[color:var(--muted)]"
                      }`}
                    >
                      {preview}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="Удалить из сохранённого"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!token) return;
                    try {
                      await api.deleteSaved(token, s.id);
                      await reloadSaved();
                    } catch (err) {
                      setLoadError(api.formatApiError(err));
                    }
                  }}
                  className="flex-shrink-0 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]/85 hover:bg-[color:var(--surface2)]/90"
                >
                  Удалить
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
