import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { users, currentUserId } from "../mock.js";
import { userTypeLabel, statusLabel } from "../lib/utils.js";
import { useForm, rules } from "../lib/validation.js";
import { Modal, Button, Input, Field } from "../components/ui.jsx";
import { Avatar } from "../components/ui.jsx";

// ── Хаб "Что создать?" ─────────────────────────────────────────────────────

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
          👥 Групповой чат
        </Button>
        <Button to="/app/new/dm" state={location.state} variant="ghost">
          ✉ Личное сообщение
        </Button>
      </div>
    </Modal>
  );
}

// ── Создать канал ──────────────────────────────────────────────────────────

export function NewChannelModal({ me }) {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";
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
          onDone={() => navigate("/app/c/c_general", { replace: true })}
        />
      )}
    </Modal>
  );
}

// ── Создать группу ─────────────────────────────────────────────────────────

export function NewGroupModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";

  return (
    <Modal title="Создать группу" onClose={() => navigate(closeTo, { replace: true })}>
      <CreateForm
        kind="group"
        onDone={() => navigate("/app/g/g_launch", { replace: true })}
      />
    </Modal>
  );
}

// ── Новое личное сообщение ─────────────────────────────────────────────────

export function NewDmModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = location.state?.background ?? "/app";

  const otherUsers = users.filter((u) => u.id !== currentUserId);
  const [picked, setPicked] = useState(otherUsers[0]?.id ?? "");
  const [touched, setTouched] = useState(false);

  const pickedError = touched && !picked ? "Выберите сотрудника" : null;
  const pickedUser = otherUsers.find((u) => u.id === picked);

  function handleOpen() {
    setTouched(true);
    if (!picked) return;
    navigate(`/app/d/${picked}`, { replace: true });
  }

  return (
    <Modal title="Новое личное сообщение" onClose={() => navigate(closeTo, { replace: true })}>
      <div className="space-y-4">
        <Field label="Выберите сотрудника" error={pickedError}>
          <select
            value={picked}
            onChange={(e) => { setPicked(e.target.value); setTouched(true); }}
            className={[
              "h-10 w-full rounded-lg bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2",
              pickedError
                ? "border border-rose-400/50 focus:ring-rose-400/30"
                : "focus:ring-indigo-400/30",
            ].join(" ")}
          >
            {otherUsers.length === 0 && (
              <option value="">Нет доступных сотрудников</option>
            )}
            {otherUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {userTypeLabel(u.userType)}
              </option>
            ))}
          </select>
        </Field>

        {pickedUser && (
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <Avatar user={pickedUser} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{pickedUser.name}</div>
              <div className="text-xs text-white/45">
                {pickedUser.title} · {statusLabel(pickedUser.status)}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleOpen} disabled={!picked}>Открыть чат</Button>
          <Button onClick={() => navigate(closeTo, { replace: true })} variant="ghost">
            Отмена
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Универсальная форма создания (канал / группа) ──────────────────────────

function CreateForm({ kind, onDone }) {
  const isChannel = kind === "channel";
  const [isPrivate, setIsPrivate] = useState(false);

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

  function handleSubmit() {
    form.touchAll();
    if (!form.isValid) return;
    onDone();
  }

  return (
    <div className="space-y-4">
      <Field
        label={isChannel ? "Название канала" : "Название группы"}
        error={form.field("name").error}
      >
        <Input
          {...form.field("name")}
          placeholder={isChannel ? "команда-ux" : "Команда запуска"}
        />
        {isChannel && (
          <div className="mt-1 text-[11px] text-white/35">
            Только буквы, цифры, дефис и подчёркивание — без пробелов
          </div>
        )}
      </Field>

      {isChannel && (
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-indigo-400"
          />
          Приватный канал
        </label>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!form.isValid && Object.values(form.errors).some(Boolean)}
      >
        Создать
      </Button>
    </div>
  );
}
