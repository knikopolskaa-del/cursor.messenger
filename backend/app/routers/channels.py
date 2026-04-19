from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import (
    can_create_channel,
    can_manage_channel,
    can_read_channel,
    channel_membership,
    list_channel_member_ids,
)
from ..deps import current_user, require_admin
from ..schemas import ChannelCreate, ChannelOut, ChannelPatch
from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/channels", tags=["channels"])


def _ch_out(ch: dict) -> ChannelOut:
    return ChannelOut(
        id=ch["id"],
        workspaceId=ch["workspaceId"],
        slug=ch["slug"],
        title=ch["title"],
        topic=ch.get("topic") or "",
        isPrivate=ch["isPrivate"],
        createdBy=ch["createdBy"],
        createdAt=ch["createdAt"],
        iconUrl=ch.get("iconUrl") or "",
    )


@router.get("", response_model=list[ChannelOut])
def list_channels(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    out = []
    for ch in store.channels.values():
        if can_read_channel(store, user, ch):
            out.append(_ch_out(ch))
    return sorted(out, key=lambda x: x.slug)


@router.post("", response_model=ChannelOut, status_code=201)
def create_channel(
    body: ChannelCreate,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    if not can_create_channel(user):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot create channel"})
    slug = body.slug.strip().lower()
    if any(c["slug"].lower() == slug for c in store.channels.values()):
        raise HTTPException(400, detail={"error": "slug_taken", "message": "Slug already exists"})
    cid = store.next_id("c")
    ch = {
        "id": cid,
        "workspaceId": store.workspace["id"],
        "slug": body.slug,
        "title": body.title,
        "topic": body.topic,
        "isPrivate": body.isPrivate,
        "createdBy": user["id"],
        "createdAt": datetime.now(timezone.utc),
        "iconUrl": body.iconUrl or "",
    }
    store.channels[cid] = ch
    store.add_membership(user["id"], "channel", cid)
    return _ch_out(ch)


@router.get("/{channel_id}", response_model=ChannelOut)
def get_channel(
    channel_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch or not can_read_channel(store, user, ch):
        raise HTTPException(404, detail="Channel not found")
    return _ch_out(ch)


@router.patch("/{channel_id}", response_model=ChannelOut)
def patch_channel(
    channel_id: str,
    body: ChannelPatch,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch or not can_read_channel(store, user, ch):
        raise HTTPException(404, detail="Channel not found")
    if not can_manage_channel(store, user, ch):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot edit channel"})
    data = body.model_dump(exclude_unset=True)
    if "slug" in data:
        slug = data["slug"].strip().lower()
        if any(
            c["slug"].lower() == slug and c["id"] != channel_id
            for c in store.channels.values()
        ):
            raise HTTPException(400, detail="slug_taken")
    for k, v in data.items():
        ch[k] = v
    store.channels[channel_id] = ch
    return _ch_out(ch)


@router.delete("/{channel_id}")
def delete_channel(
    channel_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch:
        raise HTTPException(404, detail="Channel not found")
    if not can_manage_channel(store, user, ch):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot delete channel"})
    del store.channels[channel_id]
    store.remove_memberships_for_channel(channel_id)
    return {"ok": True}


@router.post("/{channel_id}/join")
def join_channel(
    channel_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch:
        raise HTTPException(404, detail="Channel not found")
    if ch["isPrivate"]:
        raise HTTPException(403, detail={"error": "forbidden", "message": "Private channel"})
    if channel_membership(store, user["id"], channel_id):
        return {"ok": True}
    store.add_membership(user["id"], "channel", channel_id)
    return {"ok": True}


@router.post("/{channel_id}/members")
def add_channel_member(
    channel_id: str,
    payload: dict,
    admin: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch:
        raise HTTPException(404, detail="Channel not found")
    uid = payload.get("userId")
    if not uid or uid not in store.users:
        raise HTTPException(400, detail="Invalid userId")
    if not channel_membership(store, uid, channel_id):
        store.add_membership(uid, "channel", channel_id)
    return {"ok": True}


@router.delete("/{channel_id}/members/{user_id}")
def remove_channel_member(
    channel_id: str,
    user_id: str,
    _: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch:
        raise HTTPException(404, detail="Channel not found")
    store.remove_channel_member(channel_id, user_id)
    return {"ok": True}


@router.get("/{channel_id}/members", response_model=list[str])
def list_members(
    channel_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    ch = store.channels.get(channel_id)
    if not ch or not can_read_channel(store, user, ch):
        raise HTTPException(404, detail="Channel not found")
    if ch["isPrivate"] and not channel_membership(store, user["id"], channel_id):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Not a member"})
    return list_channel_member_ids(store, channel_id)
