import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { userTypeLabel } from "../lib/utils.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, Button, Input, Field } from "../components/ui.jsx";

const DEMO_ACCOUNTS = [
  { email: "maria@example.com", role: "employee" },
  { email: "ivan@example.com", role: "employee" },
  { email: "anna@example.com", role: "admin" },
  { email: "alex.contractor@example.com", role: "guest" },
];

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
      validators: [rules.required("Введите e-mail"), rules.email()],
    },
    password: {
      initial: "",
      validators: [
        rules.required("Введите пароль"),
        rules.minLen(6, "Минимум 6 символов"),
      ],
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
          <div className="mt-1 text-sm text-white/50">Войдите, чтобы продолжить</div>
        </div>

        <Card title="Вход в аккаунт">
          <div className="space-y-4">
            <Field label="E-mail" error={form.field("email").error}>
              <Input
                {...form.field("email")}
                type="email"
                placeholder="name@example.com"
              />
            </Field>

            <Field label="Пароль" error={form.field("password").error}>
              <div className="relative">
                <Input
                  {...form.field("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/70"
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </Field>

            {apiError && (
              <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                {apiErrorText}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Вход…" : "Войти"}
            </Button>

            <div className="rounded-lg bg-white/5 p-3 text-xs text-white/40">
              <div className="mb-1 font-semibold text-white/55">Демо-аккаунты (пароль один):</div>
              {DEMO_ACCOUNTS.map((a) => (
                <div key={a.email}>
                  {a.email} — {userTypeLabel(a.role)}
                </div>
              ))}
              <div className="mt-1">Пароль: <span className="text-white/55">secret12</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
