from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from starlette.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..access import conversation_participant, is_guest
from ..database import get_session
from ..deps import current_user
from ..models import FileUpload
from ..store import Store
from ..yos import StorageUnavailable, make_object_key, presign_get_url, upload_bytes

router = APIRouter(tags=["files"])

log = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = int(100 * 1024 * 1024)  # 100MB default
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
    # Keep local directory for backward compatibility, but store files in Object Storage.
    try:
        raw = await file.read()
    except Exception as exc:
        log.exception("Failed to read upload body")
        raise HTTPException(status_code=400, detail="Invalid upload") from exc
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    fid = f"fu_{secrets.token_hex(10)}"
    orig = file.filename or "upload"
    mime = file.content_type or "application/octet-stream"
    # Upload to YOS; do not block message sending, but this endpoint must fail if upload failed.
    object_key = make_object_key("uploads", orig)
    try:
        upload_bytes(object_key=object_key, data=raw, content_type=mime, filename=orig[:260])
    except StorageUnavailable as exc:
        # Service didn't respond / misconfigured: log, return a clear error.
        log.exception("Upload to Object Storage failed")
        raise HTTPException(
            status_code=502,
            detail={"error": "storage_unavailable", "message": "Object Storage unavailable"},
        ) from exc
    row = FileUpload(
        id=fid,
        user_id=user["id"],
        # Reuse existing column for object key to avoid schema migration.
        disk_name=object_key,
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
    store = None
    # Special case: avatar uploads are shared based on user visibility rules.
    # We do NOT store avatar linkage in file_uploads.message_id (it is FK to messages.id).
    # Instead allow access if some active user has avatarUrl pointing to this file.
    if not allowed:
        store = Store(session)
        target_uid = None
        needle = f"/files/{file_id}"
        for u in store.users.values():
            if u.get("isActive", True) and (u.get("avatarUrl") or "") == needle:
                target_uid = u["id"]
                break
        if target_uid:
            if not is_guest(user):
                allowed = True
            else:
                # Guests can see only users they share a conversation with.
                uid = user["id"]
                allowed_ids = {uid}
                for d in store.directs.values():
                    if uid in d["userIds"]:
                        allowed_ids.update(d["userIds"])
                for g in store.groups.values():
                    if uid in g.get("memberIds", []):
                        allowed_ids.update(g["memberIds"])
                channel_ids = {
                    m["targetId"]
                    for m in store.memberships
                    if m["targetType"] == "channel" and m["userId"] == uid
                }
                if channel_ids:
                    for m in store.memberships:
                        if m["targetType"] == "channel" and m["targetId"] in channel_ids:
                            allowed_ids.add(m["userId"])
                allowed = target_uid in allowed_ids
    if row.message_id:
        store = store or Store(session)
        msg = store.messages.get(row.message_id)
        if msg and conversation_participant(
            store, user, msg["conversationType"], msg["conversationId"]
        ):
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    inline = (row.mime_type or "").lower().startswith("image/")
    try:
        url = presign_get_url(
            object_key=row.disk_name,
            inline=inline,
            filename=row.original_name or "download",
        )
    except StorageUnavailable as exc:
        log.exception("Failed to presign file download")
        raise HTTPException(
            status_code=502,
            detail={"error": "storage_unavailable", "message": "Object Storage unavailable"},
        ) from exc
    # Redirect lets the client download directly from storage (private bucket via signed URL).
    return RedirectResponse(url=url, status_code=302)


@router.get("/files/{file_id}/url")
def get_file_url(
    file_id: str,
    user: Annotated[dict, Depends(current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    """
    Return presigned URL as JSON.

    This avoids browser CORS issues when frontend uses fetch() against /files/{id}
    and follows redirect to Object Storage domain.
    """
    row = session.get(FileUpload, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = row.user_id == user["id"]
    store = None
    # Special case: avatar uploads are shared based on user visibility rules.
    if not allowed:
        store = Store(session)
        target_uid = None
        needle = f"/files/{file_id}"
        for u in store.users.values():
            if u.get("isActive", True) and (u.get("avatarUrl") or "") == needle:
                target_uid = u["id"]
                break
        if target_uid:
            if not is_guest(user):
                allowed = True
            else:
                uid = user["id"]
                allowed_ids = {uid}
                for d in store.directs.values():
                    if uid in d["userIds"]:
                        allowed_ids.update(d["userIds"])
                for g in store.groups.values():
                    if uid in g.get("memberIds", []):
                        allowed_ids.update(g["memberIds"])
                channel_ids = {
                    m["targetId"]
                    for m in store.memberships
                    if m["targetType"] == "channel" and m["userId"] == uid
                }
                if channel_ids:
                    for m in store.memberships:
                        if m["targetType"] == "channel" and m["targetId"] in channel_ids:
                            allowed_ids.add(m["userId"])
                allowed = target_uid in allowed_ids
    if row.message_id:
        store = store or Store(session)
        msg = store.messages.get(row.message_id)
        if msg and conversation_participant(store, user, msg["conversationType"], msg["conversationId"]):
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    inline = (row.mime_type or "").lower().startswith("image/")
    try:
        url = presign_get_url(
            object_key=row.disk_name,
            inline=inline,
            filename=row.original_name or "download",
        )
    except StorageUnavailable as exc:
        log.exception("Failed to presign file download")
        raise HTTPException(
            status_code=502,
            detail={"error": "storage_unavailable", "message": "Object Storage unavailable"},
        ) from exc
    return {"url": url}
