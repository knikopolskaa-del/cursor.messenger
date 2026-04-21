from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import is_admin, is_guest
from ..deps import current_user, current_user_id, get_store, require_admin
from ..schemas import AdminPatchUserBody, CreateUserBody, PatchMeBody, UserPublic
from ..models import FileUpload
from ..security import hash_password
from ..serialize import user_public
from ..store import Store

router = APIRouter(tags=["users"])


def _guest_peer_ids(store: Store, user: dict) -> set[str]:
    uid = user["id"]
    allowed = {uid}
    for d in store.directs.values():
        if uid in d["userIds"]:
            allowed.update(d["userIds"])
    for g in store.groups.values():
        if uid in g.get("memberIds", []):
            allowed.update(g["memberIds"])
    # Guests can only see users they share a conversation with.
    # Include peers from shared public/private channels via memberships table.
    channel_ids = {m["targetId"] for m in store.memberships if m["targetType"] == "channel" and m["userId"] == uid}
    if channel_ids:
        for m in store.memberships:
            if m["targetType"] == "channel" and m["targetId"] in channel_ids:
                allowed.add(m["userId"])
    return allowed


@router.get("/me", response_model=UserPublic)
def get_me(user: Annotated[dict, Depends(current_user)]):
    return user_public(user)


@router.patch("/me", response_model=UserPublic)
def patch_me(
    body: PatchMeBody,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        if is_guest(user):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "field_not_allowed",
                    "field": "name",
                    "message": "Guests cannot change full name",
                },
            )
        t = str(data["name"]).strip()
        if len(t) < 2:
            raise HTTPException(status_code=400, detail="name too short")
        data["name"] = t
    if "avatarUrl" in data and data["avatarUrl"]:
        # Accept only uploads owned by this user (or external http(s) for demo).
        au = str(data["avatarUrl"]).strip()
        if au.startswith("/files/"):
            fid = au[len("/files/") :].split("?", 1)[0].strip("/") or None
            if not fid:
                raise HTTPException(status_code=400, detail="Invalid avatarUrl")
            row = store.session.get(FileUpload, fid)
            if row is None or row.user_id != user["id"]:
                raise HTTPException(status_code=400, detail="Invalid avatar upload")
            data["avatarUrl"] = f"/files/{fid}"
        # else: allow absolute URLs (seed/demo), keep as-is.
    for k, v in data.items():
        if k in user and v is not None:
            user[k] = v
    store.users[user["id"]] = user
    return user_public(user)


@router.get("/users", response_model=list[UserPublic])
def list_users(
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    active = [u for u in store.users.values() if u.get("isActive", True)]
    if is_guest(user):
        allowed = _guest_peer_ids(store, user)
        active = [u for u in active if u["id"] in allowed]
    return [user_public(u) for u in active]


@router.get("/users/{user_id}", response_model=UserPublic)
def get_user(
    user_id: str,
    viewer: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    u = store.users.get(user_id)
    if not u or not u.get("isActive", True):
        raise HTTPException(status_code=404, detail="User not found")
    if is_guest(viewer) and user_id not in _guest_peer_ids(store, viewer):
        raise HTTPException(status_code=404, detail="User not found")
    return user_public(u)


@router.post("/users", response_model=UserPublic)
def admin_create_user(
    body: CreateUserBody,
    _: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    email = body.email.lower().strip()
    if email in store.user_by_email:
        raise HTTPException(
            status_code=400,
            detail={"error": "email_taken", "message": "Email already exists"},
        )
    uid = store.next_id("u")
    u = {
        "id": uid,
        "email": email,
        "passwordHash": hash_password(body.temporaryPassword),
        "name": body.name,
        "title": body.title,
        "department": body.department,
        "phone": "",
        "avatarUrl": "",
        "bio": "",
        "userType": body.userType,
        "status": "offline",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
    }
    store.users[uid] = u
    store.user_by_email[email] = uid
    return user_public(u)


@router.patch("/users/{user_id}", response_model=UserPublic)
def admin_patch_user(
    user_id: str,
    body: AdminPatchUserBody,
    _: Annotated[dict, Depends(require_admin)],
    store: Annotated[Store, Depends(get_store)],
):
    u = store.users.get(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_unset=True)
    if "password" in data:
        u["passwordHash"] = hash_password(data.pop("password"))
    if "email" in data:
        ne = data["email"].lower().strip()
        old = u["email"].lower()
        if ne != old and ne in store.user_by_email:
            raise HTTPException(
                status_code=400,
                detail={"error": "email_taken", "message": "Email already exists"},
            )
        if ne != old:
            del store.user_by_email[old]
            store.user_by_email[ne] = u["id"]
        u["email"] = ne
        del data["email"]
    for k, v in data.items():
        u[k] = v
    store.users[user_id] = u
    return user_public(u)
