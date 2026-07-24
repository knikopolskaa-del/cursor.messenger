import React, { useEffect, useRef, useState } from "react";
import { cx } from "../lib/utils.js";
import { useMessenger } from "../context/MessengerContext.jsx";
import * as api from "../lib/api.js";
import { AuthScopedImage } from "./ChatComponents.jsx";
import { IconHash, IconUsers } from "../design/icons.jsx";

const SIZE = {
  sm: { box: "h-9 w-9", glyph: "h-4 w-4", text: "text-xs" },
  md: { box: "h-11 w-11", glyph: "h-5 w-5", text: "text-sm" },
  lg: { box: "h-14 w-14", glyph: "h-6 w-6", text: "text-base" },
};

function DefaultConversationGlyph({ kind, label, size = "sm" }) {
  const dim = SIZE[size] ?? SIZE.sm;
  const letter = (label || "?").trim().slice(0, 1).toUpperCase();

  if (kind === "channel") {
    return (
      <span
        className={cx(
          "flex flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--accent)]/30 via-indigo-500/15 to-[color:var(--accent-soft)] text-[color:var(--accent)] shadow-soft",
          dim.box,
        )}
        aria-hidden
      >
        <IconHash className={dim.glyph} />
      </span>
    );
  }

  if (kind === "group") {
    return (
      <span
        className={cx(
          "flex flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-gradient-to-br from-emerald-500/25 via-teal-500/10 to-[color:var(--accent-soft)] text-emerald-600 dark:text-emerald-300 shadow-soft",
          dim.box,
        )}
        aria-hidden
      >
        <IconUsers className={dim.glyph} />
      </span>
    );
  }

  return (
    <span
      className={cx(
        "flex flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-gradient-to-br from-slate-500/20 to-[color:var(--accent-soft)] font-semibold text-[color:var(--accent)] shadow-soft",
        dim.box,
        dim.text,
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function ConversationIcon({
  kind = "channel",
  iconUrl,
  label,
  token,
  size = "sm",
  editable = false,
  targetType,
  targetId,
  className,
}) {
  const { refreshWorkspace } = useMessenger();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const dim = SIZE[size] ?? SIZE.sm;

  useEffect(() => {
    setFailed(false);
  }, [iconUrl]);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token || !editable || !targetType || !targetId) return;
    setBusy(true);
    try {
      const up = await api.postUpload(token, file);
      const url = (up.url || "").trim();
      if (!url) return;
      if (targetType === "channel") {
        await api.patchChannel(token, targetId, { iconUrl: url });
      } else if (targetType === "group") {
        await api.patchGroup(token, targetId, { iconUrl: url });
      }
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }

  const showUploaded = Boolean(iconUrl) && !failed;
  const round = cx("rounded-full border border-[color:var(--border)] object-cover shadow-soft", dim.box);

  const body = showUploaded ? (
    <AuthScopedImage
      url={iconUrl}
      token={token}
      alt=""
      className={round}
      onError={() => setFailed(true)}
    />
  ) : (
    <DefaultConversationGlyph kind={kind} label={label} size={size} />
  );

  if (!editable) {
    return <div className={cx("relative flex-shrink-0", className)}>{body}</div>;
  }

  return (
    <div className={cx("relative flex-shrink-0", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={cx(
          "group relative rounded-full focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-ring)] disabled:opacity-60",
          dim.box,
        )}
        aria-label="Загрузить иконку"
        title="Загрузить иконку"
      >
        {body}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          {busy ? "…" : "Фото"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />
    </div>
  );
}

export { DefaultConversationGlyph };
