import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";
import { IconEye, IconEyeOff, IconLock, IconMail } from "../design/icons.jsx";
import {
  AccentButton,
  AuthAlert,
  AuthBackdrop,
  AuthFieldError,
  AuthInput,
  AuthLabel,
  AuthThemeCorner,
  AuthTitle,
  GlassCard,
} from "../design/glassUi.jsx";

const RE_FIO = /^[А-Яа-яЁё\s\-]+$/;
const RE_TITLE = /^[A-Za-zА-Яа-яЁё\s\-]+$/;
const RE_PASSWORD = /[A-Za-z0-9!@#$%^&*?_\-]/;

function filterByAllowedCharset(v, re) {
  const s = String(v ?? "");
  let out = "";
  for (const ch of s) {
    if (re.test(ch)) out += ch;
  }
  return out;
}

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { token, me, booting, resumeSessionWithToken } = useMessenger();
  const [apiError, setApiError] = useState(false);
  const [apiErrorText, setApiErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwChecked, setPwChecked] = useState(false);

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
        validators: [],
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
  const email = form.field("email");
  const name = form.field("name");
  const password = form.field("password");
  const confirmPassword = form.field("confirmPassword");
  const title = form.field("title");
  const department = form.field("department");
  const phone = form.field("phone");

  if (booting) {
    return (
      <div className="grid min-h-dvh place-items-center text-base text-[color:var(--muted)]">
        Загрузка...
      </div>
    );
  }

  if (token && me) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    form.touchAll();
    setPwChecked(true);
    setApiError(false);
    const pwInfo = passwordChecklist(form.values.password);
    if (!form.isValid || !pwInfo.ok) return;

    setSubmitting(true);
    try {
      const emailVal = form.values.email.trim();
      const fio = form.values.name.trim();
      const passwordVal = form.values.password;
      const passwordConfirm = form.values.confirmPassword;
      const { accessToken } = await api.register(emailVal, passwordVal, fio, passwordConfirm);

      const patch = {};
      const titleVal = form.values.title.trim();
      const departmentVal = form.values.department.trim();
      const phoneVal = form.values.phone.trim();
      if (titleVal) patch.title = titleVal;
      if (departmentVal) patch.department = departmentVal;
      if (phoneVal) patch.phone = phoneVal;
      if (Object.keys(patch).length > 0) {
        await api.patchMe(accessToken, patch);
      }

      resumeSessionWithToken(accessToken);
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(true);
      setApiErrorText(api.formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const pwInfo = passwordChecklist(form.values.password);
  const passwordEmpty = !String(form.values.password ?? "").trim();
  const showPwHint = pwChecked || !passwordEmpty;
  const hintCls = (ok) => {
    if (!showPwHint) return "text-[color:var(--muted2)]";
    if (pwInfo.ok) return "text-emerald-600/90";
    if (passwordEmpty) return "text-[color:var(--danger)]";
    return ok ? "text-[color:var(--muted)]" : "text-[color:var(--danger)]";
  };

  function handlePasswordBlur() {
    password.onBlur();
    if (!String(form.values.password ?? "").trim()) setPwChecked(true);
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((x) => !x)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]"
      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
    >
      {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
    </button>
  );

  return (
    <AuthBackdrop>
      <AuthThemeCorner />
      <GlassCard className="max-w-lg">
        <AuthTitle title="Регистрация" subtitle="Создайте аккаунт, чтобы начать работу" />

        <form className="space-y-4" onSubmit={handleSubmit} noValidate autoComplete="off">
          <div>
            <AuthLabel htmlFor="register-email">E-mail</AuthLabel>
            <AuthInput
              id="register-email"
              name="cm-register-email"
              value={email.value}
              onChange={email.onChange}
              onBlur={email.onBlur}
              error={email.error}
              preventAutofill
              type="email"
              inputMode="email"
              maxLength={100}
              placeholder="user@company.ru"
              icon={IconMail}
            />
            <AuthFieldError>{email.error}</AuthFieldError>
          </div>

          <div>
            <AuthLabel htmlFor="register-name">ФИО</AuthLabel>
            <AuthInput
              id="register-name"
              name="cm-register-name"
              value={name.value}
              onChange={(v) => name.onChange(filterByAllowedCharset(v, RE_FIO))}
              onBlur={name.onBlur}
              error={name.error}
              preventAutofill
              maxLength={80}
              placeholder="Иванов Иван"
            />
            <AuthFieldError>{name.error}</AuthFieldError>
          </div>

          <div>
            <AuthLabel htmlFor="register-password">Пароль</AuthLabel>
            <AuthInput
              id="register-password"
              name="cm-register-password"
              value={password.value}
              onChange={(v) => password.onChange(filterByAllowedCharset(v, RE_PASSWORD))}
              onBlur={handlePasswordBlur}
              error={showPwHint && !pwInfo.ok ? " " : password.error}
              preventAutofill
              type={showPassword ? "text" : "password"}
              maxLength={100}
              placeholder="••••••••"
              icon={IconLock}
              right={passwordToggle}
            />
            <div className="mt-1.5 space-y-0.5 text-xs">
              <div className={hintCls(pwInfo.hasLen)}>От 8 до 100 символов</div>
              <div className={hintCls(pwInfo.hasUpper && pwInfo.hasLower)}>Заглавные и строчные буквы</div>
              <div className={hintCls(pwInfo.hasDigit && pwInfo.hasSpecial)}>
                Хотя бы одна цифра и один специальный символ (например: ! @ # $ % ^ & * ? _ -)
              </div>
            </div>
          </div>

          <div>
            <AuthLabel htmlFor="register-password-confirm">Подтверждение пароля</AuthLabel>
            <AuthInput
              id="register-password-confirm"
              name="cm-register-password-confirm"
              value={confirmPassword.value}
              onChange={(v) => confirmPassword.onChange(filterByAllowedCharset(v, RE_PASSWORD))}
              onBlur={confirmPassword.onBlur}
              error={confirmPassword.error}
              preventAutofill
              type={showPassword ? "text" : "password"}
              maxLength={100}
              placeholder="••••••••"
              icon={IconLock}
            />
            <AuthFieldError>{confirmPassword.error}</AuthFieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <AuthLabel htmlFor="register-title">Должность</AuthLabel>
              <AuthInput
                id="register-title"
                name="cm-register-title"
                value={title.value}
                onChange={(v) => title.onChange(filterByAllowedCharset(v, RE_TITLE))}
                onBlur={title.onBlur}
                error={title.error}
                preventAutofill
                maxLength={150}
                placeholder="Дизайнер"
              />
              <AuthFieldError>{title.error}</AuthFieldError>
            </div>
            <div>
              <AuthLabel htmlFor="register-department">Отдел</AuthLabel>
              <AuthInput
                id="register-department"
                name="cm-register-department"
                value={department.value}
                onChange={department.onChange}
                onBlur={department.onBlur}
                error={department.error}
                preventAutofill
                maxLength={200}
                placeholder="Дизайн"
              />
              <AuthFieldError>{department.error}</AuthFieldError>
            </div>
          </div>

          <div>
            <AuthLabel htmlFor="register-phone">Телефон</AuthLabel>
            <AuthInput
              id="register-phone"
              name="cm-register-phone"
              value={phone.value}
              onChange={phone.onChange}
              onBlur={phone.onBlur}
              error={phone.error}
              preventAutofill
              type="tel"
              inputMode="tel"
              maxLength={32}
              placeholder="+7 (999) 000-00-00"
            />
            <AuthFieldError>{phone.error}</AuthFieldError>
            <p className="mt-1 text-xs text-[color:var(--muted2)]">Можно оставить пустым.</p>
          </div>

          {apiError && <AuthAlert>{apiErrorText}</AuthAlert>}

          <AccentButton disabled={submitting}>
            {submitting ? "Подождите…" : "Создать аккаунт"}
          </AccentButton>

          <p className="pt-1 text-center text-base text-[color:var(--muted)]">
            Уже есть аккаунт?{" "}
            <a
              href="/login"
              className="font-semibold text-[color:var(--accent)] underline decoration-[color:var(--accent)]/30 underline-offset-4 hover:decoration-[color:var(--accent)]"
            >
              Войти
            </a>
          </p>
        </form>
      </GlassCard>
    </AuthBackdrop>
  );
}
