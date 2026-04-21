import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cx, presenceColor } from "../lib/utils.js";
import { absoluteAssetUrl } from "../lib/chatApi.js";
import * as api from "../lib/api.js";

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

  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = user?.avatarUrl || "";
    if (!url) {
      setSrc("");
      return undefined;
    }
    if (typeof url === "string" && url.startsWith("/files/")) {
      const token = localStorage.getItem(api.TOKEN_KEY) || "";
      if (!token) {
        setSrc("");
        return undefined;
      }
      let cancelled = false;
      (async () => {
        try {
          const out = await api.getFileUrl(token, url);
          if (!cancelled) setSrc(out?.url || "");
        } catch {
          if (!cancelled) setSrc("");
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    setSrc(absoluteAssetUrl(url));
    return undefined;
  }, [user?.avatarUrl]);

  return (
    <div className={cx("relative flex-shrink-0", dim)}>
      {src ? (
        <img
          src={src}
          alt={user.name}
          className={cx("rounded-xl border border-[color:var(--border)] object-cover", dim)}
        />
      ) : (
        <div
          className={cx(
            "flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] font-semibold text-[color:var(--muted)]",
            dim,
          )}
        >
          {initials}
        </div>
      )}
      <span
        className={cx(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[color:var(--bg)]",
          presenceColor(user.status),
        )}
      />
    </div>
  );
}

// ── Кнопка / ссылка ────────────────────────────────────────────────────────

export function Button({ to, onClick, variant = "primary", size = "md", children, state, disabled }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 font-semibold transition focus:outline-none focus:ring-4";
  const cls = cx(
    base,
    size === "sm" ? "h-9 text-xs px-3" : "h-11 text-sm",
    "border-[color:var(--primaryBorder)] shadow-paper backdrop-blur",
    disabled && "cursor-not-allowed opacity-60",
    variant === "primary" &&
      !disabled &&
      "bg-[color:var(--primaryBg)] text-[color:var(--primary)] hover:bg-[color:var(--primaryBg)]/90 focus:ring-[color:var(--ring)]",
    variant === "primary" && disabled && "bg-[color:var(--primaryBg)] text-[color:var(--muted)]",
    variant === "ghost" &&
      !disabled &&
      "bg-[color:var(--panel)] text-[color:var(--fg)] hover:bg-[color:var(--panel)]/80 focus:ring-[color:var(--ring)]",
    variant === "ghost" && disabled && "bg-[color:var(--panel)] text-[color:var(--muted2)]",
    variant === "danger" &&
      !disabled &&
      "bg-[color:var(--dangerBg)] text-[color:var(--danger)] border-transparent hover:opacity-95 focus:ring-[color:var(--ring)]",
    variant === "danger" && disabled && "bg-[color:var(--dangerBg)] text-[color:var(--danger)]/70",
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
  // Backward-compat wrapper: keep old signature working.
  return (
    <InputV2
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      type={type}
      error={error}
    />
  );
}

export function InputV2({
  value,
  onChange,
  onChangeEvent,
  onBlur,
  placeholder,
  autoFocus,
  type = "text",
  error,
  maxLength,
  inputMode,
  right,
  clearable = true,
}) {
  const id = useId();
  const ref = useRef(null);
  const hasValue = String(value ?? "").length > 0;
  const showClear = Boolean(clearable && hasValue && typeof onChange === "function");
  const rightCount = (showClear ? 1 : 0) + (right ? 1 : 0);
  const pr = rightCount === 0 ? "pr-3" : rightCount === 1 ? "pr-10" : "pr-[5.25rem]";

  return (
    <div className="relative">
      <input
        id={id}
        ref={ref}
        value={value}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={onChangeEvent ?? ((e) => onChange(e.target.value))}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cx(
          "h-11 w-full rounded-2xl border px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.06)] outline-none backdrop-blur transition placeholder:text-[color:var(--muted2)]",
          "bg-[color:var(--surface2)] text-[color:var(--fg)]",
          pr,
          error
            ? "border-rose-300/40 focus:ring-4 focus:ring-rose-300/20"
            : "border-[color:var(--border)] focus:ring-4 focus:ring-[color:var(--ring)]",
        )}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
        {showClear && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              queueMicrotask(() => ref.current?.focus());
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-sm text-[color:var(--muted)] hover:bg-[color:var(--panel)]/80 hover:text-[color:var(--fg)]"
            aria-label="Очистить"
          >
            ×
          </button>
        )}
        {right}
      </div>
    </div>
  );
}

// ── Подсказка об ошибке ────────────────────────────────────────────────────

export function FieldError({ error }) {
  if (!error) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[color:var(--danger)]">
      <span>⚠</span>
      <span>{error}</span>
    </div>
  );
}

// ── Обёртка: метка + поле + ошибка ────────────────────────────────────────

export function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      {label && <div className="text-[12px] font-semibold text-[color:var(--muted)]">{label}</div>}
      {children}
      <FieldError error={error} />
    </div>
  );
}

// ── Карточка ───────────────────────────────────────────────────────────────

export function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] shadow-paper backdrop-blur">
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <div className="truncate font-proto text-2xl font-bold leading-[0.95] tracking-tight text-[color:var(--fg)]">
                {title}
              </div>
            )}
            {subtitle && <div className="truncate text-xs text-[color:var(--muted)]">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Модальное окно ─────────────────────────────────────────────────────────

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] shadow-paper backdrop-blur">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="font-proto text-3xl font-bold leading-[0.95] tracking-tight text-[color:var(--fg)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)] hover:bg-[color:var(--surface2)]/90 focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
          >
            Закрыть
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Заголовок страницы ─────────────────────────────────────────────────────

export function PageHeader({ title }) {
  return (
    <div className="font-proto text-[44px] font-bold leading-[0.92] tracking-tight text-[color:var(--fg)]">
      {title}
    </div>
  );
}

// ── Строка ключ-значение ───────────────────────────────────────────────────

export function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-xs text-[color:var(--muted2)]">{label}</div>
      <div className="text-sm text-[color:var(--fg)]/90">{value}</div>
    </div>
  );
}
