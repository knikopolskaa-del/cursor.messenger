from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import can_read_direct
from ..deps import current_user
from ..schemas import DirectCreate, DirectOut
from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/directs", tags=["directs"])


def _d_out(d: dict) -> DirectOut:
    return DirectOut(
        id=d["id"],
        workspaceId=d["workspaceId"],
        userIds=list(d["userIds"]),
        createdAt=d["createdAt"],
    )


def _find_direct(store: Store, a: str, b: str) -> dict | None:
    pair = sorted([a, b])
    for d in store.directs.values():
        if sorted(d["userIds"]) == pair:
            return d
    return None


@router.get("", response_model=list[DirectOut])
def list_directs(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    return [
        _d_out(d)
        for d in store.directs.values()
        if can_read_direct(store, user, d)
    ]


@router.post("", response_model=DirectOut, status_code=201)
def create_direct(
    body: DirectCreate,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    peer = body.peerUserId
    if peer not in store.users:
        raise HTTPException(404, detail="Peer not found")
    if peer == user["id"]:
        raise HTTPException(400, detail="Cannot DM yourself")
    existing = _find_direct(store, user["id"], peer)
    if existing:
        return _d_out(existing)
    did = store.next_id("d")
    d = {
        "id": did,
        "workspaceId": store.workspace["id"],
        "userIds": sorted([user["id"], peer]),
        "createdAt": datetime.now(timezone.utc),
    }
    store.directs[did] = d
    return _d_out(d)
