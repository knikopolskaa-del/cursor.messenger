import React from "react";

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
      <div className="min-h-dvh bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-rose-400/30 bg-rose-400/10 p-5">
          <div className="text-sm font-semibold text-rose-100">Ошибка интерфейса</div>
          <div className="mt-1 text-xs text-rose-200/80">
            Откройте DevTools → Console, там будет подробность. Если нужно — пришлите текст ошибки.
          </div>
          <pre className="mt-4 max-h-[50vh] overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-rose-50/90">
            {String(error?.stack || error)}
          </pre>
        </div>
      </div>
    );
  }
}

