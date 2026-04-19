from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import current_user
from ..schemas import ActivityOut
from ..serialize import activity_out
from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=list[ActivityOut])
def list_activities(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
    unread_only: bool | None = Query(default=None, alias="unread_only"),
):
    rows = [a for a in store.activities.values() if a["userId"] == user["id"]]
    if unread_only:
        rows = [a for a in rows if not a.get("readAt")]
    rows.sort(key=lambda a: a["createdAt"], reverse=True)
    return [activity_out(a) for a in rows]


@router.patch("/{activity_id}/read", response_model=ActivityOut)
def mark_read(
    activity_id: str,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    a = store.activities.get(activity_id)
    if not a or a["userId"] != user["id"]:
        raise HTTPException(404, detail="Not found")
    a["readAt"] = datetime.now(timezone.utc)
    store.activities[activity_id] = a
    return activity_out(a)
