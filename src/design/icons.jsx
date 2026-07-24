import React from "react";

function IconBase({ children, className = "h-5 w-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props) {
  return (
    <IconBase {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </IconBase>
  );
}

export function IconChat(props) {
  return (
    <IconBase {...props}>
      <path d="M7 9h10M7 13h6" />
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </IconBase>
  );
}

export function IconBookmark(props) {
  return (
    <IconBase {...props}>
      <path d="M6 4h12v16l-6-4-6 4V4Z" />
    </IconBase>
  );
}

export function IconUsers(props) {
  return (
    <IconBase {...props}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="9" cy="8" r="3" />
      <path d="M22 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74" />
    </IconBase>
  );
}

export function IconSettings(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </IconBase>
  );
}

export function IconSearch(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function IconSend(props) {
  return (
    <IconBase {...props}>
      <path d="m22 2-11 11" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </IconBase>
  );
}

export function IconMail(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconBase>
  );
}

export function IconLock(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </IconBase>
  );
}

export function IconEye(props) {
  return (
    <IconBase {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

export function IconEyeOff(props) {
  return (
    <IconBase {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M6.7 6.7C4.6 8.1 3 10 3 12s3.5 7 10 7c1.8 0 3.4-.4 4.8-1.1" />
      <path d="M17.3 17.3C19.4 15.9 21 14 21 12s-3.5-7-10-7c-1.1 0-2.1.2-3 .5" />
    </IconBase>
  );
}

export function IconPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function IconHash(props) {
  return (
    <IconBase {...props}>
      <path d="M10 4 8 20M16 4l-2 16M4 9h16M3 15h16" />
    </IconBase>
  );
}

export function IconMore(props) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IconFile(props) {
  return (
    <IconBase {...props}>
      <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-5-4Z" />
      <path d="M14 3v4h4" />
    </IconBase>
  );
}

export function IconVideo(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="m17 10 4-2v8l-4-2" />
    </IconBase>
  );
}

export function IconImage(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="m21 17-5.5-5.5a1 1 0 0 0-1.4 0L9 17" />
    </IconBase>
  );
}

export function IconLink(props) {
  return (
    <IconBase {...props}>
      <path d="M10 13a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 11a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
    </IconBase>
  );
}

export function IconAudio(props) {
  return (
    <IconBase {...props}>
      <path d="M11 5v14M6 9v6M16 7v10M21 10v4" />
    </IconBase>
  );
}
