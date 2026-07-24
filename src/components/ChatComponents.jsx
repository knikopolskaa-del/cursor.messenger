import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { pickUser, userStub, formatTime, cx } from "../lib/utils.js";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { absoluteAssetUrl, formatAttachmentSize } from "../lib/chatApi.js";
import { CHAT_MEDIA_MENUS } from "./ChatHeader.jsx";
import { Avatar, Button, Card } from "./ui.jsx";
import { IconImage, IconSend } from "../design/icons.jsx";

/** Изображения с URL `/files/…` грузим с Bearer, остальные — как есть. */
export function AuthScopedImage({ url, token, alt, className, onError }) {
  const needsAuth = typeof url === "string" && url.startsWith("/files/");
  const abs = absoluteAssetUrl(url);
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!url) {
      setSrc("");
      return undefined;
    }
    if (!needsAuth) {
      setSrc(abs);
      return undefined;
    }
    if (!token) {
      setSrc("");
      return undefined;
    }
    // Don't use fetch() to `/files/{id}`: backend redirects to Object Storage and
    // browser blocks that redirect in XHR/fetch due to CORS.
    // Instead ask backend for presigned URL (same-origin JSON).
    let cancelled = false;
    (async () => {
      try {
        const out = await api.getFileUrl(token, url);
        if (!cancelled) setSrc(out?.url || "");
      } catch {
        if (!cancelled) setSrc("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [abs, needsAuth, token, url]);
  if (!src) {
    return (
      <div
        className={cx(
          "animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]",
          className,
        )}
        aria-hidden
      />
    );
  }
  return <img src={src} alt={alt} className={className} onError={onError} />;
}

function attachmentKindLabel(type) {
  if (type === "image") return "IMG";
  if (type === "video") return "VID";
  return "FILE";
}

function useAttachmentSrc(url, token) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc("");
    setFailed(false);
    if (!url) {
      setFailed(true);
      return undefined;
    }
    const needsAuth = typeof url === "string" && url.startsWith("/files/");
    if (!needsAuth) {
      setSrc(absoluteAssetUrl(url));
      return undefined;
    }
    if (!token) {
      setFailed(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const out = await api.getFileUrl(token, url);
        if (cancelled) return;
        if (out?.url) setSrc(out.url);
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  return { src, failed, loading: Boolean(url) && !failed && !src };
}

function MessageAttachmentFileRow({ attachment: a, token, unavailable = false }) {
  const label = attachmentKindLabel(a.type);
  return (
    <div className="flex max-w-full items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2.5 shadow-paper backdrop-blur">
      <span
        className={cx(
          "inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--accent)]",
          a.type === "image" && "text-[color:var(--accent)]",
        )}
        aria-hidden
      >
        {a.type === "image" ? (
          <IconImage className="h-5 w-5" />
        ) : (
          <span className="text-[10px] font-bold">{label}</span>
        )}
      </span>
      <button
        type="button"
        onClick={() =>
          a.url && !unavailable
            ? openAttachmentInBrowser(a.url, token).catch(() => {
                /* ignore */
              })
            : undefined
        }
        disabled={!a.url || unavailable}
        className={cx(
          "min-w-0 flex-1 text-left",
          a.url && !unavailable ? "cursor-pointer" : "cursor-default",
        )}
        title={a.url && !unavailable ? "Открыть" : undefined}
      >
        <div className="truncate text-xs font-semibold text-[color:var(--fg)]">
          {label} {a.name || "Файл"}
        </div>
        <div className="text-[11px] text-[color:var(--muted2)]">
          {a.size || formatAttachmentSize(a.sizeBytes)}
          {(!a.url || unavailable) && " · файл недоступен"}
        </div>
      </button>
      {a.url && !unavailable ? (
        <button
          type="button"
          onClick={() =>
            downloadAttachment(a.url, token, a.name).catch(() => {
              /* ignore */
            })
          }
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--fg)]/80 hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
          aria-label="Скачать"
          title="Скачать"
        >
          <DownloadIcon />
        </button>
      ) : null}
    </div>
  );
}

function MessageAttachmentImage({ attachment: a, token }) {
  const { src, failed, loading } = useAttachmentSrc(a.url, token);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [a.url]);

  if (failed || imgBroken) {
    return <MessageAttachmentFileRow attachment={a} token={token} unavailable />;
  }

  if (loading) {
    return (
      <div className="inline-flex min-h-32 min-w-44 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)]">
        <IconImage className="h-8 w-8 animate-pulse text-[color:var(--muted2)]" aria-hidden />
        <span className="sr-only">Загрузка изображения</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block max-w-full">
      <button
        type="button"
        onClick={() =>
          openAttachmentInBrowser(a.url, token).catch(() => {
            /* ignore */
          })
        }
        className="block"
        title="Открыть"
      >
        <img
          src={src}
          alt={a.name || "Изображение"}
          className="max-h-64 max-w-full rounded-2xl border border-[color:var(--border)] object-contain shadow-paper"
          onError={() => setImgBroken(true)}
        />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          downloadAttachment(a.url, token, a.name).catch(() => {
            /* ignore */
          });
        }}
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-black/30 text-white/85 backdrop-blur hover:bg-black/45"
        aria-label="Скачать"
        title="Скачать"
      >
        <DownloadIcon />
      </button>
    </div>
  );
}

