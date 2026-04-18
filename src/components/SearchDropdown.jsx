import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import { appPathForConversation } from "../lib/chatApi.js";
import * as api from "../lib/api.js";
import { Avatar } from "./ui.jsx";

export function SearchDropdown({ query, onClose }) {
  const navigate = useNavigate();
  const { token, me, directs, channels, users } = useMessenger();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (!q || !token) {
      setRows([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    const tid = setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.search(token, q, "all");
        if (!cancelled) setRows(Array.isArray(data?.results) ? data.results : []);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setLoadError(api.formatApiError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [query, token]);

  function go(path) {
    navigate(path);
    onClose();
  }

  function pathForResult(r) {
    if (r.type === "channel") return `/app/c/${encodeURIComponent(r.id)}`;
    if (r.type === "group") return `/app/g/${encodeURIComponent(r.id)}`;
    if (r.type === "message" && r.conversationType && r.conversationId) {
      return appPathForConversation(r.conversationType, r.conversationId, me.id, directs);
    }
    return "/app";
  }

  const needle = query.trim().toLowerCase();
  const localChannels = needle
    ? channels.filter((c) => c.title.toLowerCase().includes(needle)).slice(0, 4)
    : [];
  const localUsers = needle
    ? users.filter((u) => u.id !== me?.id && u.name.toLowerCase().includes(needle)).slice(0, 4)
    : [];

  if (!query.trim()) {
    return null;
  }

  if (loading && rows.length === 0 && localChannels.length === 0 && localUsers.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white/50">
        Загрузка...
      </div>
    );
  }

  const hasApi = rows.length > 0;
  const hasLocal = localChannels.length > 0 || localUsers.length > 0;

  if (loadError && !hasApi && !hasLocal && !loading) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-100">
        {loadError}
      </div>
    );
  }

  if (!hasApi && !hasLocal && !loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white/50">
        Ничего не найдено
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 py-2">
      {localChannels.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Каналы
          </div>
          {localChannels.map((c) => (
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

      {localUsers.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Люди
          </div>
          {localUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => go(`/app/d/${u.id}`)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
            >
              <Avatar user={u} size="sm" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
            </button>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
            По серверу
          </div>
          {rows.slice(0, 12).map((r, idx) => (
            <button
              key={`${r.type}-${r.id ?? idx}-${idx}`}
              type="button"
              onClick={() => go(pathForResult(r))}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-white/5"
            >
              <div className="text-[10px] uppercase text-white/35">{r.type}</div>
              <div className="line-clamp-2 text-xs text-white/70">
                {r.title ?? r.snippet ?? r.id}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
