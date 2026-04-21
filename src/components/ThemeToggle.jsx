import React, { useEffect, useState } from "react";
import { getInitialTheme, toggleTheme } from "../lib/theme.js";

export function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    const t = document.documentElement?.dataset?.theme;
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme((t) => toggleTheme(t))}
      className={[
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-paper backdrop-blur transition",
        "border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--fg)] hover:bg-[color:var(--panel)]/80",
        "focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]",
        className,
      ].join(" ")}
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      <span
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded-xl border",
          "border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--fg)]",
        ].join(" ")}
        aria-hidden
      >
        {isDark ? "☾" : "☼"}
      </span>
      <span className="min-w-[62px] text-left">{isDark ? "Тёмная" : "Светлая"}</span>
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

