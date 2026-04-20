import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, Button, InputV2 as Input, Field } from "../components/ui.jsx";

const RE_FIO = /^[А-Яа-яЁё\s\-]+$/;
const RE_TITLE = /^[A-Za-zА-Яа-яЁё\s\-]+$/;

function filterByAllowedCharset(v, re) {
  const s = String(v ?? "");
  let out = "";
  for (const ch of s) {
    if (re.test(ch)) out += ch;
  }
  return out;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { token, me, booting, refreshMe } = useMessenger();
  const [apiError, setApiError] = useState(false);
  const [apiErrorText, setApiErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwChecked, setPwChecked] = useState(false);

  function passwordChecklist(pw) {
    const s = String(pw ?? "");
    const hasLen = s.length >= 8 && s.length <= 100;
    const hasUpper = /[A-Z]/.test(s);
    const hasLower = /[a-z]/.test(s);
    const hasDigit = /[0-9]/.test(s);
    const hasSpecial = /[!@#$%^&*?_\\-]/.test(s);
    return {
      ok: hasLen && hasUpper && hasLower && hasDigit && hasSpecial,
      hasLen,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    };
  }

  const schema = useMemo(
    () => ({
      email: {
        initial: "",
        validators: [
          rules.required("Введите e-mail"),
          rules.email(),
          rules.maxLen(100, "Максимум 100 символов"),
        ],
      },
      name: {
        initial: "",
        validators: [
          rules.required("Введите ФИО"),
          rules.minLen(2, "Минимум 2 символа"),
          rules.maxLen(80, "Максимум 80 символов"),
          rules.regex(RE_FIO, "ФИО: только кириллица, пробел и тире"),
        ],
      },
      password: {
        initial: "",
        validators: [rules.required("Введите пароль")],
      },
      confirmPassword: {
        initial: "",
        validators: [
          rules.required("Введите подтверждение пароля"),
          (v, values) =>
            String(v ?? "") === String(values.password ?? "") ? null : "Введенные пароли не совпадают",
        ],
      },
      title: {
        initial: "",
        validators: [
          rules.maxLen(150, "Максимум 150 символов"),
          rules.regex(RE_TITLE, "Должность: только буквы, пробел и тире"),
        ],
      },
      department: {
        initial: "",
        validators: [rules.maxLen(200, "Максимум 200 символов")],
      },
      phone: {
        initial: "",
        validators: [rules.phone("Введите корректный номер телефона")],
      },
    }),
    [],
  );

  const form = useForm(schema);

  if (booting) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 text-sm text-white/60">
        Загрузка...
      </div>
    );
  }

  if (token && me) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit() {
    form.touchAll();
    setPwChecked(true);
    setApiError(false);
    const pwInfo = passwordChecklist(form.values.password);
    if (!form.isValid || !pwInfo.ok) return;

    setSubmitting(true);
    try {
      const email = form.values.email.trim();
      const fio = form.values.name.trim();
      const password = form.values.password;
      const passwordConfirm = form.values.confirmPassword;
      const { accessToken } = await api.register(email, password, fio, passwordConfirm);
      localStorage.setItem(api.TOKEN_KEY, accessToken);

      const patch = {};
      const title = form.values.title.trim();
      const department = form.values.department.trim();
      const phone = form.values.phone.trim();
      if (title) patch.title = title;
      if (department) patch.department = department;
      if (phone) patch.phone = phone;
      if (Object.keys(patch).length > 0) {
        await api.patchMe(accessToken, patch);
      }

      await refreshMe();
      navigate("/app", { replace: true });
    } catch (e) {
      setApiError(true);
      setApiErrorText(api.formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  const passwordHint = (() => {
    const info = passwordChecklist(form.values.password);
    const show =
      pwChecked || Boolean(form.field("password").error) || String(form.values.password ?? "").length > 0;
    const cls = (ok) => {
      if (!show) return "text-white/40";
      if (info.ok) return "text-emerald-300/90";
      return ok ? "text-white/40" : "text-rose-300";
    };
    return (
      <div className="mt-1 space-y-0.5 text-[11px]">
        <div className={cls(info.hasLen)}>От 8 до 100 символов</div>
        <div className={cls(info.hasUpper && info.hasLower)}>Заглавные и строчные буквы</div>
        <div className={cls(info.hasDigit && info.hasSpecial)}>
          Хотя бы одна цифра и один специальный символ (например: ! @ # $ % ^ & * ? _ -)
        </div>
      </div>
    );
  })();

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <div className="text-2xl font-semibold">Регистрация</div>
        </div>

        <Card title="Создать аккаунт">
          <div className="space-y-4">
            <Field label="E-mail" error={form.field("email").error}>
              <Input {...form.field("email")} type="email" placeholder="user@gmail.com" maxLength={100} />
            </Field>

            <Field label="ФИО" error={form.field("name").error}>
              <Input
                {...form.field("name")}
                placeholder="Иванов Иван"
                maxLength={80}
                onChange={(v) => form.field("name").onChange(filterByAllowedCharset(v, /[А-Яа-яЁё\s\-]/))}
              />
            </Field>

            <Field label="Пароль" error={form.field("password").error}>
              <Input
                {...form.field("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Qwerty!234"
                maxLength={100}
                onChange={(v) => form.field("password").onChange(filterByAllowedCharset(v, /[A-Za-z0-9!@#$%^&*?_\-]/))}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((x) => !x)}
                    className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-white/55 hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                }
              />
              {passwordHint}
            </Field>

            <Field label="Подтверждение пароля" error={form.field("confirmPassword").error}>
              <Input
                {...form.field("confirmPassword")}
                type={showPassword ? "text" : "password"}
                placeholder="Qwerty!234"
                maxLength={100}
                onChange={(v) =>
                  form.field("confirmPassword").onChange(filterByAllowedCharset(v, /[A-Za-z0-9!@#$%^&*?_\-]/))
                }
              />
            </Field>

            <Field label="Должность" error={form.field("title").error}>
              <Input
                {...form.field("title")}
                placeholder="Дизайнер"
                maxLength={150}
                onChange={(v) =>
                  form.field("title").onChange(filterByAllowedCharset(v, /[A-Za-zА-Яа-яЁё\s\-]/))
                }
              />
            </Field>

            <Field label="Отдел" error={form.field("department").error}>
              <Input {...form.field("department")} placeholder="Дизайн" maxLength={200} />
            </Field>

            <Field label="Телефон" error={form.field("phone").error}>
              <Input
                {...form.field("phone")}
                type="tel"
                inputMode="tel"
                placeholder="+7 (999) 000-00-00"
                maxLength={32}
              />
            </Field>

            {apiError && (
              <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                {apiErrorText}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Подождите…" : "Создать аккаунт"}
            </Button>

            <div className="text-sm text-white/50">
              Уже есть аккаунт?{" "}
              <a
                href="/login"
                className="text-white/80 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Войти
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

