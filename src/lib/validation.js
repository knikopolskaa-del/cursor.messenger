import { useState, useMemo, useEffect } from "react";

export const rules = {
  required:
    (msg = "Обязательное поле") =>
    (v) =>
      !String(v).trim() ? msg : null,

  minLen:
    (n, msg) =>
    (v) =>
      String(v).trim().length < n ? (msg ?? `Минимум ${n} символов`) : null,

  maxLen:
    (n, msg) =>
    (v) =>
      String(v).trim().length > n ? (msg ?? `Максимум ${n} символов`) : null,

  email:
    (msg = "Введите корректный e-mail") =>
    (v) =>
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? msg : null,

  // Только буквы (рус/лат), цифры, дефис, подчёркивание — без пробелов
  slug:
    (msg = "Только буквы, цифры, дефис и подчёркивание — без пробелов") =>
    (v) =>
      !/^[a-zа-яёA-ZА-ЯЁ0-9_-]+$/i.test(String(v).trim()) ? msg : null,

  phone:
    (msg = "Введите корректный номер телефона") =>
    (v) => {
      const s = String(v ?? "").trim();
      if (!s) return null;
      const digits = s.replace(/\D/g, "");
      // Для маски +7 (...) при фокусе может появляться только "7" — не считаем это ошибкой.
      if (digits === "" || digits === "7") return null;
      // Полный номер РФ: 11 цифр, начинается с 7.
      if (digits.length !== 11 || digits[0] !== "7") return msg;
      return null;
    },

  regex:
    (re, msg = "Некорректный формат") =>
    (v) => {
      const t = String(v ?? "").trim();
      if (!t) return null;
      return re.test(t) ? null : msg;
    },
};

function runValidators(value, validators = [], values) {
  for (const v of validators) {
    const err = v(value, values);
    if (err) return err;
  }
  return null;
}

/** Строка для controlled input — никогда не отдаём object/event в value. */
export function normalizeInputValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return v === "[object Object]" ? "" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && "target" in v && v.target != null) {
    return normalizeInputValue(v.target.value);
  }
  return "";
}

/** onChange из useForm принимает строку или native event. */
export function normalizeInputChange(v) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "object" && "target" in v) return normalizeInputValue(v.target.value);
  return normalizeInputValue(v);
}

// useForm: принимает { fieldName: { initial, validators } }
export function useForm(schema) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(Object.entries(schema).map(([k, s]) => [k, s.initial ?? ""])),
  );
  const [touched, setTouched] = useState({});

  const errors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(schema).map(([k, s]) => [
          k,
          runValidators(normalizeInputValue(values[k]), s.validators, values),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values],
  );

  useEffect(() => {
    setValues((prev) => {
      let dirty = false;
      const next = { ...prev };
      for (const k of Object.keys(schema)) {
        const normalized = normalizeInputValue(prev[k]);
        if (normalized !== prev[k]) {
          next[k] = normalized;
          dirty = true;
        }
      }
      return dirty ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = Object.values(errors).every((e) => !e);

  function field(name) {
    return {
      value: normalizeInputValue(values[name]),
      onChange: (v) =>
        setValues((prev) => ({ ...prev, [name]: normalizeInputChange(v) })),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
      error: touched[name] ? errors[name] : null,
    };
  }

  function touchAll() {
    setTouched(Object.fromEntries(Object.keys(schema).map((k) => [k, true])));
  }

  return { values, errors, isValid, field, touchAll };
}
