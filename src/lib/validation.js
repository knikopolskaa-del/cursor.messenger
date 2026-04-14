import { useState, useMemo } from "react";

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
    (msg = "Введите телефон в формате +7 (999) 000-00-00") =>
    (v) =>
      v.trim() && !/^\+?[\d\s\(\)\-]{7,20}$/.test(v.trim()) ? msg : null,
};

function runValidators(value, validators = []) {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return null;
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
        Object.entries(schema).map(([k, s]) => [k, runValidators(values[k], s.validators)]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values],
  );

  const isValid = Object.values(errors).every((e) => !e);

  function field(name) {
    return {
      value: values[name],
      onChange: (v) => setValues((prev) => ({ ...prev, [name]: v })),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
      error: touched[name] ? errors[name] : null,
    };
  }

  function touchAll() {
    setTouched(Object.fromEntries(Object.keys(schema).map((k) => [k, true])));
  }

  return { values, errors, isValid, field, touchAll };
}
