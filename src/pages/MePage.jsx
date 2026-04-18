import React, { useEffect, useRef, useState } from "react";
import { cx, presenceColor, userTypeLabel, statusLabel } from "../lib/utils.js";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, PageHeader, Row, Button, Input, Field, FieldError } from "../components/ui.jsx";

export default function MePage() {
  const { me, token, refreshMe } = useMessenger();
  const [photoUrl, setPhotoUrl] = useState(me.avatarUrl ?? "");
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setPhotoUrl(me.avatarUrl ?? "");
  }, [me.avatarUrl, me.id]);

  const form = useForm({
    name: {
      initial: me.name,
      validators: [rules.required("Введите имя"), rules.minLen(2, "Минимум 2 символа")],
    },
    email: {
      initial: me.email,
      validators: [rules.required("Введите e-mail"), rules.email()],
    },
    phone: {
      initial: me.phone ?? "",
      validators: [rules.phone()],
    },
    bio: {
      initial: me.bio ?? "",
      validators: [rules.maxLen(500, "Максимум 500 символов")],
    },
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    form.touchAll();
    setSaveError(null);
    if (!form.isValid) return;
    try {
      const payload = {
        phone: form.values.phone.trim(),
        bio: form.values.bio.trim(),
      };
      if (photoUrl && !photoUrl.startsWith("blob:")) {
        payload.avatarUrl = photoUrl;
      }
      if (me.userType !== "guest") {
        payload.name = form.values.name.trim();
      }
      await api.patchMe(token, payload);
      await refreshMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Не удалось сохранить. Проверьте данные и подключение к серверу.");
    }
  }

  const bioLen = form.values.bio.length;

  return (
    <div className="p-6">
      <PageHeader title="Мой профиль" />
      <div className="mt-5 grid max-w-3xl grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="relative">
            {photoUrl && !photoUrl.startsWith("blob:") ? (
              <img src={photoUrl} alt={me.name} className="h-28 w-28 rounded-2xl object-cover" />
            ) : photoUrl.startsWith("blob:") ? (
              <img src={photoUrl} alt={me.name} className="h-28 w-28 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-indigo-500/20 text-3xl font-bold text-indigo-300">
                {me.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <span
              className={cx(
                "absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-slate-950",
                presenceColor(me.status),
              )}
            />
          </div>

          <div className="text-center">
            <div className="font-semibold">{form.values.name || me.name}</div>
            <div className="text-xs text-white/50">{me.title}</div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg bg-white/5 py-2 text-xs text-white/65 hover:bg-white/10"
          >
            Загрузить фото
          </button>

          <div className="w-full space-y-1 text-xs text-white/35">
            <div>{userTypeLabel(me.userType)}</div>
            <div>{statusLabel(me.status)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <Card title="Основная информация">
            <div className="space-y-3">
              <Field label="Полное имя *" error={form.field("name").error}>
                <Input
                  {...form.field("name")}
                  placeholder="Иван Иванов"
                  disabled={me.userType === "guest"}
                />
              </Field>
              {me.userType === "guest" && (
                <div className="text-[11px] text-white/35">
                  ФИО для гостевых аккаунтов меняет администратор.
                </div>
              )}
              <Row label="Должность" value={me.title} />
              <Row label="Отдел" value={me.department} />
            </div>
          </Card>

          <Card title="Контакты">
            <div className="space-y-3">
              <Field label="E-mail" error={form.field("email").error}>
                <Input {...form.field("email")} type="email" readOnly className="opacity-70" />
              </Field>
              <div className="text-[11px] text-white/35">Смена e-mail через администратора.</div>
              <Field label="Телефон" error={form.field("phone").error}>
                <Input {...form.field("phone")} placeholder="+7 (999) 000-00-00" />
              </Field>
            </div>
          </Card>

          <Card title="О себе">
            <div className="space-y-1">
              <textarea
                value={form.values.bio}
                onChange={(e) => form.field("bio").onChange(e.target.value)}
                onBlur={form.field("bio").onBlur}
                rows={3}
                placeholder="Расскажите о себе…"
                className={cx(
                  "w-full resize-none rounded-lg bg-white/5 p-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2",
                  form.field("bio").error
                    ? "border border-rose-400/50 focus:ring-rose-400/30"
                    : "focus:ring-indigo-400/20",
                )}
              />
              <div className="flex items-center justify-between">
                <FieldError error={form.field("bio").error} />
                <div
                  className={cx(
                    "ml-auto text-[11px]",
                    bioLen > 500 ? "text-rose-400" : "text-white/30",
                  )}
                >
                  {bioLen}/500
                </div>
              </div>
            </div>
          </Card>

          {saveError && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={!form.isValid && Object.values(form.errors).some(Boolean)}
            >
              Сохранить изменения
            </Button>
            {saved && <span className="text-sm text-emerald-400">Сохранено</span>}
          </div>
          <div className="text-xs text-white/30">* — обязательные поля</div>
        </div>
      </div>
    </div>
  );
}
