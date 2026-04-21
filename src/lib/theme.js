export const THEME_KEY = "cm_theme";

export function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

export function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "light";
  }
}

export function setStoredTheme(theme) {
  const t = normalizeTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // ignore
  }
  return t;
}

export function applyTheme(theme) {
  const t = normalizeTheme(theme);
  const root = document.documentElement;
  root.dataset.theme = t;
  root.classList.toggle("dark", t === "dark");
  return t;
}

export function getInitialTheme() {
  const dom = typeof document !== "undefined" ? document.documentElement?.dataset?.theme : null;
  if (dom === "light" || dom === "dark") return dom;
  return getStoredTheme();
}

export function toggleTheme(current) {
  const next = normalizeTheme(current) === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
  return next;
}

