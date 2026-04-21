import React from "react";
import { Card, PageHeader } from "../components/ui.jsx";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Настройки" />
      <div className="mt-5 grid max-w-2xl gap-4">
        <Card title="Внешний вид">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[color:var(--muted)]">Тема</div>
            <span className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]/85">
              Переключатель вверху справа
            </span>
          </div>
        </Card>

        <Card title="Уведомления">
          <div className="space-y-2.5 text-sm text-[color:var(--muted)]">
            {[
              ["Упоминания", true],
              ["Личные сообщения", true],
              ["Треды", false],
              ["Звуки", false],
            ].map(([label, defaultChecked]) => (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={defaultChecked}
                  className="accent-sky-300"
                />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Язык и регион">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[color:var(--muted)]">Язык</div>
            <span className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface2)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]/85">
              Русский
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
