from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select

from .database import SessionLocal, init_db
from .models import User, Workspace
from .security import hash_password


def _load_dotenv_if_present() -> None:
    """
    Minimal .env loader for local bootstrap scripts.
    Mirrors `app.main._load_dotenv_if_present()` behavior.
    """
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / ".env",  # repo root
        here.parents[1] / ".env",  # backend/
    ]
    for p in candidates:
        try:
            raw = p.read_text(encoding="utf-8")
        except Exception:
            continue
        for line in raw.splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def bootstrap_admin() -> None:
    """
    Create or promote a user to admin directly in DB.

    Env vars:
      - BOOTSTRAP_ADMIN_EMAIL (required)
      - BOOTSTRAP_ADMIN_PASSWORD (optional; if missing, random will be generated)
      - BOOTSTRAP_ADMIN_NAME (optional)
    """
    _load_dotenv_if_present()

    email = (os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or "").strip().lower()
    if not email:
        raise SystemExit("BOOTSTRAP_ADMIN_EMAIL is required")

    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")
    generated = False
    if not password:
        # URL-safe random password, printed once in terminal.
        password = secrets.token_urlsafe(18)
        generated = True

    name = (os.environ.get("BOOTSTRAP_ADMIN_NAME") or "Admin").strip() or "Admin"

    init_db()
    db = SessionLocal()
    try:
        ws = db.scalar(select(Workspace))
        if ws is None:
            ws = Workspace(
                id="w_1",
                name="Workspace",
                created_at=datetime.now(timezone.utc),
            )
            db.add(ws)
            db.flush()

        existing = db.scalar(select(User).where(func.lower(User.email) == email))
        if existing:
            existing.password_hash = hash_password(password)
            existing.user_type = "admin"
            existing.is_active = True
            if not existing.name:
                existing.name = name
            action = "updated"
        else:
            uid = "u_admin_" + secrets.token_hex(8)
            db.add(
                User(
                    id=uid,
                    workspace_id=ws.id,
                    email=email,
                    password_hash=hash_password(password),
                    name=name,
                    title="",
                    department="",
                    phone="",
                    status="offline",
                    user_type="admin",
                    avatar_url="",
                    bio="",
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
            )
            action = "created"

        db.commit()

        print(f"Admin {action}.")
        print(f"Email: {email}")
        if generated:
            print(f"Password (generated): {password}")
        else:
            print("Password: (set from BOOTSTRAP_ADMIN_PASSWORD)")
    finally:
        db.close()


if __name__ == "__main__":
    bootstrap_admin()

