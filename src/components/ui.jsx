import React from "react";
import { Link } from "react-router-dom";
import { cx, presenceColor } from "../lib/utils.js";

// ── Аватар с индикатором присутствия ──────────────────────────────────────

export function Avatar({ user, size = "md" }) {
  const dim =
    size === "lg"
      ? "h-20 w-20 text-2xl"
      : size === "sm"
        ? "h-7 w-7 text-xs"
        : "h-9 w-9 text-sm";

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cx("relative flex-shrink-0", dim)}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className={cx("rounded-xl object-cover", dim)}
        />
      ) : (
        <div
          className={cx(
            "flex items-center justify-center rounded-xl bg-indigo-500/20 font-semibold text-indigo-300",
            dim,
          )}
        >
          {initials}
        </div>
      )}
      <span
        className={cx(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-slate-950",
          presenceColor(user.status),
        )}
      />
    </div>
  );
}

// ── Кнопка / ссылка ────────────────────────────────────────────────────────

export function Button({ to, onClick, variant = "primary", size = "md", children, state, disabled }) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-400/40",
    size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && !disabled && "bg-indigo-500 hover:bg-indigo-400 text-white",
    variant === "primary" && disabled && "bg-indigo-500/40 text-white/40 cursor-not-allowed",
    variant === "ghost" && !disabled && "bg-white/5 hover:bg-white/10 text-white/90",
    variant === "ghost" && disabled && "bg-white/5 text-white/30 cursor-not-allowed",
    variant === "danger" && "bg-rose-500 hover:bg-rose-400 text-white",
  );
  if (to) return <Link to={to} state={state} className={cls}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

// ── Текстовый input с поддержкой ошибок ───────────────────────────────────

export function Input({ value, onChange, onBlur, placeholder, autoFocus, type = "text", error }) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={cx(
        "h-10 w-full rounded-lg bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2",
        error
          ? "border border-rose-400/50 focus:ring-rose-400/30"
          : "focus:ring-indigo-400/30",
      )}
    />
  );
}

// ── Подсказка об ошибке ────────────────────────────────────────────────────

export function FieldError({ error }) {
  if (!error) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-xs text-rose-400">
      <span>⚠</span>
      <span>{error}</span>
    </div>
  );
}

// ── Обёртка: метка + поле + ошибка ────────────────────────────────────────

export function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-white/50">{label}</div>}
      {children}
      <FieldError error={error} />
    </div>
  );
}

// ── Карточка ───────────────────────────────────────────────────────────────

export function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            {title && <div className="truncate text-sm font-semibold text-white/95">{title}</div>}
            {subtitle && <div className="truncate text-xs text-white/55">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ── Модальное окно ─────────────────────────────────────────────────────────

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Закрыть
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Заголовок страницы ─────────────────────────────────────────────────────

export function PageHeader({ title }) {
  return <div className="text-lg font-semibold text-white/95">{title}</div>;
}

// ── Строка ключ-значение ───────────────────────────────────────────────────

export function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="text-sm text-white/85">{value}</div>
    </div>
  );
}
