from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import conversation_participant
from ..deps import current_user
from ..schemas import SavedCreate, SavedOut, SavedPatch
from ..store import Store, get_store

router = APIRouter(prefix="/saved", tags=["saved"])


def _s_out(s: dict) -> SavedOut:
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
    )


@router.get("", response_model=list[SavedOut])
def list_saved(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    return [
        _s_out(s)
        for s in store.saved.values()
        if s["userId"] == user["id"]
    ]


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
    return _s_out(row)


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
    return _s_out(s)


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
