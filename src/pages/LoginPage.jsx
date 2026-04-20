import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, Button, InputV2 as Input, Field } from "../components/ui.jsx";

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
    setApiError(false);
    if (!form.isValid) return;

    setSubmitting(true);
    try {
      await login(form.values.email.trim(), form.values.password);
      navigate("/app", { replace: true });
    } catch (e) {
      setApiError(true);
      setApiErrorText(
        e.status === 401 ? "Неверный e-mail или пароль." : api.formatApiError(e),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <div className="text-2xl font-semibold">Добро пожаловать</div>
        </div>

        <Card title="Вход в аккаунт">
          <div className="space-y-4">
            <Field label="E-mail" error={form.field("email").error}>
              <Input
                {...form.field("email")}
                type="email"
                placeholder="user@gmail.com"
                maxLength={100}
              />
            </Field>

            <Field label="Пароль" error={form.field("password").error}>
              <Input
                {...form.field("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Qwerty!234"
                maxLength={100}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-white/55 hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                }
              />
            </Field>

            {apiError && (
              <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                {apiErrorText}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Вход…" : "Войти"}
            </Button>

            <div className="text-sm text-white/50">
              Еще нет аккаунта?{" "}
              <a
                href="/register"
                className="text-white/80 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Зарегистрироваться
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
