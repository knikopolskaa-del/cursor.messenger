import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";

function Label({ children }) {
  return <div className="text-[12px] font-semibold text-slate-200/85">{children}</div>;
}

function FieldHint({ children }) {
  return <div className="mt-1 text-[11px] text-slate-300/70">{children}</div>;
}

function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-[11px] font-semibold text-rose-200/90">{children}</div>;
}

function TextInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  right,
  error,
  maxLength,
  inputMode,
}) {
  return (
    <div className="relative">
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={[
          "h-11 w-full rounded-2xl border bg-slate-950/40 px-4 pr-20 text-sm text-slate-100",
          "shadow-[inset_0_1px_0_rgba(255,255,255,.06)] outline-none backdrop-blur transition",
          "placeholder:text-slate-400/70",
          error
            ? "border-rose-300/40 focus:border-rose-200/60 focus:ring-4 focus:ring-rose-300/20"
            : "border-white/10 focus:border-white/20 focus:ring-4 focus:ring-sky-200/10",
        ].join(" ")}
      />
      {right && <div className="absolute inset-y-0 right-3 flex items-center">{right}</div>}
    </div>
  );
}

function PaperButton({ onClick, disabled, children, variant = "primary" }) {
  const base =
    "h-11 w-full rounded-2xl border px-4 text-sm font-semibold transition focus:outline-none focus:ring-4";
  const cls =
    variant === "ghost"
      ? [
          base,
          "border-white/10 bg-white/5 text-slate-100 hover:bg-white/7 focus:ring-sky-200/15",
          disabled ? "cursor-not-allowed opacity-60 hover:bg-white/5" : "",
        ].join(" ")
      : [
          base,
          "border-white/10 bg-white/10 text-slate-50 hover:bg-white/15 focus:ring-sky-200/20",
          disabled ? "cursor-not-allowed opacity-60 hover:bg-white/10" : "",
        ].join(" ");
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

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
      if (!show) return "text-slate-300/50";
      if (info.ok) return "text-emerald-200/90";
      return ok ? "text-slate-300/55" : "text-rose-200/90";
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
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0b1020] p-6 font-ui text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[620px] w-[620px] rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.06),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,.05),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,.04),transparent_50%)] opacity-70" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-2 shadow-paper backdrop-blur">
          <div className="rounded-[22px] border border-white/10 bg-[#0f1730]/80 px-8 py-8">
            <div className="text-center">
              <div className="font-proto text-[54px] font-bold leading-[0.92] tracking-tight text-slate-100">
                Регистрация
              </div>
              <div className="mt-2 text-sm text-slate-200/80">
                Создайте аккаунт, чтобы начать работу
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label>E-mail</Label>
                <TextInput
                  {...form.field("email")}
                  type="email"
                  placeholder="user@gmail.com"
                  maxLength={100}
                  error={form.field("email").error}
                />
                <FieldError>{form.field("email").error}</FieldError>
              </div>

              <div>
                <Label>ФИО</Label>
                <TextInput
                  {...form.field("name")}
                  placeholder="Иванов Иван"
                  maxLength={80}
                  error={form.field("name").error}
                  onChange={(v) => form.field("name").onChange(filterByAllowedCharset(v, /[А-Яа-яЁё\s\-]/))}
                />
                <FieldError>{form.field("name").error}</FieldError>
              </div>

              <div>
                <Label>Пароль</Label>
                <TextInput
                  {...form.field("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Qwerty!234"
                  maxLength={100}
                  error={form.field("password").error}
                  onChange={(v) =>
                    form
                      .field("password")
                      .onChange(filterByAllowedCharset(v, /[A-Za-z0-9!@#$%^&*?_\-]/))
                  }
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword((x) => !x)}
                      className="h-8 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-slate-100/80 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-sky-200/15"
                    >
                      {showPassword ? "Скрыть" : "Показать"}
                    </button>
                  }
                />
                {passwordHint}
                <FieldError>{form.field("password").error}</FieldError>
              </div>

              <div>
                <Label>Подтверждение пароля</Label>
                <TextInput
                  {...form.field("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Qwerty!234"
                  maxLength={100}
                  error={form.field("confirmPassword").error}
                  onChange={(v) =>
                    form
                      .field("confirmPassword")
                      .onChange(filterByAllowedCharset(v, /[A-Za-z0-9!@#$%^&*?_\-]/))
                  }
                />
                <FieldError>{form.field("confirmPassword").error}</FieldError>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Должность</Label>
                  <TextInput
                    {...form.field("title")}
                    placeholder="Дизайнер"
                    maxLength={150}
                    error={form.field("title").error}
                    onChange={(v) =>
                      form.field("title").onChange(filterByAllowedCharset(v, /[A-Za-zА-Яа-яЁё\s\-]/))
                    }
                  />
                  <FieldError>{form.field("title").error}</FieldError>
                </div>
                <div>
                  <Label>Отдел</Label>
                  <TextInput
                    {...form.field("department")}
                    placeholder="Дизайн"
                    maxLength={200}
                    error={form.field("department").error}
                  />
                  <FieldError>{form.field("department").error}</FieldError>
                </div>
              </div>

              <div>
                <Label>Телефон</Label>
                <TextInput
                  {...form.field("phone")}
                  type="tel"
                  inputMode="tel"
                  placeholder="+7 (999) 000-00-00"
                  maxLength={32}
                  error={form.field("phone").error}
                />
                <FieldError>{form.field("phone").error}</FieldError>
                <FieldHint>Можно оставить пустым.</FieldHint>
              </div>

              {apiError && (
                <div className="rounded-2xl border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {apiErrorText}
                </div>
              )}

              <PaperButton onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Подождите…" : "Создать аккаунт"}
              </PaperButton>

              <div className="pt-1 text-center">
                <div className="text-sm text-slate-200/75">
                  Уже есть аккаунт?{" "}
                  <a
                    href="/login"
                    className="font-semibold text-slate-50 underline decoration-slate-200/35 underline-offset-4 hover:decoration-slate-200/60"
                  >
                    Войти
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

