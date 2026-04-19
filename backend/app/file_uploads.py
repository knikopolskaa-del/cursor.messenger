from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import FileUpload


def file_id_from_attachment_url(url: str | None) -> str | None:
    if not url or not isinstance(url, str):
        return None
    prefix = "/files/"
    if not url.startswith(prefix):
        return None
    return url[len(prefix) :].split("?", 1)[0].strip("/") or None


def validate_pending_uploads(session: Session, user_id: str, attachments: list | None) -> None:
    for a in attachments or []:
        url = getattr(a, "url", "") or ""
        fid = file_id_from_attachment_url(url)
        if fid is None:
            if url.startswith("/files/"):
                raise HTTPException(status_code=400, detail="Invalid upload url")
            continue
        row = session.get(FileUpload, fid)
        if row is None or row.user_id != user_id or row.message_id is not None:
            raise HTTPException(status_code=400, detail="Invalid attachment upload")


def bind_uploads_to_message(session: Session, message_id: str, attachments: list | None) -> None:
    for a in attachments or []:
        url = getattr(a, "url", "") or ""
        fid = file_id_from_attachment_url(url)
        if fid is None:
            continue
        row = session.get(FileUpload, fid)
        if row is not None:
            row.message_id = message_id
