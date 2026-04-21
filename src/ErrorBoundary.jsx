import React from "react";
import { Button } from "./components/ui.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-dvh bg-[color:var(--bg)] p-6 text-[color:var(--fg)]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[color:var(--border)] bg-[color:var(--dangerBg)] p-6 shadow-paper backdrop-blur">
          <div className="font-proto text-3xl font-bold leading-[0.95] tracking-tight text-[color:var(--danger)]">
            Ошибка интерфейса
          </div>
          <div className="mt-1 text-xs text-[color:var(--danger)]/90">
            Откройте DevTools → Console, там будет подробность. Если нужно — пришлите текст ошибки.
          </div>
          <pre className="mt-4 max-h-[50vh] overflow-auto rounded-2xl border border-[color:var(--border)] bg-black/30 p-4 text-[11px] text-white/90">
            {String(error?.stack || error)}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()} variant="ghost">
              Перезагрузить
            </Button>
            <Button to="/app" variant="primary">
              В мессенджер
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

