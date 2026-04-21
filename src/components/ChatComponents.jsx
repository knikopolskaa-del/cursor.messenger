import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { pickUser, userStub, formatTime, cx } from "../lib/utils.js";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { absoluteAssetUrl, formatAttachmentSize } from "../lib/chatApi.js";
import { Avatar, Button, Card, Input } from "./ui.jsx";

/** Изображения с URL `/files/…` грузим с Bearer, остальные — как есть. */
export function AuthScopedImage({ url, token, alt, className }) {
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
  return <img src={src} alt={alt} className={className} />;
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
}) {
  const { token } = useMessenger();
  const [saveHint, setSaveHint] = useState(null);
  const [saveErr, setSaveErr] = useState(null);
  const author = pickUser(users, message.authorId) ?? userStub(message.authorId);
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
              <div key={a.id ?? a.url} className="space-y-1.5">
                {a.type === "image" && a.url ? (
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
                      <AuthScopedImage
                        url={a.url}
                        token={token}
                        alt={a.name || ""}
                        className="max-h-64 max-w-full rounded-2xl border border-[color:var(--border)] object-contain shadow-paper"
                      />
                    </button>
                    {a.url && (
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
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 shadow-paper backdrop-blur">
                    <button
                      type="button"
                      onClick={() =>
                        a.url
                          ? openAttachmentInBrowser(a.url, token).catch(() => {
                              /* ignore */
                            })
                          : undefined
                      }
                      disabled={!a.url}
                      className={cx(
                        "min-w-0 flex-1 text-left",
                        a.url ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                      )}
                      title={a.url ? "Открыть" : "Нет ссылки"}
                    >
                      <div className="truncate text-xs font-semibold">
                        {a.type === "image" ? "IMG" : a.type === "video" ? "VID" : "FILE"} {a.name}
                      </div>
                      <div className="text-[11px] text-[color:var(--muted2)]">{a.size}</div>
                    </button>
                    {a.url ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttachment(a.url, token, a.name).catch(() => {
                            /* ignore */
                          });
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--fg)]/80 hover:bg-[color:var(--surface2)]/90"
                        aria-label="Скачать"
                        title="Скачать"
                      >
                        <DownloadIcon />
                      </button>
                    ) : (
                      <span className="text-[11px] text-[color:var(--muted2)]">Нет ссылки</span>
                    )}
                  </div>
                )}
              </div>
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

        <div className="mt-1.5 hidden gap-2 group-hover:flex">
          <Button to={`?thread=${message.id}`} variant="ghost" size="sm">
            Тред
          </Button>
          <button
            type="button"
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
    <div className="border-t border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-paper backdrop-blur">
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
      <div
        className={cx(
          "flex items-end gap-3 rounded-[var(--radius-xl)] border bg-[color:var(--surface)] p-3 shadow-paper transition",
          canSend ? "border-[color:var(--primaryBorder)]" : "border-[color:var(--border)]",
        )}
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение…"
          className="min-h-[44px] w-full resize-none bg-transparent text-sm text-[color:var(--fg)]/90 placeholder:text-[color:var(--muted2)] focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || !token}
            onClick={() => fileRef.current?.click()}
            className="h-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-4 text-xs font-semibold text-[color:var(--fg)]/80 hover:bg-[color:var(--surface2)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Прикрепить
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSendClick}
            className={cx(
              "h-11 rounded-2xl border px-4 text-xs font-semibold transition",
              !canSend
                ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--primaryBg)] text-[color:var(--muted2)]"
                : "border-[color:var(--primaryBorder)] bg-[color:var(--primaryBg)] text-[color:var(--primary)] hover:bg-[color:var(--primaryBg)]/90",
            )}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({ kind, panel, channelMeta, groupMeta }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { users, me, token, refreshWorkspace } = useMessenger();
  const [iconDraft, setIconDraft] = useState("");
  const [iconBusy, setIconBusy] = useState(false);
  const [iconNote, setIconNote] = useState(null);
  const iconFileRef = useRef(null);

  const canEditChannelIcon =
    kind === "channel" &&
    channelMeta &&
    (me.userType === "admin" || channelMeta.createdBy === me.id);
  const canEditGroupIcon =
    kind === "group" && groupMeta && (me.userType === "admin" || groupMeta.createdBy === me.id);
  const showIconEditor = canEditChannelIcon || canEditGroupIcon;

  useEffect(() => {
    if (kind === "channel" && channelMeta) setIconDraft(channelMeta.iconUrl || "");
    else if (kind === "group" && groupMeta) setIconDraft(groupMeta.iconUrl || "");
    else setIconDraft("");
  }, [kind, channelMeta?.id, channelMeta?.iconUrl, groupMeta?.id, groupMeta?.iconUrl]);

  async function saveIconUrl() {
    if (!token || !showIconEditor) return;
    setIconBusy(true);
    setIconNote(null);
    try {
      if (canEditChannelIcon) {
        await api.patchChannel(token, channelMeta.id, { iconUrl: iconDraft.trim() });
      } else if (canEditGroupIcon) {
        await api.patchGroup(token, groupMeta.id, { iconUrl: iconDraft.trim() });
      }
      await refreshWorkspace();
      setIconNote("Сохранено");
      setTimeout(() => setIconNote(null), 2000);
    } catch (e) {
      setIconNote(api.formatApiError(e));
    } finally {
      setIconBusy(false);
    }
  }

  async function onIconFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setIconBusy(true);
    setIconNote(null);
    try {
      const up = await api.postUpload(token, file);
      setIconDraft(up.url || "");
    } catch (err) {
      setIconNote(api.formatApiError(err));
    } finally {
      setIconBusy(false);
    }
  }

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
            {users.slice(0, 8).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2">
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{u.name}</div>
                  <div className="truncate text-[11px] text-white/40">{u.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === "files" && (
          <div className="space-y-2">
            {[{ name: "spec-v1.pdf", size: "842 KB" }, { name: "layout.png", size: "1.4 MB" }].map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2"
              >
                <span className="text-lg">DOC</span>
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
          <div className="space-y-3 text-xs text-white/55">
            <div>{channelMeta?.topic || "Тема канала и основная информация будут здесь."}</div>
            {showIconEditor && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-white/70">
                <div className="mb-2 font-semibold text-white/80">Иконка канала (URL)</div>
                <Input value={iconDraft} onChange={setIconDraft} placeholder="https://… или /files/…" />
                <input
                  ref={iconFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onIconFile}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={iconBusy}
                    onClick={() => iconFileRef.current?.click()}
                    className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    Загрузить файл
                  </button>
                  <button
                    type="button"
                    disabled={iconBusy}
                    onClick={saveIconUrl}
                    className="rounded-lg bg-indigo-500/80 px-2 py-1 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-40"
                  >
                    Сохранить URL
                  </button>
                </div>
                {iconNote && (
                  <div
                    className={cx(
                      "mt-2 text-[11px]",
                      iconNote === "Сохранено" ? "text-emerald-300/90" : "text-rose-200/90",
                    )}
                  >
                    {iconNote}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(panel === "info" || !panel) && kind === "group" && (
          <div className="space-y-3 text-xs text-white/55">
            <div>Участников: {groupMeta?.memberIds?.length ?? 0}</div>
            {showIconEditor && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-white/70">
                <div className="mb-2 font-semibold text-white/80">Иконка группы (URL)</div>
                <Input value={iconDraft} onChange={setIconDraft} placeholder="https://… или /files/…" />
                <input
                  ref={iconFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onIconFile}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={iconBusy}
                    onClick={() => iconFileRef.current?.click()}
                    className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 disabled:opacity-40"
                  >
                    Загрузить файл
                  </button>
                  <button
                    type="button"
                    disabled={iconBusy}
                    onClick={saveIconUrl}
                    className="rounded-lg bg-indigo-500/80 px-2 py-1 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-40"
                  >
                    Сохранить URL
                  </button>
                </div>
                {iconNote && (
                  <div
                    className={cx(
                      "mt-2 text-[11px]",
                      iconNote === "Сохранено" ? "text-emerald-300/90" : "text-rose-200/90",
                    )}
                  >
                    {iconNote}
                  </div>
                )}
              </div>
            )}
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
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const root = (conversationMessages ?? []).find((m) => m.id === rootMessageId);
  const replies = (conversationMessages ?? []).filter((m) => m.replyToId === rootMessageId);

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
            <Message
              message={root}
              users={users}
              conversationType={conversationType}
              conversationId={conversationId}
            />
          </Card>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Сообщение не найдено.
          </div>
        )}
        <Card title="Ответы">
          <div className="space-y-3">
            {replies.length === 0 ? (
              <div className="text-sm text-white/45">Пока нет ответов в треде.</div>
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
