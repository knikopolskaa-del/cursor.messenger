import React from "react";
import { Card, PageHeader } from "../components/ui.jsx";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Настройки" />
      <div className="mt-5 grid max-w-2xl gap-4">
        <Card title="Внешний вид">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/75">Тема</div>
            <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/60">Тёмная</span>
          </div>
        </Card>

        <Card title="Уведомления">
          <div className="space-y-2.5 text-sm text-white/70">
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
                  className="accent-indigo-400"
                />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Язык и регион">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/75">Язык</div>
            <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/60">Русский</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
