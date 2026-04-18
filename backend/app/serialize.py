from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING, Any

from .schemas import (
    ActivityOut,
    AttachmentOut,
    MessageOut,
    ReactionAgg,
    UserPublic,
)

if TYPE_CHECKING:
    from .store import Store


def user_public(u: dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        title=u.get("title") or "",
        department=u.get("department") or "",
        phone=u.get("phone") or "",
        avatarUrl=u.get("avatarUrl") or "",
        bio=u.get("bio") or "",
        userType=u["userType"],
        status=u.get("status") or "offline",
        isActive=u.get("isActive", True),
        createdAt=u.get("createdAt"),
    )


def reaction_aggs(store: Store, message_id: str) -> list[ReactionAgg]:
    by_emoji: dict[str, list[str]] = defaultdict(list)
    for r in store.reactions:
        if r["messageId"] == message_id:
            by_emoji[r["emoji"]].append(r["userId"])
    return [ReactionAgg(emoji=e, userIds=sorted(set(uids))) for e, uids in sorted(by_emoji.items())]


def message_out(store: Store, msg: dict[str, Any]) -> MessageOut:
    mid = msg["id"]
    atts = [
        AttachmentOut(
            id=a["id"],
            messageId=a["messageId"],
            type=a["type"],
            name=a["name"],
            sizeBytes=a["sizeBytes"],
            mimeType=a.get("mimeType") or "",
            url=a.get("url") or "",
        )
        for a in store.attachments.values()
        if a["messageId"] == mid
    ]
    return MessageOut(
        id=msg["id"],
        conversationType=msg["conversationType"],
        conversationId=msg["conversationId"],
        authorId=msg["authorId"],
        text=msg["text"],
        parentMessageId=msg.get("parentMessageId"),
        createdAt=msg["createdAt"],
        editedAt=msg.get("editedAt"),
        deletedAt=msg.get("deletedAt"),
        attachments=sorted(atts, key=lambda x: x.id),
        reactions=reaction_aggs(store, mid),
    )


def activity_out(a: dict[str, Any]) -> ActivityOut:
    return ActivityOut(
        id=a["id"],
        userId=a["userId"],
        type=a["type"],
        actorId=a.get("actorId"),
        messageId=a.get("messageId"),
        conversationType=a.get("conversationType"),
        conversationId=a.get("conversationId"),
        payload=a.get("payload") or {},
        createdAt=a["createdAt"],
        readAt=a.get("readAt"),
    )
