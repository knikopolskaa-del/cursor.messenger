from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import conversation_participant
from ..deps import current_user
from ..deps import get_store
from ..schemas import SavedCreate, SavedOut, SavedPatch
from ..store import Store

router = APIRouter(prefix="/saved", tags=["saved"])


def _s_out(store: Store, s: dict) -> SavedOut:
    author_id = None
    author_name = None
    preview = ""
    preview_unavailable = False
    if s["type"] == "message" and s.get("messageId"):
        m = store.messages.get(s["messageId"])
        if m and not m.get("deletedAt"):
            author_id = m.get("authorId")
            if author_id:
                au = store.users.get(author_id)
                author_name = (au or {}).get("name") or ""
            raw = (m.get("text") or "").strip().strip("\u2060")
            preview = raw[:200] if raw else ""
            if not preview:
                for att in store.attachments.values():
                    if att.get("messageId") == s["messageId"]:
                        preview = (att.get("name") or "")[:200]
                        break
        else:
            preview_unavailable = True
            preview = "Сообщение недоступно"
    elif s["type"] == "file":
        preview = (s.get("fileName") or "")[:200]
    return SavedOut(
        id=s["id"],
        userId=s["userId"],
        type=s["type"],
        messageId=s.get("messageId"),
        fileName=s.get("fileName"),
        conversationType=s["conversationType"],
        conversationId=s["conversationId"],
        note=s.get("note") or "",
        savedAt=s["savedAt"],
        authorId=author_id,
        authorName=author_name,
        preview=preview,
        previewUnavailable=preview_unavailable,
    )


@router.get("", response_model=list[SavedOut])
def list_saved(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    rows = [s for s in store.saved.values() if s["userId"] == user["id"]]
    rows.sort(key=lambda x: x["savedAt"], reverse=True)
    return [_s_out(store, s) for s in rows]


@router.post("", response_model=SavedOut, status_code=201)
def create_saved(
    body: SavedCreate,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    if not conversation_participant(
        store, user, body.conversationType, body.conversationId
    ):
        raise HTTPException(404, detail="Conversation not found")
    if body.type == "message":
        if not body.messageId or body.messageId not in store.messages:
            raise HTTPException(400, detail="Invalid messageId")
        m = store.messages[body.messageId]
        if (
            m.get("conversationType") != body.conversationType
            or m.get("conversationId") != body.conversationId
        ):
            raise HTTPException(400, detail="messageId does not belong to this conversation")
    else:
        if not body.fileName:
            raise HTTPException(400, detail="fileName required for file saves")
    sid = store.next_id("s")
    row = {
        "id": sid,
        "userId": user["id"],
        "type": body.type,
        "messageId": body.messageId,
        "fileName": body.fileName,
        "conversationType": body.conversationType,
        "conversationId": body.conversationId,
        "note": body.note,
        "savedAt": datetime.now(timezone.utc),
    }
    store.saved[sid] = row
    return _s_out(store, row)


@router.patch("/{saved_id}", response_model=SavedOut)
def patch_saved(
    saved_id: str,
    body: SavedPatch,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    s = store.saved.get(saved_id)
    if not s or s["userId"] != user["id"]:
        raise HTTPException(404, detail="Not found")
    if body.note is not None:
        s["note"] = body.note
    return _s_out(store, s)


@router.delete("/{saved_id}")
def delete_saved(
    saved_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    s = store.saved.get(saved_id)
    if not s or s["userId"] != user["id"]:
        raise HTTPException(404, detail="Not found")
    del store.saved[saved_id]
    return {"ok": True}
