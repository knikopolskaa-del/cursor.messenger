from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..access import can_post_message, conversation_participant, is_admin
from ..deps import current_user
from ..schemas import MessageCreate, MessageOut
from ..serialize import message_out
from ..store import Store, get_store

router = APIRouter(prefix="/conversations", tags=["conversations"])

MENTION_RE = re.compile(r"@([a-zA-Z0-9_]+)")


@router.get("/{ctype}/{cid}/messages", response_model=list[MessageOut])
def list_messages(
    ctype: str,
    cid: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    parentMessageId: str | None = None,
):
    if ctype not in ("channel", "group", "direct"):
        raise HTTPException(400, detail="Invalid conversation type")
    if not conversation_participant(store, user, ctype, cid):
        raise HTTPException(404, detail="Conversation not found")
    msgs = [
        m
        for m in store.messages.values()
        if m["conversationType"] == ctype and m["conversationId"] == cid
    ]
    if parentMessageId:
        msgs = [m for m in msgs if m.get("parentMessageId") == parentMessageId]
    msgs.sort(key=lambda m: m["createdAt"])
    if cursor:
        idx = next((i for i, m in enumerate(msgs) if m["id"] == cursor), None)
        if idx is not None:
            msgs = msgs[idx + 1 :]
    msgs = msgs[:limit]
    return [message_out(store, m) for m in msgs]


def _create_mentions(
    store: Store,
    text: str,
    actor_id: str,
    ctype: str,
    cid: str,
    message_id: str,
):
    seen: set[str] = set()
    for m in MENTION_RE.finditer(text):
        uid = m.group(1)
        if uid in seen or uid not in store.users:
            continue
        seen.add(uid)
        aid = store.next_id("ac")
        store.activities[aid] = {
            "id": aid,
            "userId": uid,
            "type": "mention",
            "actorId": actor_id,
            "messageId": message_id,
            "conversationType": ctype,
            "conversationId": cid,
            "payload": {"text": text[m.start() : m.end()]},
            "createdAt": datetime.now(timezone.utc),
            "readAt": None,
        }


@router.post("/{ctype}/{cid}/messages", response_model=MessageOut, status_code=201)
def post_message(
    ctype: str,
    cid: str,
    body: MessageCreate,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    if ctype not in ("channel", "group", "direct"):
        raise HTTPException(400, detail="Invalid conversation type")
    if not can_post_message(store, user, ctype, cid):
        raise HTTPException(404, detail="Conversation not found")
    if body.parentMessageId:
        parent = store.messages.get(body.parentMessageId)
        if not parent or parent["conversationType"] != ctype or parent["conversationId"] != cid:
            raise HTTPException(400, detail="Invalid parentMessageId")
    mid = store.next_id("m")
    now = datetime.now(timezone.utc)
    msg = {
        "id": mid,
        "conversationType": ctype,
        "conversationId": cid,
        "authorId": user["id"],
        "text": body.text,
        "parentMessageId": body.parentMessageId,
        "createdAt": now,
        "editedAt": None,
        "deletedAt": None,
    }
    store.messages[mid] = msg
    if body.attachments:
        for a in body.attachments:
            aid = store.next_id("at")
            store.attachments[aid] = {
                "id": aid,
                "messageId": mid,
                "type": a.type,
                "name": a.name,
                "sizeBytes": a.sizeBytes,
                "mimeType": a.mimeType or "application/octet-stream",
                "url": a.url,
            }
    _create_mentions(store, body.text, user["id"], ctype, cid, mid)
    return message_out(store, msg)
