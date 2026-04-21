import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";

function Label({ children }) {
  return <div className="text-[12px] font-semibold text-slate-700/80">{children}</div>;
}

function FieldHint({ children }) {
  return <div className="mt-1 text-[11px] text-slate-600/70">{children}</div>;
}

function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-[11px] font-semibold text-rose-600/90">{children}</div>;
}

function TextInput({ value, onChange, onBlur, placeholder, type = "text", right, error }) {
  return (
    <div className="relative">
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={[
          "h-11 w-full rounded-2xl border bg-white px-4 pr-20 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(15,23,42,.05)] outline-none transition",
          "placeholder:text-slate-400",
          error
            ? "border-rose-300 focus:border-rose-300 focus:ring-4 focus:ring-rose-200/60"
            : "border-slate-200 focus:border-slate-300 focus:ring-4 focus:ring-sky-200/60",
        ].join(" ")}
      />
      {right && <div className="absolute inset-y-0 right-3 flex items-center">{right}</div>}
    </div>
  );
}

function PaperButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-paper transition",
        "hover:bg-slate-50 active:translate-y-[1px] active:shadow-[0_10px_30px_rgba(17,24,39,.08)]",
        "focus:outline-none focus:ring-4 focus:ring-sky-200/70",
        disabled ? "cursor-not-allowed opacity-60 hover:bg-white active:translate-y-0" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

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
      <div className="grid min-h-dvh place-items-center bg-[#d7e8f2] text-sm text-slate-700">
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
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#d7e8f2] p-6 font-ui text-slate-800">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-white/55 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[620px] w-[620px] rounded-full bg-sky-300/55 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.55),transparent_42%),radial-gradient(circle_at_80%_25%,rgba(125,211,252,.35),transparent_48%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,.35),transparent_55%)] opacity-80" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="rounded-[28px] border border-slate-800/10 bg-white/60 p-2 shadow-paper backdrop-blur">
          <div className="rounded-[22px] border border-slate-900/10 bg-[#f3f4f2] px-8 py-8">
            <div className="text-center">
              <div className="font-proto text-[54px] font-bold leading-[0.92] tracking-tight text-slate-800">
                Добро пожаловать!
              </div>
              <div className="mt-2 text-sm text-slate-600/80">
                Войдите, чтобы продолжить работу
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label>E-mail</Label>
                <TextInput
                  {...form.field("email")}
                  type="email"
                  placeholder="user@gmail.com"
                  error={form.field("email").error}
                />
                <FieldError>{form.field("email").error}</FieldError>
              </div>

              <div>
                <Label>Пароль</Label>
                <TextInput
                  {...form.field("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Qwerty!234"
                  error={form.field("password").error}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-200/70"
                    >
                      {showPassword ? "Скрыть" : "Показать"}
                    </button>
                  }
                />
                <FieldError>{form.field("password").error}</FieldError>
              </div>

              {apiError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {apiErrorText}
                </div>
              )}

              <PaperButton onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Вход…" : "Войти"}
              </PaperButton>

              <div className="pt-1 text-center">
                <div className="text-sm text-slate-600/80">
                  Еще нет аккаунта?{" "}
                  <a
                    href="/register"
                    className="font-semibold text-slate-800 underline decoration-slate-400/50 underline-offset-4 hover:decoration-slate-700/70"
                  >
                    Зарегистрироваться
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
