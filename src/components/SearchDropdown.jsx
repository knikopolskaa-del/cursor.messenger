import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { channels, users, messagesByConversationKey, currentUserId } from "../mock.js";
import { getUser, conversationPath } from "../lib/utils.js";
import { Avatar } from "./ui.jsx";

function useSearchResults(query) {
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return { channels: [], users: [], messages: [] };

    const matchedChannels = channels.filter((c) =>
      c.title.toLowerCase().includes(needle),
    );

    const matchedUsers = users.filter(
      (u) => u.id !== currentUserId && u.name.toLowerCase().includes(needle),
    );

    const matchedMessages = [];
    for (const [key, list] of Object.entries(messagesByConversationKey)) {
      for (const m of list) {
        const author = getUser(m.authorId);
        if (`${m.text} ${author?.name ?? ""}`.toLowerCase().includes(needle)) {
          matchedMessages.push({ conversationKey: key, message: m });
          if (matchedMessages.length >= 5) break;
        }
      }
      if (matchedMessages.length >= 5) break;
    }

    return {
      channels: matchedChannels.slice(0, 3),
      users: matchedUsers.slice(0, 3),
      messages: matchedMessages,
    };
  }, [query]);
}

export function SearchDropdown({ query, onClose }) {
  const { channels: chs, users: us, messages: msgs } = useSearchResults(query);
  const navigate = useNavigate();

  const total = chs.length + us.length + msgs.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white/50">
        Ничего не найдено
      </div>
    );
  }

  function go(path) {
    navigate(path);
    onClose();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 py-2">
      {chs.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Каналы
          </div>
          {chs.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => go(`/app/c/${c.id}`)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
            >
              <span className="text-white/40">#</span> {c.title}
            </button>
          ))}
        </div>
      )}

      {us.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Сотрудники
          </div>
          {us.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => go(`/app/d/${u.id}`)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
            >
              <Avatar user={u} size="sm" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <span className="text-[10px] text-white/35">{u.title}</span>
            </button>
          ))}
        </div>
      )}

      {msgs.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Сообщения
          </div>
          {msgs.map(({ conversationKey, message }) => {
            const author = getUser(message.authorId);
            const path = conversationPath(conversationKey);
            return (
              <button
                key={`${conversationKey}:${message.id}`}
                type="button"
                onClick={() => go(`${path}?thread=${message.id}`)}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-white/5"
              >
                <div className="text-xs font-semibold text-white/70">{author.name}</div>
                <div className="line-clamp-1 text-xs text-white/50">{message.text}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
