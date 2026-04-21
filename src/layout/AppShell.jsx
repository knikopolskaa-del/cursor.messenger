import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import { pickUser, userTypeLabel } from "../lib/utils.js";
import { Avatar, Button, Input } from "../components/ui.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { AuthScopedImage } from "../components/ChatComponents.jsx";

function ConvIcon({ iconUrl, token, label }) {
  const letter = (label || "?").trim().slice(0, 1).toUpperCase();
  if (iconUrl) {
    return (
      <AuthScopedImage
        url={iconUrl}
        token={token}
        alt=""
        className="h-7 w-7 flex-shrink-0 rounded-xl border border-[color:var(--border)] object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[11px] font-semibold text-[color:var(--muted)]">
      {letter}
    </span>
  );
}

function NavGroup({ title, right, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted2)]">
          {title}
        </div>
        {right}
      </div>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ to, label, disabled }) {
  const cls = [
    "flex items-center rounded-2xl px-2.5 py-2 text-sm transition",
    disabled
      ? "cursor-not-allowed text-[color:var(--muted2)]"
      : "text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--fg)]",
  ].join(" ");
  if (disabled) return <div className={cls}>{label}</div>;
  return (
    <Link to={to} className={cls}>
      {label}
    </Link>
  );
}

function NavConversation({ to, label, hint, left }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-2xl px-2.5 py-2 text-sm text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--fg)]"
    >
      {left ?? <span className="h-7 w-7 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-2 py-1 text-[10px] text-[color:var(--muted2)]">
          {hint}
        </span>
      )}
    </Link>
  );
}

export default function AppShell() {
  const location = useLocation();
  const { me, token, logout, channels, groups, directs, users, workspaceError, retryWorkspace } =
    useMessenger();
  const [query, setQuery] = useState("");
  const isGuest = me.userType === "guest";
  const createLinkState = { background: location.pathname + location.search };

  const dmEntries = useMemo(() => {
    return directs.map((d) => {
      const peerUserId = d.userIds.find((id) => id !== me.id) ?? d.userIds[0];
      return { threadId: d.id, peerUserId };
    });
  }, [directs, me.id]);

  return (
    <div className="flex h-dvh w-full flex-col bg-[color:var(--bg)]">
      {workspaceError && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-2 text-xs text-[color:var(--fg)] shadow-paper backdrop-blur">
          <span className="min-w-0">{workspaceError}</span>
          <button
            type="button"
            onClick={() => retryWorkspace()}
            className="flex-shrink-0 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--fg)] hover:bg-[color:var(--surface2)]/90 focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
          >
            Повторить
          </button>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr]">
        <aside className="flex h-full flex-col border-r border-[color:var(--border)] bg-[color:var(--panel)] shadow-paper backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate font-proto text-3xl font-bold leading-[0.95] tracking-tight text-[color:var(--fg)]">
                Мессенджер компании
              </div>
              <div className="flex items-center gap-1.5 truncate text-xs text-[color:var(--muted)]">
                <Avatar user={me} size="sm" />
                <span>{me.name}</span>
                <span className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-2 py-1 text-[10px] font-semibold text-[color:var(--muted2)]">
                  {userTypeLabel(me.userType)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="flex-shrink-0 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)] hover:bg-[color:var(--surface2)]/90 focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            >
              Выйти
            </button>
          </div>

          <div className="relative px-4 pb-3">
            <Input value={query} onChange={setQuery} placeholder="Поиск…" />
            {query.length > 0 && (
              <div className="absolute left-4 right-4 top-full z-30 mt-1">
                <SearchDropdown query={query} onClose={() => setQuery("")} />
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <Button to="/app/new" state={createLinkState} variant="ghost" size="sm">
                + Создать
              </Button>
            </div>
          </div>

          <nav className="flex-1 overflow-auto px-2 pb-4">
            <NavGroup title="Быстрый доступ">
              <NavItem to="/app/threads" label="Треды" />
              <NavItem to="/app/mentions" label="Упоминания" />
              <NavItem to="/app/saved" label="Сохранённое" />
              {!isGuest && <NavItem to="/app/directory" label="Сотрудники" disabled />}
            </NavGroup>

            <NavGroup
              title="Каналы"
              right={
                <Button to="/app/new/channel" state={createLinkState} variant="ghost" size="sm">
                  +
                </Button>
              }
            >
              {channels
                .filter((c) => !query || c.title.toLowerCase().includes(query.toLowerCase()))
                .map((c) => (
                  <NavConversation
                    key={c.id}
                    to={`/app/c/${c.id}`}
                    label={`#${c.title}`}
                    hint={c.isPrivate ? "Приватный" : null}
                    left={<ConvIcon iconUrl={c.iconUrl} token={token} label={c.title} />}
                  />
                ))}
            </NavGroup>

            <NavGroup
              title="Личные сообщения"
              right={
                <Button to="/app/new/dm" state={createLinkState} variant="ghost" size="sm">
                  +
                </Button>
              }
            >
              {dmEntries
                .filter((d) => {
                  if (!query) return true;
                  const peer = pickUser(users, d.peerUserId);
                  return peer?.name?.toLowerCase().includes(query.toLowerCase());
                })
                .map((d) => {
                  const peer = pickUser(users, d.peerUserId) ?? { id: d.peerUserId, name: d.peerUserId };
                  return (
                    <NavConversation
                      key={d.threadId}
                      to={`/app/d/${peer.id}`}
                      label={peer.name}
                      left={<Avatar user={peer} size="sm" />}
                    />
                  );
                })}
            </NavGroup>

            <NavGroup
              title="Группы"
              right={
                <Button to="/app/new/group" state={createLinkState} variant="ghost" size="sm">
                  +
                </Button>
              }
            >
              {groups
                .filter((g) => !query || g.title.toLowerCase().includes(query.toLowerCase()))
                .map((g) => (
                  <NavConversation
                    key={g.id}
                    to={`/app/g/${g.id}`}
                    label={g.title}
                    hint={`${g.memberIds?.length ?? 0} участника`}
                    left={<ConvIcon iconUrl={g.iconUrl} token={token} label={g.title} />}
                  />
                ))}
            </NavGroup>
          </nav>

          <div className="border-t border-[color:var(--border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <Link to="/app/me" className="text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--fg)]">
                Мой профиль
              </Link>
              <Link to="/app/settings" className="text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--fg)]">
                Настройки
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex h-full flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
