from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_session
from .store import Store


def get_store(session: Annotated[Session, Depends(get_session)]) -> Store:
    return Store(session)


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization.removeprefix("Bearer ").strip()


def current_user_id(
    token: Annotated[str, Depends(bearer_token)],
    store: Annotated[Store, Depends(get_store)],
) -> str:
    sess = store.sessions.get(token)
    if not sess:
        raise HTTPException(status_code=401, detail={"error": "invalid_token"})
    uid = sess["userId"]
    u = store.users.get(uid)
    if not u or not u.get("isActive", True):
        raise HTTPException(status_code=401, detail={"error": "invalid_token"})
    return uid


def current_user(
    user_id: Annotated[str, Depends(current_user_id)],
    store: Annotated[Store, Depends(get_store)],
) -> dict:
    return store.users[user_id]


def require_admin(user: Annotated[dict, Depends(current_user)]) -> dict:
    if user.get("userType") != "admin":
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "Admin only"},
        )
    return user
