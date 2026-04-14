import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { users } from "../mock.js";
import { userTypeLabel } from "../lib/utils.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, Button, Input, Field } from "../components/ui.jsx";

export default function LoginPage({ onLoginAs }) {
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
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

  function handleSubmit() {
    form.touchAll();
    setNotFound(false);
    if (!form.isValid) return;

    const matched = users.find(
      (u) => u.email.toLowerCase() === form.values.email.trim().toLowerCase(),
    );
    if (!matched) {
      setNotFound(true);
      return;
    }
    onLoginAs(matched.id);
    navigate("/app", { replace: true });
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
                placeholder="name@company.local"
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

            {notFound && (
              <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                Пользователь с таким e-mail не найден.
              </div>
            )}

            <Button onClick={handleSubmit}>Войти</Button>

            {/* Подсказка с демо-аккаунтами */}
            <div className="rounded-lg bg-white/5 p-3 text-xs text-white/40">
              <div className="mb-1 font-semibold text-white/55">Демо-аккаунты:</div>
              {users.map((u) => (
                <div key={u.id}>
                  {u.email} — {userTypeLabel(u.userType)}
                </div>
              ))}
              <div className="mt-1">Пароль — любой, от 6 символов.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
