import React, { useEffect, useRef, useState } from "react";
import { cx, presenceColor, userTypeLabel, statusLabel } from "../lib/utils.js";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { useForm, rules } from "../lib/validation.js";
import { Card, PageHeader, Row, Button, Input, Field, FieldError } from "../components/ui.jsx";

export default function MePage() {
  const { me, token, refreshMe } = useMessenger();
  const [photoUrl, setPhotoUrl] = useState(me.avatarUrl ?? ""); // canonical (e.g. /files/...)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(""); // blob preview while uploading
  const [photoSrc, setPhotoSrc] = useState(me.avatarUrl ?? ""); // actual <img src> (presigned / blob / http)
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState(null);

  useEffect(() => {
    setPhotoUrl(me.avatarUrl ?? "");
    setPhotoPreviewUrl("");
    setAvatarUploadError(null);
  }, [me.avatarUrl, me.id]);

  useEffect(() => {
    if (photoPreviewUrl) {
      setPhotoSrc(photoPreviewUrl);
      return undefined;
    }
    if (!photoUrl) {
      setPhotoSrc("");
      return undefined;
    }
    if (!photoUrl.startsWith("/files/")) {
      setPhotoSrc(photoUrl);
      return undefined;
    }
    if (!token) {
      setPhotoSrc("");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const out = await api.getFileUrl(token, photoUrl);
        if (!cancelled) setPhotoSrc(out?.url || "");
      } catch {
        if (!cancelled) setPhotoSrc("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoPreviewUrl, photoUrl, token]);

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

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploadError(null);
    const blob = URL.createObjectURL(file);
    setPhotoPreviewUrl(blob);
    setUploadingAvatar(true);
    try {
      const up = await api.postUpload(token, file);
      const url = up?.url || "";
      if (!url) throw new Error("upload_failed");
      setPhotoUrl(url);
      // Keep preview until next render tick; then effect will switch to presigned.
      setTimeout(() => setPhotoPreviewUrl(""), 50);
    } catch {
      setAvatarUploadError("Не удалось загрузить фото. Попробуйте ещё раз.");
      // Keep preview; user can retry by selecting again.
    } finally {
      setUploadingAvatar(false);
      // allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    form.touchAll();
    setSaveError(null);
    if (!form.isValid) return;
    if (uploadingAvatar) return;
    try {
      const payload = {
        phone: form.values.phone.trim(),
        bio: form.values.bio.trim(),
      };
      if (photoUrl) {
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
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-paper backdrop-blur">
          <div className="relative">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={me.name}
                className="h-28 w-28 rounded-[var(--radius-xl)] border border-[color:var(--border)] object-cover shadow-paper"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface2)] font-proto text-4xl font-bold text-[color:var(--fg)]/75 shadow-paper">
                {me.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <span
              className={cx(
                "absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-[color:var(--bg)]",
                presenceColor(me.status),
              )}
            />
          </div>

          <div className="text-center">
            <div className="font-semibold">{form.values.name || me.name}</div>
            <div className="text-xs text-[color:var(--muted)]">{me.title}</div>
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
            disabled={uploadingAvatar}
            className={cx(
              "w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] py-3 text-xs font-semibold text-[color:var(--fg)]/85 shadow-paper hover:bg-[color:var(--surface2)]/90 focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]",
              uploadingAvatar ? "cursor-not-allowed opacity-60 hover:bg-[color:var(--surface2)]" : "",
            )}
          >
            {uploadingAvatar ? "Загрузка…" : "Загрузить фото"}
          </button>
          {avatarUploadError && (
            <div className="w-full rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--dangerBg)] px-4 py-3 text-[11px] font-semibold text-[color:var(--danger)] shadow-paper backdrop-blur">
              {avatarUploadError}
            </div>
          )}

          <div className="w-full space-y-1 text-xs text-[color:var(--muted2)]">
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
                <div className="text-[11px] text-[color:var(--muted2)]">
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
              <div className="text-[11px] text-[color:var(--muted2)]">Смена e-mail через администратора.</div>
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
                  "w-full resize-none rounded-[var(--radius-xl)] border bg-[color:var(--surface2)] p-4 text-sm text-[color:var(--fg)]/90 shadow-paper outline-none transition placeholder:text-[color:var(--muted2)] focus:ring-4",
                  form.field("bio").error
                    ? "border-rose-300/40 focus:ring-rose-300/20"
                    : "border-[color:var(--border)] focus:ring-[color:var(--ring)]",
                )}
              />
              <div className="flex items-center justify-between">
                <FieldError error={form.field("bio").error} />
                <div
                  className={cx(
                    "ml-auto text-[11px]",
                    bioLen > 500 ? "text-[color:var(--danger)]" : "text-[color:var(--muted2)]",
                  )}
                >
                  {bioLen}/500
                </div>
              </div>
            </div>
          </Card>

          {saveError && (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--dangerBg)] px-5 py-4 text-sm font-semibold text-[color:var(--danger)] shadow-paper backdrop-blur">
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
            {saved && <span className="text-sm font-semibold text-emerald-600/90">Сохранено</span>}
          </div>
          <div className="text-xs text-[color:var(--muted2)]">* — обязательные поля</div>
        </div>
      </div>
    </div>
  );
}
