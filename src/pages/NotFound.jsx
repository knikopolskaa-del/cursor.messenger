import React from "react";
import { Button } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl font-bold text-white/10">404</div>
        <div className="mt-3 text-base font-semibold text-white/70">Страница не найдена</div>
        <div className="mt-1 text-sm text-white/40">
          Возможно, адрес изменился или страница была удалена.
        </div>
        <div className="mt-6">
          <Button to="/app" variant="ghost">Вернуться в мессенджер</Button>
        </div>
      </div>
    </div>
  );
}
