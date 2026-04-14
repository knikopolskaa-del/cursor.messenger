import React, { useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { users, messagesByConversationKey } from "../mock.js";
import { cx, getUser, formatTime } from "../lib/utils.js";
import { Avatar, Button, Card } from "./ui.jsx";

// ── Скелетон загрузки чата ─────────────────────────────────────────────────
// Показывается при переходе между чатами (loading-state).

export function ChatSkeleton() {
  return (
    <div className="animate-pulse space-y-5 px-5 py-4">
      {[80, 60, 90, 50, 70].map((w, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-white/5" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 w-28 rounded bg-white/5" />
            <div className="h-2.5 rounded bg-white/5" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded bg-white/5" style={{ width: `${w * 0.6}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Одно сообщение ─────────────────────────────────────────────────────────

export function Message({ message }) {
  const author = getUser(message.authorId);
  return (
    <div className="group flex gap-3 rounded-xl border border-transparent p-3 hover:border-white/10 hover:bg-white/[0.02]">
      <Avatar user={author} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-white/95">{author.name}</span>
          <span className="text-xs text-white/40">{formatTime(message.createdAt)}</span>
          {message.replyToId && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
              ответ
            </span>
          )}
        </div>

        <div className="mt-1 whitespace-pre-wrap text-sm text-white/85">{message.text}</div>

        {message.attachments?.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">
                    {a.type === "image" ? "🖼️" : a.type === "video" ? "🎬" : "📄"} {a.name}
                  </div>
                  <div className="text-[11px] text-white/40">{a.size}</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/65 hover:bg-white/10"
                >
                  Просмотреть
                </button>
              </div>
            ))}
          </div>
        )}

        {message.reactions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/70"
              >
                {r.emoji} <span className="text-white/40">{r.userIds.length}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-1.5 hidden gap-2 group-hover:flex">
          <Button to={`?thread=${message.id}`} variant="ghost" size="sm">↪ Тред</Button>
          <Button to="/app/saved" variant="ghost" size="sm">☆ Сохранить</Button>
        </div>
      </div>
    </div>
  );
}

// ── Поле ввода сообщения ───────────────────────────────────────────────────

export function Composer() {
  const [text, setText] = useState("");
  const isEmpty = !text.trim();

  return (
    <div className="border-t border-white/10 p-4">
      <div
        className={cx(
          "flex items-end gap-3 rounded-xl border bg-white/[0.03] p-3 transition",
          isEmpty ? "border-white/10" : "border-indigo-400/30",
        )}
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение…"
          className="min-h-[44px] w-full resize-none bg-transparent text-sm text-white/85 placeholder:text-white/30 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="h-9 rounded-lg bg-white/5 px-3 text-xs text-white/65 hover:bg-white/10"
          >
            Прикрепить
          </button>
          <button
            type="button"
            disabled={isEmpty}
            className={cx(
              "h-9 rounded-lg px-3 text-xs font-semibold transition",
              isEmpty
                ? "bg-indigo-500/30 text-white/30 cursor-not-allowed"
                : "bg-indigo-500 text-white hover:bg-indigo-400",
            )}
          >
            Отправить
          </button>
        </div>
      </div>
      {isEmpty && (
        <div className="mt-1 text-right text-[11px] text-white/25">
          Введите текст, чтобы отправить
        </div>
      )}
    </div>
  );
}

// ── Правая информационная панель ───────────────────────────────────────────

export function RightPanel({ kind, panel }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const panelTitles = {
    info: "Информация",
    members: "Участники",
    pins: "Закреплённые",
    files: "Файлы",
  };

  const closePanel = () => {
    const next = new URLSearchParams(sp);
    next.delete("panel");
    navigate({ search: next.toString() }, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold">{panelTitles[panel] ?? "Информация"}</div>
        {panel && (
          <button
            type="button"
            onClick={closePanel}
            className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/65 hover:bg-white/10"
          >
            Закрыть
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-1.5">
          {[["info", "Инфо"], ["members", "Участники"], ["pins", "Закреплённые"], ["files", "Файлы"]].map(
            ([key, label]) => (
              <Button key={key} to={`?panel=${key}`} variant="ghost" size="sm">
                {label}
              </Button>
            ),
          )}
        </div>

        {panel === "members" && (
          <div className="space-y-2">
            {users.slice(0, 3).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2">
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{u.name}</div>
                  <div className="text-[11px] text-white/40">{u.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === "files" && (
          <div className="space-y-2">
            {[{ name: "spec-v1.pdf", size: "842 KB" }, { name: "layout.png", size: "1.4 MB" }].map((f) => (
              <div key={f.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <span className="text-lg">📄</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{f.name}</div>
                  <div className="text-[11px] text-white/40">{f.size}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === "pins" && (
          <div className="text-xs text-white/55">Закреплённых сообщений нет.</div>
        )}

        {(panel === "info" || !panel) && kind === "channel" && (
          <div className="text-xs text-white/55">
            Тема канала и основная информация будут здесь.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Боковая панель треда ───────────────────────────────────────────────────

export function ThreadPanel({ conversationKey, rootMessageId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const root = (messagesByConversationKey[conversationKey] ?? []).find(
    (m) => m.id === rootMessageId,
  );

  const close = () => {
    const sp = new URLSearchParams(location.search);
    sp.delete("thread");
    navigate({ search: sp.toString() }, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold">Тред</div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/65 hover:bg-white/10"
        >
          Закрыть
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {root ? (
          <Card title="Исходное сообщение">
            <div className="text-sm text-white/80">{root.text}</div>
          </Card>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Сообщение не найдено.
          </div>
        )}
        <Card title="Ответы">
          <div className="space-y-2 text-sm text-white/65">
            <div className="rounded-lg bg-white/5 p-3">Ответ 1…</div>
            <div className="rounded-lg bg-white/5 p-3">Ответ 2…</div>
          </div>
        </Card>
      </div>

      <div className="border-t border-white/10 p-4">
        <textarea
          rows={2}
          placeholder="Ответить в треде…"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
        />
      </div>
    </div>
  );
}
