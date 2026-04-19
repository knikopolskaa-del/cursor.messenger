from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..access import conversation_participant
from ..database import get_session
from ..deps import current_user
from ..models import FileUpload
from ..store import Store

router = APIRouter(tags=["files"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"


def _ensure_upload_dir() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _safe_filename(name: str) -> str:
    t = re.sub(r"[^a-zA-Z0-9._\-\u0400-\u04FF]", "_", (name or "file").strip())[:180]
    return t or "file"


def _guess_attachment_type(mime: str) -> str:
    m = (mime or "").lower()
    if m.startswith("image/"):
        return "image"
    if m.startswith("video/"):
        return "video"
    if m.startswith("audio/"):
        return "audio"
    return "file"


@router.post("/uploads")
async def upload_file(
    user: Annotated[dict, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
    file: UploadFile = File(...),
):
    _ensure_upload_dir()
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large")
    fid = f"fu_{secrets.token_hex(10)}"
    orig = file.filename or "upload"
    safe = _safe_filename(orig)
    disk_name = f"{fid}_{safe}"
    path = UPLOAD_ROOT / disk_name
    path.write_bytes(raw)
    mime = file.content_type or "application/octet-stream"
    row = FileUpload(
        id=fid,
        user_id=user["id"],
        disk_name=disk_name,
        original_name=orig[:260],
        size_bytes=len(raw),
        mime_type=mime,
        created_at=datetime.now(timezone.utc),
        message_id=None,
    )
    session.add(row)
    session.flush()
    return {
        "fileId": fid,
        "url": f"/files/{fid}",
        "name": row.original_name,
        "sizeBytes": row.size_bytes,
        "mimeType": row.mime_type,
        "type": _guess_attachment_type(mime),
    }


@router.get("/files/{file_id}")
def download_file(
    file_id: str,
    user: Annotated[dict, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    row = session.get(FileUpload, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = row.user_id == user["id"]
    if row.message_id:
        store = Store(session)
        msg = store.messages.get(row.message_id)
        if msg and conversation_participant(
            store, user, msg["conversationType"], msg["conversationId"]
        ):
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    path = UPLOAD_ROOT / row.disk_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing")
    inline = (row.mime_type or "").lower().startswith("image/")
    return FileResponse(
        path,
        media_type=row.mime_type or "application/octet-stream",
        filename=row.original_name,
        content_disposition_type="inline" if inline else "attachment",
    )
