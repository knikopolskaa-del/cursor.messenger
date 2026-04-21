import React from "react";
import { Button } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="font-proto text-6xl font-bold leading-[0.9] tracking-tight text-[color:var(--muted2)]">
          404
        </div>
        <div className="mt-3 font-proto text-3xl font-bold leading-[0.95] tracking-tight text-[color:var(--fg)]">
          Страница не найдена
        </div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">
          Возможно, адрес изменился или страница была удалена.
        </div>
        <div className="mt-6">
          <Button to="/app" variant="ghost">Вернуться в мессенджер</Button>
        </div>
      </div>
    </div>
  );
}
