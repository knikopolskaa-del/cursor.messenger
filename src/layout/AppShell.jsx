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
        className="h-7 w-7 flex-shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-semibold text-white/45">
      {letter}
    </span>
  );
}

function NavGroup({ title, right, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
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
    "flex items-center rounded-lg px-2 py-2 text-sm transition",
    disabled
      ? "cursor-not-allowed text-white/25"
      : "text-white/70 hover:bg-white/5 hover:text-white",
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
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
    >
      {left ?? <span className="h-7 w-7 rounded-lg bg-white/5" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">
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
    <div className="flex h-dvh w-full flex-col bg-slate-950">
      {workspaceError && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs text-amber-100">
          <span className="min-w-0">{workspaceError}</span>
          <button
            type="button"
            onClick={() => retryWorkspace()}
            className="flex-shrink-0 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15"
          >
            Повторить
          </button>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr]">
        <aside className="flex h-full flex-col border-r border-white/10 bg-slate-950">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">Мессенджер компании</div>
              <div className="flex items-center gap-1.5 truncate text-xs text-white/50">
                <Avatar user={me} size="sm" />
                <span>{me.name}</span>
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/55">
                  {userTypeLabel(me.userType)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="flex-shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
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

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <Link to="/app/me" className="text-xs text-white/60 hover:text-white">
                Мой профиль
              </Link>
              <Link to="/app/settings" className="text-xs text-white/60 hover:text-white">
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
