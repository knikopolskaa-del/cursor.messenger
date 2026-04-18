from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..deps import require_admin
from ..schemas import InviteCreateResponse
from ..store import Store, get_store

router = APIRouter(prefix="/admin", tags=["admin"])


class CreateInviteBody(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(default=None, min_length=2)
    expiresInDays: int = Field(default=7, ge=1, le=90)


@router.post("/invites", response_model=InviteCreateResponse)
def create_invite(
    body: CreateInviteBody,
    admin: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    token = "inv_" + secrets.token_urlsafe(16)
    exp = datetime.now(timezone.utc) + timedelta(days=body.expiresInDays)
    store.invites[token] = {
        "id": store.next_id("invd"),
        "token": token,
        "workspaceId": store.workspace["id"],
        "createdBy": admin["id"],
        "expiresAt": exp,
        "usedAt": None,
        "presetEmail": (body.email.lower().strip() if body.email else None),
        "presetName": body.name,
    }
    return InviteCreateResponse(
        inviteUrl=f"/auth/invite/complete?token={token}",
        token=token,
        expiresAt=exp,
    )


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    _: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    u = store.users.get(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u["isActive"] = False
    to_del = [t for t, s in store.sessions.items() if s["userId"] == user_id]
    for t in to_del:
        del store.sessions[t]
    return {"ok": True, "userId": user_id}
