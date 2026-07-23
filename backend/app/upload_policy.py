from __future__ import annotations

# MIME types allowed for user uploads (client Content-Type is not trusted alone).
ALLOWED_UPLOAD_MIME: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/webm",
        "application/pdf",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed",
    }
)

# Never serve these inline in browser (XSS / script execution).
INLINE_BLOCKED_MIME: frozenset[str] = frozenset(
    {
        "text/html",
        "application/xhtml+xml",
        "image/svg+xml",
        "text/javascript",
        "application/javascript",
        "application/x-javascript",
    }
)


def normalize_upload_mime(raw: str | None) -> str:
    return (raw or "application/octet-stream").split(";", 1)[0].strip().lower()


def validate_upload_mime(mime: str) -> None:
    from fastapi import HTTPException

    if mime not in ALLOWED_UPLOAD_MIME:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "unsupported_media_type",
                "message": "File type is not allowed",
            },
        )


def allow_inline_preview(mime: str) -> bool:
    m = normalize_upload_mime(mime)
    if m in INLINE_BLOCKED_MIME:
        return False
    return m.startswith("image/")
