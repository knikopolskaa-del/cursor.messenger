import React, { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import { pickUser, userTypeLabel } from "../lib/utils.js";
import { Avatar, Button, Input } from "../components/ui.jsx";
import { ConversationIcon } from "../components/ConversationIcon.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import {
  IconBookmark,
  IconChat,
  IconHash,
  IconHome,
  IconPlus,
  IconUsers,
} from "../design/icons.jsx";

function NavGroup({ title, right, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between px-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted2)]">
          {title}
        </div>
        {right}
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function navLinkClass({ isActive }) {
  return [
    "flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-3 text-[15px] font-medium transition",
    isActive
      ? "cm-nav-active"
      : "text-[color:var(--muted)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--fg)]",
  ].join(" ");
}

function NavItem({ to, label, icon: Icon, disabled, end = false }) {
  if (disabled) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 rounded-[var(--radius-xl)] px-3 py-3 text-[15px] text-[color:var(--muted2)]">
        {Icon && <Icon className="h-5 w-5 flex-shrink-0 opacity-50" />}
        {label}
      </div>
    );
  }
  return (
    <NavLink to={to} end={end} className={navLinkClass}>
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
      {label}
    </NavLink>
  );
}

function NavConversation({ to, label, hint, left }) {
  return (
    <NavLink to={to} className={navLinkClass}>
      {left ?? (
        <span className="h-9 w-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface2)]" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--accent)]">
          {hint}
        </span>
      )}
    </NavLink>
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

  const searching = query.trim().length > 0;

  return (
    <div className="flex h-dvh w-full flex-col">
      {workspaceError && (
        <div className="cm-glass flex flex-shrink-0 items-center justify-between gap-3 border-b px-5 py-3 text-sm text-[color:var(--fg)]">
          <span className="min-w-0">{workspaceError}</span>
          <button
            type="button"
            onClick={() => retryWorkspace()}
            className="cm-btn-outline flex-shrink-0 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]"
          >
            Повторить
          </button>
        </div>
      )}
      <div className="grid h-full min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden">
        <aside className="cm-glass flex h-full min-h-0 flex-col border-r">
          <div className="border-b border-[color:var(--border)] px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted2)]">
                Мессенджер
              </span>
              <ThemeToggle compact />
            </div>
            <Link
              to="/app/me"
              className="flex items-center gap-3 rounded-[var(--radius-xl)] p-2 transition hover:bg-[color:var(--accent-soft)]/55 focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]"
            >
              <Avatar user={me} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold leading-tight text-[color:var(--fg)]">
                  {me.name}
                </div>
                <div className="truncate text-xs text-[color:var(--muted)]">
                  {userTypeLabel(me.userType)}
                </div>
              </div>
            </Link>
          </div>

          <div className="px-4 py-4">
            <Input value={query} onChange={setQuery} placeholder="Поиск…" />
            <div className="mt-3">
              <Button to="/app/new" state={createLinkState} variant="primary" size="sm">
                <IconPlus className="h-4 w-4" />
                Создать
              </Button>
            </div>
          </div>

          <nav className="flex-1 overflow-auto px-3 pb-4">
            {searching ? (
              <SearchDropdown query={query} onClose={() => setQuery("")} />
            ) : (
              <>
            <NavGroup title="Навигация">
              <NavItem to="/app" label="Главная" icon={IconHome} end />
              <NavItem to="/app/threads" label="Треды" icon={IconChat} />
              <NavItem to="/app/mentions" label="Упоминания" icon={IconUsers} />
              <NavItem to="/app/saved" label="Сохранённое" icon={IconBookmark} />
              {!isGuest && <NavItem to="/app/directory" label="Сотрудники" icon={IconUsers} disabled />}
            </NavGroup>

            <NavGroup
              title="Каналы"
              right={
                <Link
                  to="/app/new/channel"
                  state={createLinkState}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
                  aria-label="Создать канал"
                >
                  <IconPlus className="h-4 w-4" />
                </Link>
              }
            >
              {channels.map((c) => (
                  <NavConversation
                    key={c.id}
                    to={`/app/c/${c.id}`}
                    label={`#${c.title}`}
                    hint={c.isPrivate ? "Приватный" : null}
                    left={
                      <ConversationIcon
                        kind="channel"
                        iconUrl={c.iconUrl}
                        token={token}
                        label={c.title}
                        size="sm"
                      />
                    }
                  />
                ))}
            </NavGroup>

            <NavGroup
              title="Личные сообщения"
              right={
                <Link
                  to="/app/new/dm"
                  state={createLinkState}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
                  aria-label="Новое сообщение"
                >
                  <IconPlus className="h-4 w-4" />
                </Link>
              }
            >
              {dmEntries.map((d) => {
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
                <Link
                  to="/app/new/group"
                  state={createLinkState}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
                  aria-label="Создать группу"
                >
                  <IconPlus className="h-4 w-4" />
                </Link>
              }
            >
              {groups.map((g) => (
                  <NavConversation
                    key={g.id}
                    to={`/app/g/${g.id}`}
                    label={g.title}
                    hint={`${g.memberIds?.length ?? 0}`}
                    left={
                      <ConversationIcon
                        kind="group"
                        iconUrl={g.iconUrl}
                        token={token}
                        label={g.title}
                        size="sm"
                      />
                    }
                  />
                ))}
            </NavGroup>
              </>
            )}
          </nav>

          <div className="border-t border-[color:var(--border)] p-4">
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/app/me"
                className="text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--accent)]"
              >
                Профиль
              </Link>
              <Link
                to="/app/settings"
                className="text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--accent)]"
              >
                Настройки
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--danger)]"
              >
                Выйти
              </button>
            </div>
          </div>
        </aside>

        <main className="h-full min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
