import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { channels, dms, groups, membership, guestMembership } from "../mock.js";
import { getUser, userTypeLabel } from "../lib/utils.js";
import { Avatar, Button, Input } from "../components/ui.jsx";
import { SearchDropdown } from "../components/SearchDropdown.jsx";

// ── Элементы навигации ─────────────────────────────────────────────────────

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
  return <Link to={to} className={cls}>{label}</Link>;
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

// ── Основной каркас приложения (Slack-подобный) ────────────────────────────

export default function AppShell({ me, onLogout }) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const isGuest = me.userType === "guest";
  const createLinkState = { background: location.pathname + location.search };

  const channelsVisible = useMemo(() => {
    const allowed = isGuest ? guestMembership.channelIds : membership.channelIds;
    return channels.filter((c) => allowed.includes(c.id));
  }, [isGuest]);

  const dmsVisible = useMemo(() => {
    const allowed = isGuest ? guestMembership.dmIds : membership.dmIds;
    return dms.filter((d) => allowed.includes(d.id));
  }, [isGuest]);

  const groupsVisible = useMemo(() => {
    const allowed = isGuest ? guestMembership.groupIds : membership.groupIds;
    return groups.filter((g) => allowed.includes(g.id));
  }, [isGuest]);

  return (
    <div className="h-dvh w-full bg-slate-950">
      <div className="grid h-full grid-cols-[300px_1fr]">

        {/* ── Сайдбар ── */}
        <aside className="flex h-full flex-col border-r border-white/10 bg-slate-950">

          {/* Воркспейс / профиль */}
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
              onClick={onLogout}
              className="flex-shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              Выйти
            </button>
          </div>

          {/* Поиск с инлайн-дропдауном */}
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

          {/* Навигация */}
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
                <Button to="/app/new/channel" state={createLinkState} variant="ghost" size="sm">+</Button>
              }
            >
              {channelsVisible
                .filter((c) => !query || c.title.includes(query.toLowerCase()))
                .map((c) => (
                  <NavConversation
                    key={c.id}
                    to={`/app/c/${c.id}`}
                    label={`#${c.title}`}
                    hint={c.isPrivate ? "Приватный" : null}
                  />
                ))}
            </NavGroup>

            <NavGroup
              title="Личные сообщения"
              right={
                <Button to="/app/new/dm" state={createLinkState} variant="ghost" size="sm">+</Button>
              }
            >
              {dmsVisible
                .filter((d) => !query || getUser(d.peerUserId)?.name.toLowerCase().includes(query.toLowerCase()))
                .map((d) => {
                  const peer = getUser(d.peerUserId);
                  return (
                    <NavConversation
                      key={d.id}
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
                <Button to="/app/new/group" state={createLinkState} variant="ghost" size="sm">+</Button>
              }
            >
              {groupsVisible
                .filter((g) => !query || g.title.toLowerCase().includes(query.toLowerCase()))
                .map((g) => (
                  <NavConversation
                    key={g.id}
                    to={`/app/g/${g.id}`}
                    label={g.title}
                    hint={`${g.memberIds.length} участника`}
                  />
                ))}
            </NavGroup>
          </nav>

          {/* Нижняя плашка */}
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

        {/* ── Основная область ── */}
        <main className="flex h-full flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
