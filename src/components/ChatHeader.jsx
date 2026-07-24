import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cx } from "../lib/utils.js";
import { Avatar } from "./ui.jsx";
import { ConversationIcon } from "./ConversationIcon.jsx";
import {
  IconAudio,
  IconFile,
  IconImage,
  IconLink,
  IconMore,
  IconSearch,
  IconVideo,
} from "../design/icons.jsx";

export const CHAT_MEDIA_MENUS = [
  { key: "docs", label: "Документы", icon: IconFile },
  { key: "video", label: "Видео", icon: IconVideo },
  { key: "photo", label: "Фото", icon: IconImage },
  { key: "links", label: "Ссылки", icon: IconLink },
  { key: "audio", label: "Аудио", icon: IconAudio },
];

export function ChatHeader({
  kind,
  title,
  kindLabel,
  peerUser,
  iconUrl,
  iconLabel,
  token,
  editableIcon = false,
  iconTargetType,
  iconTargetId,
  messagesScrollRef,
  searchOpen = false,
  searchQuery = "",
  onSearchQueryChange,
  onSearchToggle,
  onSearchClose,
  matchCount = 0,
}) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchInputRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onSearchClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, onSearchClose]);

  function updateMenuPos() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 208;
    setMenuPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - menuWidth),
    });
  }

  useEffect(() => {
    if (!menuOpen) return undefined;
    updateMenuPos();
    function onDocClick(e) {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onViewportChange() {
      setMenuOpen(false);
    }
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const scrollEl = messagesScrollRef?.current;
    if (!scrollEl) return undefined;
    const close = () => setMenuOpen(false);
    scrollEl.addEventListener("scroll", close, { passive: true });
    return () => scrollEl.removeEventListener("scroll", close);
  }, [menuOpen, messagesScrollRef]);

  function openPanel(panelKey) {
    const next = new URLSearchParams(sp);
    next.set("panel", panelKey);
    navigate({ search: next.toString() });
    setMenuOpen(false);
  }

  return (
    <header className="cm-glass relative z-20 flex items-center gap-3 border-b px-5 py-4">
      {kind === "dm" && peerUser ? (
        <Avatar user={peerUser} size="md" />
      ) : (
        <ConversationIcon
          kind={kind}
          iconUrl={iconUrl}
          label={iconLabel || title}
          token={token}
          size="md"
          editable={editableIcon}
          targetType={iconTargetType}
          targetId={iconTargetId}
        />
      )}

      {searchOpen ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconSearch className="h-5 w-5 flex-shrink-0 text-[color:var(--muted)]" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            placeholder="Поиск в чате…"
            className="cm-input h-10 min-w-0 flex-1 rounded-[var(--radius-pill)] px-4 text-sm"
            aria-label="Поиск по сообщениям"
          />
          {searchQuery.trim() && (
            <span className="flex-shrink-0 text-xs text-[color:var(--muted)]">{matchCount}</span>
          )}
          <button
            type="button"
            onClick={() => onSearchClose?.()}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--fg)]"
            aria-label="Закрыть поиск"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openPanel("info")}
          className="min-w-0 flex-1 rounded-[var(--radius-xl)] px-1 py-1 text-left transition hover:bg-[color:var(--accent-soft)]/60 focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]"
          aria-label="Информация о чате"
        >
          <div className="truncate font-display text-2xl font-bold leading-tight text-[color:var(--fg)]">
            {title}
          </div>
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
            {kind === "dm" && peerUser && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {kindLabel}
              </span>
            )}
            {kind !== "dm" && kindLabel}
          </div>
        </button>
      )}

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onSearchToggle?.();
          }}
          className={cx(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
            searchOpen && "bg-[color:var(--accent-soft)] text-[color:var(--accent)]",
          )}
          aria-label="Поиск по чату"
          aria-pressed={searchOpen}
        >
          <IconSearch className="h-5 w-5" />
        </button>

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setMenuOpen((v) => {
              const next = !v;
              if (next) queueMicrotask(updateMenuPos);
              return next;
            });
          }}
          className={cx(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
            menuOpen && "bg-[color:var(--accent-soft)] text-[color:var(--accent)]",
          )}
          aria-label="Меню чата"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <IconMore className="h-5 w-5" />
        </button>

        {menuOpen &&
          createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[100] w-52 overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] py-1 shadow-paper backdrop-blur"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              {CHAT_MEDIA_MENUS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={() => openPanel(key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--accent-soft)]"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-[color:var(--accent)]" />
                  {label}
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>
      </div>
    </header>
  );
}
