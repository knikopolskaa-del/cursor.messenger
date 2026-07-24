import React, { useEffect, useState } from "react";
import { getInitialTheme, toggleTheme } from "../lib/theme.js";

export function ThemeToggle({ className = "", compact = false }) {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    const t = document.documentElement?.dataset?.theme;
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  const isDark = theme === "dark";
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setTheme((t) => toggleTheme(t))}
        className={[
          "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition",
          "border-[color:var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]",
          "focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
          className,
        ].join(" ")}
        aria-label="Переключить тему"
        title={isDark ? "Светлая тема" : "Тёмная тема"}
      >
        <span className="text-base leading-none" aria-hidden>
          {isDark ? "☾" : "☼"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => toggleTheme(t))}
      className={[
        "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border transition",
        "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] hover:bg-[color:var(--accent-soft)]",
        "focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]",
        compact ? "px-2.5 py-2" : "px-3 py-2 text-xs font-semibold shadow-soft",
        className,
      ].join(" ")}
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      <span
        className={[
          "inline-flex items-center justify-center rounded-full border",
          compact ? "h-8 w-8 text-base" : "h-7 w-7 text-sm",
          "border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--fg)]",
        ].join(" ")}
        aria-hidden
      >
        {isDark ? "☾" : "☼"}
      </span>
      {!compact && <span className="min-w-[62px] text-left">{isDark ? "Тёмная" : "Светлая"}</span>}
    </button>
  );
}

export function ThemeToggleFloating() {
  return (
    <div className="fixed right-4 top-4 z-50">
      <ThemeToggle />
    </div>
  );
}

