import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { normalizeInputChange, normalizeInputValue } from "../lib/validation.js";

export function AuthBackdrop({ children }) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-start overflow-y-auto bg-[color:var(--bg)] px-6 py-8 font-ui sm:justify-center">
      <div className="cm-auth-glow pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </div>
  );
}

export function GlassCard({ children, className = "" }) {
  return (
    <div
      className={[
        "cm-glass w-full max-w-[480px] rounded-[var(--radius-2xl)] p-8 sm:p-10",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function AuthTitle({ title, subtitle }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-[color:var(--fg)] sm:text-[2.25rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-base text-[color:var(--muted)]">{subtitle}</p>
      )}
    </div>
  );
}

export function AuthLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-[color:var(--fg)]">
      {children}
    </label>
  );
}

export function AuthFieldError({ id, children }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" className="mt-1.5 text-sm font-medium text-[color:var(--danger)]">
      {children}
    </div>
  );
}

const INPUT_PROP_KEYS = new Set([
  "type",
  "placeholder",
  "autoComplete",
  "name",
  "readOnly",
  "disabled",
  "maxLength",
  "inputMode",
  "autoFocus",
  "required",
  "spellCheck",
]);

function isGarbageAutofill(value) {
  const s = String(value ?? "");
  return s === "[object Object]" || s.includes("[object Object]");
}

export function AuthInput({
  icon: Icon,
  right,
  error,
  value,
  onChange,
  onBlur,
  onFocus,
  className = "",
  id: idProp,
  preventAutofill = false,
  ...rest
}) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const errorId = `${inputId}-error`;
  const showError = Boolean(error);
  const inputRef = useRef(null);
  const [editable, setEditable] = useState(!preventAutofill);

  const inputProps = {};
  for (const [key, val] of Object.entries(rest)) {
    if (INPUT_PROP_KEYS.has(key)) inputProps[key] = val;
  }

  const safeValue = normalizeInputValue(value);

  useLayoutEffect(() => {
    if (!preventAutofill) return;
    const el = inputRef.current;
    if (!el) return;
    if (isGarbageAutofill(el.value)) {
      el.value = "";
      onChange?.("");
    }
  }, [preventAutofill, safeValue, onChange]);

  function handleFocus(e) {
    if (preventAutofill && !editable) {
      setEditable(true);
      const domValue = inputRef.current?.value;
      if (isGarbageAutofill(domValue) || isGarbageAutofill(safeValue)) {
        onChange?.("");
      }
    }
    onFocus?.(e);
  }

  function handleChange(e) {
    onChange?.(normalizeInputChange(e));
  }

  return (
    <div className="relative">
      {Icon && (
        <div
          className={[
            "pointer-events-none absolute inset-y-0 left-4 flex items-center transition-colors",
            showError ? "text-rose-400/80" : "text-[color:var(--muted2)]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <input
        ref={inputRef}
        id={inputId}
        {...inputProps}
        value={safeValue}
        readOnly={preventAutofill && !editable}
        autoComplete={preventAutofill ? "off" : inputProps.autoComplete}
        data-lpignore={preventAutofill ? "true" : undefined}
        data-1p-ignore={preventAutofill ? "true" : undefined}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={onBlur}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
        className={[
          "cm-input h-14 w-full rounded-[var(--radius-pill)] text-base transition",
          Icon ? "pl-12" : "pl-5",
          right ? "pr-14" : "pr-5",
          showError ? "cm-input-error" : "",
          preventAutofill && !editable ? "cursor-text" : "",
          className,
        ].join(" ")}
      />
      {right && (
        <div className="absolute inset-y-0 right-3 flex items-center">{right}</div>
      )}
    </div>
  );
}

export function AccentButton({ children, className = "", disabled, type = "submit", ...props }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        "cm-btn-accent h-14 w-full rounded-[var(--radius-pill)] text-base font-semibold transition",
        "focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
        disabled ? "cursor-not-allowed opacity-60" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthAlert({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-[var(--radius-xl)] border border-rose-200/80 bg-[color:var(--dangerBg)] px-4 py-3 text-sm text-[color:var(--danger)]">
      {children}
    </div>
  );
}

export function AuthThemeCorner() {
  return (
    <div className="fixed right-5 top-5 z-50">
      <ThemeToggle />
    </div>
  );
}
