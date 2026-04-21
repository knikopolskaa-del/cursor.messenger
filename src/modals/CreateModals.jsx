import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { userTypeLabel, statusLabel } from "../lib/utils.js";
import { useForm, rules } from "../lib/validation.js";
import { Modal, Button, Input, Field } from "../components/ui.jsx";
import { Avatar } from "../components/ui.jsx";

export function NewHubModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";

  return (
    <Modal title="Создать" onClose={() => navigate(closeTo, { replace: true })}>
      <div className="grid gap-2">
        <Button to="/app/new/channel" state={location.state} variant="ghost">
          # Канал
        </Button>
        <Button to="/app/new/group" state={location.state} variant="ghost">
          Групповой чат
        </Button>
        <Button to="/app/new/dm" state={location.state} variant="ghost">
          Личное сообщение
        </Button>
      </div>
    </Modal>
  );
}

export function NewChannelModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";
  const { me, token } = useMessenger();
  const isGuest = me.userType === "guest";

  return (
    <Modal title="Создать канал" onClose={() => navigate(closeTo, { replace: true })}>
      {isGuest ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">
            Гостевые пользователи не могут создавать каналы.
          </div>
          <Button onClick={() => navigate(closeTo, { replace: true })}>Понятно</Button>
        </div>
      ) : (
        <CreateForm
          kind="channel"
          token={token}
          onCreated={(channel) => navigate(`/app/c/${channel.id}`, { replace: true })}
          onCancel={() => navigate(closeTo, { replace: true })}
        />
      )}
    </Modal>
  );
}

export function NewGroupModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";
  const { token } = useMessenger();

  return (
    <Modal title="Создать группу" onClose={() => navigate(closeTo, { replace: true })}>
      <CreateForm
        kind="group"
        token={token}
        onCreated={(group) => navigate(`/app/g/${group.id}`, { replace: true })}
        onCancel={() => navigate(closeTo, { replace: true })}
      />
    </Modal>
  );
}

