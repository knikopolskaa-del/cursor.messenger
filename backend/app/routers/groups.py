from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import can_create_channel, can_manage_group, can_read_group
from ..deps import current_user
from ..schemas import GroupCreate, GroupOut, GroupPatch
from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/groups", tags=["groups"])


def _g_out(g: dict) -> GroupOut:
    return GroupOut(
        id=g["id"],
        workspaceId=g["workspaceId"],
        title=g["title"],
        createdBy=g["createdBy"],
        createdAt=g["createdAt"],
        memberIds=list(g["memberIds"]),
        iconUrl=g.get("iconUrl") or "",
    )


@router.get("", response_model=list[GroupOut])
def list_groups(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    return [
        _g_out(g)
        for g in store.groups.values()
        if can_read_group(store, user, g)
    ]


@router.post("", response_model=GroupOut, status_code=201)
def create_group(
    body: GroupCreate,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    if not can_create_channel(user):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot create group"})
    ws = store.workspace["id"]
    mids = list(dict.fromkeys(body.memberIds))
    if user["id"] not in mids:
        mids.append(user["id"])
    for uid in mids:
        if uid not in store.users:
            raise HTTPException(400, detail=f"Unknown user {uid}")
    gid = store.next_id("g")
    g = {
        "id": gid,
        "workspaceId": ws,
        "title": body.title,
        "createdBy": user["id"],
        "createdAt": datetime.now(timezone.utc),
        "memberIds": mids,
        "iconUrl": body.iconUrl or "",
    }
    store.groups[gid] = g
    return _g_out(g)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    g = store.groups.get(group_id)
    if not g or not can_read_group(store, user, g):
        raise HTTPException(404, detail="Group not found")
    return _g_out(g)


@router.patch("/{group_id}", response_model=GroupOut)
def patch_group(
    group_id: str,
    body: GroupPatch,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    g = store.groups.get(group_id)
    if not g or not can_read_group(store, user, g):
        raise HTTPException(404, detail="Group not found")
    if not can_manage_group(store, user, g):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot edit group"})
    data = body.model_dump(exclude_unset=True)
    if "memberIds" in data:
        mids = data["memberIds"]
        for uid in mids:
            if uid not in store.users:
                raise HTTPException(400, detail=f"Unknown user {uid}")
        if len(mids) < 2:
            raise HTTPException(400, detail="At least 2 members")
        g["memberIds"] = list(dict.fromkeys(mids))
    if "title" in data:
        g["title"] = data["title"]
    if "iconUrl" in data:
        g["iconUrl"] = data["iconUrl"] or ""
    store.groups[group_id] = g
    return _g_out(g)


@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    g = store.groups.get(group_id)
    if not g or not can_read_group(store, user, g):
        raise HTTPException(404, detail="Group not found")
    if not can_manage_group(store, user, g):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot delete group"})
    del store.groups[group_id]
    return {"ok": True}
