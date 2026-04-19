from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import conversation_participant, is_admin
from ..deps import current_user
from ..schemas import MessageOut, MessagePatch
from ..serialize import message_out
from ..deps import get_store
from ..store import Store

router = APIRouter(tags=["messages"])


@router.patch("/messages/{message_id}", response_model=MessageOut)
def patch_message(
    message_id: str,
    body: MessagePatch,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    msg = store.messages.get(message_id)
    if not msg or msg.get("deletedAt"):
        raise HTTPException(404, detail="Message not found")
    if msg["authorId"] != user["id"]:
        raise HTTPException(403, detail={"error": "forbidden", "message": "Only author can edit"})
    if not conversation_participant(
        store, user, msg["conversationType"], msg["conversationId"]
    ):
        raise HTTPException(404, detail="Message not found")
    msg["text"] = body.text
    msg["editedAt"] = datetime.now(timezone.utc)
    try:
        store.messages[message_id] = msg
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc)) from exc
    return message_out(store, msg)


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    msg = store.messages.get(message_id)
    if not msg:
        raise HTTPException(404, detail="Message not found")
    if not conversation_participant(
        store, user, msg["conversationType"], msg["conversationId"]
    ):
        raise HTTPException(404, detail="Message not found")
    if is_admin(user):
        del store.messages[message_id]
        return {"ok": True, "hard": True}
    if msg["authorId"] != user["id"]:
        raise HTTPException(403, detail={"error": "forbidden", "message": "Only author can delete"})
    msg["deletedAt"] = datetime.now(timezone.utc)
    try:
        store.messages[message_id] = msg
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc)) from exc
    return {"ok": True, "hard": False}
