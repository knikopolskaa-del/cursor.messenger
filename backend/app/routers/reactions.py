from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response

from ..access import conversation_participant
from ..deps import current_user
from ..schemas import ReactionBody
from ..store import Store, get_store

router = APIRouter(tags=["reactions"])


@router.post(
    "/messages/{message_id}/reactions",
    response_class=Response,
    status_code=204,
)
def add_reaction(
    message_id: str,
    body: ReactionBody,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    msg = store.messages.get(message_id)
    if not msg or msg.get("deletedAt"):
        raise HTTPException(404, detail="Message not found")
    if not conversation_participant(
        store, user, msg["conversationType"], msg["conversationId"]
    ):
        raise HTTPException(404, detail="Message not found")
    emoji = body.emoji
    exists = any(
        r["messageId"] == message_id
        and r["emoji"] == emoji
        and r["userId"] == user["id"]
        for r in store.reactions
    )
    if not exists:
        store.reactions.append(
            {"messageId": message_id, "emoji": emoji, "userId": user["id"]}
        )
    return Response(status_code=204)


@router.delete("/messages/{message_id}/reactions/{emoji:path}")
def remove_reaction(
    message_id: str,
    emoji: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    msg = store.messages.get(message_id)
    if not msg:
        raise HTTPException(404, detail="Message not found")
    store.reactions[:] = [
        r
        for r in store.reactions
        if not (
            r["messageId"] == message_id
            and r["emoji"] == emoji
            and r["userId"] == user["id"]
        )
    ]
    return {"ok": True}


@router.get("/messages/{message_id}/reactions")
def list_reactions(
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
    from ..serialize import reaction_aggs

    return reaction_aggs(store, message_id)
