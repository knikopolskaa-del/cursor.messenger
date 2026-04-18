from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from ..access import can_read_channel, can_read_group, conversation_participant
from ..deps import current_user
from ..store import Store, get_store

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
    q: str = Query(min_length=1, max_length=100),
    scope: str = Query(default="messages"),
):
    if scope not in ("messages", "all"):
        raise HTTPException(400, detail="Invalid scope")
    needle = q.lower().strip()
    hits: list[dict[str, Any]] = []
    for m in store.messages.values():
        if m.get("deletedAt"):
            continue
        if needle not in m["text"].lower():
            continue
        if not conversation_participant(
            store, user, m["conversationType"], m["conversationId"]
        ):
            continue
        hits.append(
            {
                "type": "message",
                "id": m["id"],
                "conversationType": m["conversationType"],
                "conversationId": m["conversationId"],
                "snippet": m["text"][:200],
            }
        )
    if scope == "all":
        for ch in store.channels.values():
            if needle in (ch["title"] or "").lower() or needle in (ch["slug"] or "").lower():
                if can_read_channel(store, user, ch):
                    hits.append({"type": "channel", "id": ch["id"], "title": ch["title"]})
        for g in store.groups.values():
            if needle in (g["title"] or "").lower():
                if can_read_group(store, user, g):
                    hits.append({"type": "group", "id": g["id"], "title": g["title"]})
    return {"q": q, "scope": scope, "results": hits[:100]}
