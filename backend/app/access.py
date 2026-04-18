from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .store import Store


def is_admin(user: dict) -> bool:
    return user.get("userType") == "admin"


def is_guest(user: dict) -> bool:
    return user.get("userType") == "guest"


def can_create_channel(user: dict) -> bool:
    if not user.get("isActive", True):
        return False
    if is_guest(user):
        return False
    return user.get("userType") in ("employee", "admin", "intern")


def channel_membership(store: Store, user_id: str, channel_id: str) -> dict | None:
    for m in store.memberships:
        if (
            m["userId"] == user_id
            and m["targetType"] == "channel"
            and m["targetId"] == channel_id
        ):
            return m
    return None


def can_read_channel(store: Store, user: dict, ch: dict) -> bool:
    if not user.get("isActive", True):
        return False
    uid = user["id"]
    if ch["isPrivate"]:
        return channel_membership(store, uid, ch["id"]) is not None
    if is_guest(user):
        return channel_membership(store, uid, ch["id"]) is not None
    return True


def can_manage_channel(store: Store, user: dict, ch: dict) -> bool:
    if is_admin(user):
        return True
    return ch.get("createdBy") == user["id"]


def group_member(store: Store, user_id: str, group_id: str) -> bool:
    g = store.groups.get(group_id)
    if not g:
        return False
    return user_id in g.get("memberIds", [])


def can_read_group(store: Store, user: dict, g: dict) -> bool:
    return group_member(store, user["id"], g["id"])


def can_manage_group(store: Store, user: dict, g: dict) -> bool:
    if is_admin(user):
        return True
    return g.get("createdBy") == user["id"]


def can_read_direct(store: Store, user: dict, d: dict) -> bool:
    return user["id"] in d["userIds"]


def conversation_participant(store: Store, user: dict, ctype: str, cid: str) -> bool:
    if ctype == "channel":
        ch = store.channels.get(cid)
        return bool(ch and can_read_channel(store, user, ch))
    if ctype == "group":
        g = store.groups.get(cid)
        return bool(g and can_read_group(store, user, g))
    if ctype == "direct":
        d = store.directs.get(cid)
        return bool(d and can_read_direct(store, user, d))
    return False


def can_post_message(store: Store, user: dict, ctype: str, cid: str) -> bool:
    return conversation_participant(store, user, ctype, cid)


def list_channel_member_ids(store: Store, channel_id: str) -> list[str]:
    return [
        m["userId"]
        for m in store.memberships
        if m["targetType"] == "channel" and m["targetId"] == channel_id
    ]