export function NewDmModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";
  const { me, users, token, refreshWorkspace } = useMessenger();

  const otherUsers = users.filter((u) => u.id !== me.id);
  const [picked, setPicked] = useState(otherUsers[0]?.id ?? "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const pickedError = touched && !picked ? "Выберите сотрудника" : null;
  const pickedUser = otherUsers.find((u) => u.id === picked);

  async function handleOpen() {
    setTouched(true);
    setErr(null);
    if (!picked) return;
    setBusy(true);
    try {
      await api.postDirect(token, picked);
      await refreshWorkspace();
      navigate(`/app/d/${picked}`, { replace: true });
    } catch {
      setErr("Не удалось открыть диалог.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Новое личное сообщение" onClose={() => navigate(closeTo, { replace: true })}>
      <div className="space-y-4">
        <Field label="Выберите сотрудника" error={pickedError}>
          <select
            value={picked}
            onChange={(e) => {
              setPicked(e.target.value);
              setTouched(true);
            }}
            className={[
              "h-11 w-full rounded-2xl border bg-[color:var(--surface2)] px-4 text-sm text-[color:var(--fg)] shadow-paper outline-none transition",
              "focus:ring-4 focus:ring-[color:var(--ring)]",
              pickedError ? "border-rose-300/40" : "border-[color:var(--border)]",
            ].join(" ")}
          >
            {otherUsers.length === 0 && <option value="">Нет доступных сотрудников</option>}
            {otherUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {userTypeLabel(u.userType)}
              </option>
            ))}
          </select>
        </Field>

        {pickedUser && (
          <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-paper backdrop-blur">
            <Avatar user={pickedUser} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{pickedUser.name}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {pickedUser.title} · {statusLabel(pickedUser.status)}
              </div>
            </div>
          </div>
        )}

        {err && <div className="text-sm font-semibold text-[color:var(--danger)]">{err}</div>}

        <div className="flex gap-2">
          <Button onClick={handleOpen} disabled={!picked || busy}>
            {busy ? "Открытие…" : "Открыть чат"}
          </Button>
          <Button onClick={() => navigate(closeTo, { replace: true })} variant="ghost">
            Отмена
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateForm({ kind, token, onCreated, onCancel }) {
  const isChannel = kind === "channel";
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const { me, users, refreshWorkspace } = useMessenger();

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== me.id),
    [users, me.id],
  );

  const filteredForPicker = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const base = otherUsers;
    if (!q) return base;
    return base.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q)),
    );
  }, [otherUsers, memberSearch]);

  function toggleMember(userId) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const form = useForm({
    name: {
      initial: "",
      validators: isChannel
        ? [
            rules.required("Введите название канала"),
            rules.minLen(2, "Минимум 2 символа"),
            rules.maxLen(50, "Максимум 50 символов"),
            rules.slug(),
          ]
        : [
            rules.required("Введите название группы"),
            rules.minLen(2, "Минимум 2 символа"),
            rules.maxLen(80, "Максимум 80 символов"),
          ],
    },
  });

  async function handleSubmit() {
    form.touchAll();
    setErr(null);
    if (!form.isValid) return;
    setBusy(true);
    try {
      if (isChannel) {
        const slug = form.values.name.trim();
        const ch = await api.postChannel(token, {
          slug,
          title: slug,
          topic: "",
          isPrivate,
        });
        await refreshWorkspace();
        onCreated(ch);
      } else {
        const memberIds = [...new Set([me.id, ...selectedMemberIds])];
        if (memberIds.length < 2) {
          setErr("Выберите хотя бы одного сотрудника в блоке «Все сотрудники».");
          setBusy(false);
          return;
        }
        const g = await api.postGroup(token, {
          title: form.values.name.trim(),
          memberIds,
        });
        await refreshWorkspace();
        onCreated(g);
      }
    } catch (e) {
      setErr(e.message || "Ошибка создания");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field
        label={isChannel ? "Название канала (slug)" : "Название группы"}
        error={form.field("name").error}
      >
        <Input
          {...form.field("name")}
          placeholder={isChannel ? "komanda-ux" : "Команда запуска"}
        />
        {isChannel && (
          <div className="mt-1 text-[11px] text-[color:var(--muted2)]">
            Только буквы, цифры, дефис и подчёркивание — без пробелов
          </div>
        )}
      </Field>

      {isChannel && (
        <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-sky-300"
          />
          Приватный канал
        </label>
      )}

      {!isChannel && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted2)]">
            Добавить сотрудников
          </div>

          {selectedMemberIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMemberIds.map((id) => {
                const u = otherUsers.find((x) => x.id === id);
                if (!u) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleMember(id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]/85 shadow-paper hover:bg-[color:var(--surface2)]/90"
                  >
                    <Avatar user={u} size="sm" />
                    <span>{u.name}</span>
                    <span className="text-[color:var(--muted2)]" aria-hidden>
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Field label="Все сотрудники">
            <Input
              value={memberSearch}
              onChange={setMemberSearch}
              placeholder="Поиск по имени, e-mail или должности…"
            />
          </Field>

          <div className="max-h-44 overflow-auto rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] shadow-paper backdrop-blur">
            {otherUsers.length === 0 ? (
              <div className="p-4 text-xs text-[color:var(--muted)]">Нет других сотрудников в каталоге.</div>
            ) : filteredForPicker.length === 0 ? (
              <div className="p-4 text-xs text-[color:var(--muted)]">Никого не найдено.</div>
            ) : (
              filteredForPicker.map((u) => {
                const on = selectedMemberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                      on
                        ? "bg-[color:var(--surface2)] text-[color:var(--fg)]"
                        : "text-[color:var(--muted)] hover:bg-[color:var(--surface2)]/70 hover:text-[color:var(--fg)]",
                    ].join(" ")}
                  >
                    <Avatar user={u} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                    <span className="text-[10px] text-[color:var(--muted2)]">{userTypeLabel(u.userType)}</span>
                    {on && (
                      <span className="text-xs text-[color:var(--fg)]" aria-hidden>
                        {"\u2713"}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {err && <div className="text-sm font-semibold text-[color:var(--danger)]">{err}</div>}

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? "Создание…" : "Создать"}
        </Button>
        <Button onClick={onCancel} variant="ghost">
          Отмена
        </Button>
      </div>
    </div>
  );
}