function MessageAttachment({ attachment, token }) {
  if (attachment.type === "image" && attachment.url) {
    return <MessageAttachmentImage attachment={attachment} token={token} />;
  }
  return <MessageAttachmentFileRow attachment={attachment} token={token} />;
}

async function downloadAttachment(url, token, filename) {
  const href = String(url || "");
  const needsAuth = href.startsWith("/files/");
  const abs = absoluteAssetUrl(href);
  let finalUrl = abs;
  if (needsAuth) {
    const out = await api.getFileUrl(token, href);
    finalUrl = out?.url || "";
  }
  if (!finalUrl) throw new Error("Не удалось скачать файл");
  const a = document.createElement("a");
  a.href = finalUrl;
  a.download = filename || "download";
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
}

async function openAttachmentInBrowser(url, token) {
  const href = String(url || "");
  const needsAuth = href.startsWith("/files/");
  const abs = absoluteAssetUrl(href);
  let finalUrl = abs;
  if (needsAuth) {
    const out = await api.getFileUrl(token, href);
    finalUrl = out?.url || "";
  }
  if (!finalUrl) throw new Error("Не удалось открыть файл");
  window.open(finalUrl, "_blank", "noopener,noreferrer");
}

function DownloadIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M11 3a1 1 0 0 1 2 0v8.17l2.59-2.58a1 1 0 1 1 1.41 1.42l-4.3 4.29a1 1 0 0 1-1.4 0l-4.3-4.29a1 1 0 1 1 1.41-1.42L11 11.17V3Z" />
      <path d="M5 14a1 1 0 0 1 1 1v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 1 2 0v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function ChatSkeleton() {
  return (
    <div className="animate-pulse space-y-5 px-5 py-4">
      {[80, 60, 90, 50, 70].map((w, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-9 w-9 flex-shrink-0 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 w-28 rounded bg-[color:var(--panel)]" />
            <div className="h-2.5 rounded bg-[color:var(--panel)]" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded bg-[color:var(--panel)]" style={{ width: `${w * 0.6}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Message({
  message,
  users,
  conversationType,
  conversationId,
  variant = "thread",
  currentUserId,
}) {
  const { token } = useMessenger();
  const [saveHint, setSaveHint] = useState(null);
  const [saveErr, setSaveErr] = useState(null);
  const author = pickUser(users, message.authorId) ?? userStub(message.authorId);
  const isOwn = variant === "bubble" && currentUserId && message.authorId === currentUserId;
  const rawText = (message.text || "").replace(/\u2060/g, "").trim();
  const showText = rawText.length > 0;

  async function handleSaveMessage() {
    if (!token || !conversationType || !conversationId || !message.id) return;
    setSaveErr(null);
    try {
      await api.postSaved(token, {
        type: "message",
        messageId: message.id,
        conversationType,
        conversationId,
      });
      setSaveHint("Сохранено");
      setTimeout(() => setSaveHint(null), 2200);
    } catch (e) {
      setSaveErr(api.formatApiError(e));
      setTimeout(() => setSaveErr(null), 4000);
    }
  }

  if (variant === "bubble") {
    const hasAttachments = (message.attachments?.length ?? 0) > 0;

    return (
      <div
        data-message-id={message.id}
        className={cx("flex", isOwn ? "justify-end" : "justify-start")}
      >
        <div className={cx("max-w-[min(520px,85%)]", isOwn ? "text-right" : "text-left")}>
          {!isOwn && (
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <Avatar user={author} size="sm" />
              <span className="text-sm font-semibold text-[color:var(--fg)]">{author.name}</span>
              <span className="text-xs text-[color:var(--muted2)]">{formatTime(message.createdAt)}</span>
            </div>
          )}
          {(showText || hasAttachments) && (
            <div
              className={cx(
                "inline-block max-w-full text-left shadow-soft",
                hasAttachments && !showText ? "p-2" : "px-5 py-3.5",
                "rounded-[var(--radius-xl)] text-[15px] leading-relaxed",
                isOwn ? "cm-bubble-out rounded-br-md" : "cm-bubble-in rounded-bl-md",
              )}
            >
              {showText && <div className="whitespace-pre-wrap">{message.text}</div>}
              {hasAttachments && (
                <div className={cx("space-y-2", showText && "mt-2")}>
                  {message.attachments.map((a) => (
                    <MessageAttachment key={a.id ?? a.url ?? a.name} attachment={a} token={token} />
                  ))}
                </div>
              )}
            </div>
          )}
          {isOwn && (
            <div className="mt-1 px-1 text-xs text-[color:var(--muted2)]">{formatTime(message.createdAt)}</div>
          )}
          {(saveHint || saveErr) && (
            <div
              className={cx(
                "mt-1 px-1 text-xs",
                saveErr ? "text-[color:var(--danger)]" : "text-emerald-600/90",
              )}
            >
              {saveErr || saveHint}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-message-id={message.id}
      className="group flex gap-3 rounded-[var(--radius-xl)] border border-transparent p-3 hover:border-[color:var(--border)] hover:bg-[color:var(--panel)]/70"
    >
      <Avatar user={author} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-[color:var(--fg)]">{author.name}</span>
          <span className="text-xs text-[color:var(--muted2)]">{formatTime(message.createdAt)}</span>
          {message.replyToId && (
            <span className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-2 py-1 text-[10px] text-[color:var(--muted)]">
              ответ
            </span>
          )}
        </div>

        {showText && (
          <div className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--fg)]/90">{message.text}</div>
        )}

        {message.attachments?.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((a) => (
              <MessageAttachment key={a.id ?? a.url ?? a.name} attachment={a} token={token} />
            ))}
          </div>
        )}

        {message.reactions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] px-2 py-1 text-xs text-[color:var(--muted)]"
              >
                {r.emoji} <span className="text-[color:var(--muted2)]">{r.userIds.length}</span>
              </span>
            ))}
          </div>
        )}

        {(saveHint || saveErr) && (
          <div
            className={cx(
              "mt-1 text-[11px]",
              saveErr ? "text-[color:var(--danger)]" : "text-emerald-600/90",
            )}
          >
            {saveErr || saveHint}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap gap-2">
          <Button to={`?thread=${message.id}`} variant="ghost" size="sm">
            Тред
          </Button>
          <button
            type="button"
            data-testid="save-message"
            onClick={handleSaveMessage}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]/85 hover:bg-[color:var(--surface2)]/90"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export function Composer({ onSend, disabled }) {
  const { token } = useMessenger();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);
  const hasText = Boolean(text.trim());
  const readyFiles = files.filter((f) => f.url && !f.error);
  const uploading = files.some((f) => f.uploading);
  const canSend = (hasText || readyFiles.length > 0) && !uploading && !disabled;

  async function handleSendClick() {
    if (!canSend || !onSend) return;
    const attachments = readyFiles.map((f) => ({
      type: f.type,
      name: f.name,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      url: f.url,
    }));
    const t = text.trim();
    setText("");
    setFiles([]);
    await onSend({ text: t, attachments });
  }

  async function onPickFiles(e) {
    const list = e.target.files;
    if (!list?.length || !token) return;
    const picked = Array.from(list);
    e.target.value = "";
    for (const file of picked) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setFiles((prev) => [
        ...prev,
        {
          key,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          type: (file.type || "").startsWith("image/") ? "image" : "file",
          url: "",
          uploading: true,
          error: "",
        },
      ]);
      try {
        const up = await api.postUpload(token, file);
        setFiles((prev) =>
          prev.map((f) =>
            f.key === key
              ? {
                  ...f,
                  uploading: false,
                  url: up.url,
                  type: up.type || f.type,
                  mimeType: up.mimeType || f.mimeType,
                  sizeBytes: up.sizeBytes ?? f.sizeBytes,
                }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.key === key
              ? { ...f, uploading: false, error: api.formatApiError(err) }
              : f,
          ),
        );
      }
    }
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  return (
    <div className="border-t border-[color:var(--border)] bg-[color:var(--panel)] p-5 backdrop-blur">
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={onPickFiles}
      />
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.key}
              className="flex max-w-[240px] items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-[11px] shadow-paper"
            >
              <span className="min-w-0 flex-1 truncate text-[color:var(--fg)]/85">{f.name}</span>
              <span className="flex-shrink-0 text-[color:var(--muted2)]">{formatAttachmentSize(f.sizeBytes)}</span>
              {f.uploading && <span className="text-[color:var(--muted2)]">…</span>}
              {f.error && <span className="text-[color:var(--danger)]" title={f.error}>!</span>}
              {!f.uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(f.key)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                  aria-label="Убрать вложение"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 shadow-soft">
        <button
          type="button"
          disabled={disabled || !token}
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendClick();
            }
          }}
          placeholder="Написать сообщение…"
          className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-[15px] text-[color:var(--fg)] placeholder:text-[color:var(--muted2)] focus:outline-none"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={handleSendClick}
          className={cx(
            "inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
            canSend
              ? "cm-btn-accent shadow-none"
              : "cursor-not-allowed bg-[color:var(--accent-soft)] text-[color:var(--muted2)]",
          )}
          aria-label="Отправить"
        >
          <IconSend className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function RightPanel({ kind, panel, channelMeta, groupMeta }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { users } = useMessenger();

  const panelTitles = {
    info: "Информация",
    members: "Участники",
    pins: "Закреплённые",
    docs: "Документы",
    video: "Видео",
    photo: "Фото",
    links: "Ссылки",
    audio: "Аудио",
  };

  const mediaPanel = CHAT_MEDIA_MENUS.find((item) => item.key === panel);

  const closePanel = () => {
    const next = new URLSearchParams(sp);
    next.delete("panel");
    navigate({ search: next.toString() }, { replace: true });
  };

  return (
    <div className="flex h-full flex-col text-[color:var(--fg)]">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
        <div className="text-sm font-semibold">{panelTitles[panel] ?? "Информация"}</div>
        <button
          type="button"
          onClick={closePanel}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] px-2 py-1 text-xs text-[color:var(--muted)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--fg)]"
        >
          Закрыть
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-4">
        {panel === "members" && (
          <div className="space-y-2">
            {users.slice(0, 8).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-[color:var(--surface2)] p-2">
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{u.name}</div>
                  <div className="truncate text-[11px] text-[color:var(--muted2)]">{u.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === "pins" && (
          <div className="text-xs text-[color:var(--muted)]">Закреплённых сообщений нет.</div>
        )}

        {mediaPanel && (() => {
          const MediaIcon = mediaPanel.icon;
          return (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--border)] bg-[color:var(--surface2)]/60 px-4 py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
              <MediaIcon className="h-5 w-5" />
            </span>
            <div className="text-sm font-semibold text-[color:var(--fg)]">{mediaPanel.label}</div>
            <div className="text-xs text-[color:var(--muted)]">
              Пока нет файлов этого типа в этом чате.
            </div>
          </div>
          );
        })()}

        {(panel === "info" || !panel) && kind === "channel" && (
          <div className="space-y-4 text-xs text-[color:var(--muted)]">
            <div>{channelMeta?.topic || "Тема канала и основная информация будут здесь."}</div>
            <div className="flex flex-wrap gap-2">
              <Button to="?panel=members" variant="ghost" size="sm">
                Участники
              </Button>
              <Button to="?panel=pins" variant="ghost" size="sm">
                Закреплённые
              </Button>
            </div>
          </div>
        )}

        {(panel === "info" || !panel) && kind === "group" && (
          <div className="space-y-4 text-xs text-[color:var(--muted)]">
            <div>Участников: {groupMeta?.memberIds?.length ?? 0}</div>
            <div className="flex flex-wrap gap-2">
              <Button to="?panel=members" variant="ghost" size="sm">
                Участники
              </Button>
              <Button to="?panel=pins" variant="ghost" size="sm">
                Закреплённые
              </Button>
            </div>
          </div>
        )}

        {(panel === "info" || !panel) && kind === "dm" && (
          <div className="space-y-4 text-xs text-[color:var(--muted)]">
            <div>Личная переписка.</div>
            <Button to="?panel=pins" variant="ghost" size="sm">
              Закреплённые
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThreadPanel({
  conversationMessages,
  rootMessageId,
  users,
  conversationType,
  conversationId,
  onSent,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useMessenger();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const root = (conversationMessages ?? []).find((m) => m.id === rootMessageId);
  const replies = (conversationMessages ?? []).filter((m) => m.replyToId === rootMessageId);
  const canSend = Boolean(text.trim()) && !sending && Boolean(token) && Boolean(rootMessageId);

  const close = () => {
    const sp = new URLSearchParams(location.search);
    sp.delete("thread");
    navigate({ search: sp.toString() }, { replace: true });
  };

  async function handleSend() {
    if (!canSend || !conversationType || !conversationId) return;
    setSending(true);
    setSendError(null);
    try {
      await api.postMessage(token, conversationType, conversationId, {
        text: text.trim(),
        parentMessageId: rootMessageId,
      });
      setText("");
      await onSent?.();
    } catch (e) {
      setSendError(api.formatApiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col text-[color:var(--fg)]">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
        <div className="text-sm font-semibold">Тред</div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] px-2 py-1 text-xs text-[color:var(--muted)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--fg)]"
        >
          Закрыть
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {root ? (
          <Card title="Исходное сообщение">
            <Message
              message={root}
              users={users}
              conversationType={conversationType}
              conversationId={conversationId}
            />
          </Card>
        ) : (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)]/60 p-4 text-sm text-[color:var(--muted)]">
            Сообщение не найдено.
          </div>
        )}
        <Card title="Ответы">
          <div className="space-y-3">
            {replies.length === 0 ? (
              <div className="text-sm text-[color:var(--muted)]">Пока нет ответов в треде.</div>
            ) : (
              replies.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  users={users}
                  conversationType={conversationType}
                  conversationId={conversationId}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="border-t border-[color:var(--border)] bg-[color:var(--panel)] p-4 backdrop-blur">
        {sendError && (
          <div className="mb-2 text-xs text-[color:var(--danger)]">{sendError}</div>
        )}
        <div className="flex items-center gap-3 rounded-[var(--radius-pill)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 shadow-soft">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ответить в треде…"
            className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-[15px] text-[color:var(--fg)] placeholder:text-[color:var(--muted2)] focus:outline-none"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className={cx(
              "inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
              canSend
                ? "cm-btn-accent shadow-none"
                : "cursor-not-allowed bg-[color:var(--accent-soft)] text-[color:var(--muted2)]",
            )}
            aria-label="Отправить"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
