from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..deps import bearer_token, current_user_id
from ..rate_limit import enforce_auth_rate_limit
from ..schemas import LoginBody, LoginResponse, RegisterBody, RegisterInviteBody
from ..security import (
    hash_password,
    new_token,
    password_needs_rehash,
    public_registration_enabled,
    session_expires_at,
    verify_password,
)
from ..serialize import user_public
from ..deps import get_store
from ..store import Store

router = APIRouter(prefix="/auth", tags=["auth"])

def _default_user_type(email: str) -> str:
    e = (email or "").lower().strip()
    return "employee" if e.endswith("@sharebot.net") else "guest"


def _issue_session(store: Store, uid: str) -> str:
    token = new_token()
    store.sessions[token] = {
        "token": token,
        "userId": uid,
        "expiresAt": session_expires_at(),
    }
    return token


@router.post("/login", response_model=LoginResponse)
def login(body: LoginBody, request: Request, store: Store = Depends(get_store)):
    enforce_auth_rate_limit(request, scope="login")
    email = body.email.lower().strip()
    uid = store.user_by_email.get(email)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    u = store.users[uid]
    if not u.get("isActive", True):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, u["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if password_needs_rehash(u["passwordHash"]):
        u["passwordHash"] = hash_password(body.password)
        store.users[uid] = u
    token = _issue_session(store, uid)
    return LoginResponse(accessToken=token, user=user_public(u))


class LogoutOk(BaseModel):
    ok: bool = True


@router.post("/logout", response_model=LogoutOk)
def logout(
    token: str = Depends(bearer_token),
    store: Store = Depends(get_store),
):
    store.sessions.pop(token, None)
    return LogoutOk()


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(body: RegisterBody, request: Request, store: Store = Depends(get_store)):
    enforce_auth_rate_limit(request, scope="register")
    if not public_registration_enabled():
        raise HTTPException(
            status_code=403,
            detail={
                "error": "registration_disabled",
                "message": "Public registration is disabled",
            },
        )
    email = body.email.lower().strip()
    if store.user_by_email.get(email):
        raise HTTPException(
            status_code=400,
            detail={"error": "email_taken", "message": "Email already exists"},
        )
    uid = store.next_id("u")
    u = {
        "id": uid,
        "email": email,
        "passwordHash": hash_password(body.password),
        "name": body.name.strip(),
        "title": "",
        "department": "",
        "phone": "",
        "avatarUrl": "",
        "bio": "",
        "userType": _default_user_type(email),
        "status": "offline",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
    }
    store.users[uid] = u
    token = _issue_session(store, uid)
    return LoginResponse(accessToken=token, user=user_public(u))


@router.post("/invite/complete", response_model=LoginResponse)
def complete_invite(
    body: RegisterInviteBody,
    request: Request,
    store: Store = Depends(get_store),
):
    enforce_auth_rate_limit(request, scope="invite")
    inv = store.invites.get(body.token)
    if not inv or inv.get("usedAt"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_invite",
                "message": "Invite token is invalid or already used",
            },
        )
    exp: datetime = inv["expiresAt"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_invite", "message": "Invite has expired"},
        )
    preset_email = (inv.get("presetEmail") or "").lower().strip()
    if preset_email and preset_email in store.user_by_email:
        raise HTTPException(
            status_code=400,
            detail={"error": "email_taken", "message": "Email already registered"},
        )
    uid = store.next_id("u")
    email = preset_email or f"invite_{secrets.token_hex(4)}@example.com"
    if email in store.user_by_email:
        raise HTTPException(
            status_code=400,
            detail={"error": "email_taken", "message": "Email already registered"},
        )
    name = body.name.strip()
    u = {
        "id": uid,
        "email": email,
        "passwordHash": hash_password(body.password),
        "name": name,
        "title": body.title,
        "department": body.department,
        "phone": "",
        "avatarUrl": "",
        "bio": "",
        "userType": "employee",
        "status": "offline",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
    }
    store.users[uid] = u
    store.user_by_email[email] = uid
    inv["usedAt"] = datetime.now(timezone.utc)
    store.invites[body.token] = inv
    token = _issue_session(store, uid)
    return LoginResponse(accessToken=token, user=user_public(u))
