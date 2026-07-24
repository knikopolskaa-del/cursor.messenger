import React, { useState } from "react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, token, me, booting } = useMessenger();
  const [apiError, setApiError] = useState(false);
  const [apiErrorText, setApiErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    email: {
      initial: "",
      validators: [
        rules.required("Введите e-mail"),
        rules.email(),
        rules.maxLen(100, "Максимум 100 символов"),
      ],
    },
    password: {
      initial: "",
      validators: [rules.required("Введите пароль"), rules.maxLen(100, "Максимум 100 символов")],
    },
  });

  const email = form.field("email");
  const password = form.field("password");

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
    setApiError(false);
    if (!form.isValid) return;

    setSubmitting(true);
    try {
      await login(form.values.email.trim(), form.values.password);
      navigate("/app", { replace: true });
    } catch (err) {
      setApiError(true);
      setApiErrorText(
        err.status === 401 ? "Неверный e-mail или пароль." : api.formatApiError(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthBackdrop>
      <AuthThemeCorner />
      <GlassCard>
        <AuthTitle
          title="С возвращением!"
          subtitle="Войдите в корпоративный мессенджер"
        />

        <form className="space-y-5" onSubmit={handleSubmit} noValidate autoComplete="off">
          <div>
            <AuthLabel htmlFor="login-email">E-mail</AuthLabel>
            <AuthInput
              id="login-email"
              name="cm-login-email"
              value={email.value}
              onChange={email.onChange}
              onBlur={email.onBlur}
              error={email.error}
              preventAutofill
              type="email"
              inputMode="email"
              placeholder="user@company.ru"
              icon={IconMail}
            />
            <AuthFieldError id="login-email-error">{email.error}</AuthFieldError>
          </div>

          <div>
            <AuthLabel htmlFor="login-password">Пароль</AuthLabel>
            <AuthInput
              id="login-password"
              name="cm-login-password"
              value={password.value}
              onChange={password.onChange}
              onBlur={password.onBlur}
              error={password.error}
              preventAutofill
              type={showPassword ? "text" : "password"}
              placeholder="Qwerty!234"
              icon={IconLock}
              right={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)]"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                </button>
              }
            />
            <AuthFieldError id="login-password-error">{password.error}</AuthFieldError>
          </div>

          {apiError && <AuthAlert>{apiErrorText}</AuthAlert>}

          <AccentButton disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </AccentButton>

          <p className="pt-1 text-center text-base text-[color:var(--muted)]">
            Ещё нет аккаунта?{" "}
            <a
              href="/register"
              className="font-semibold text-[color:var(--accent)] underline decoration-[color:var(--accent)]/30 underline-offset-4 hover:decoration-[color:var(--accent)]"
            >
              Зарегистрироваться
            </a>
          </p>
        </form>
      </GlassCard>
    </AuthBackdrop>
  );
}
