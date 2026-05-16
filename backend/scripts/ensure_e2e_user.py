#!/usr/bin/env python3
"""
Добавляет или обновляет пользователя test@example.com / 1234 для E2E и ручных проверок.

Без удаления БД выполните из корня репозитория (рядом с package.json):

  npm run e2e:ensure-user

Вручную (если уже стоите в каталоге backend/):

  python3 scripts/ensure_e2e_user.py

Нужен тот же Python/venv, что и для API (зависимости и SQLite).
"""
from __future__ import annotations

import os
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND.parent


def _load_repo_dotenv() -> None:
    """
    Тот же смысл, что app.main:_load_dotenv_if_present — иначе AUTH_PEPPER / БД берутся не из корневого .env,
    и хеш пароля в SQLite не совпадёт с проверкой при логине через API → 401.
    """
    for p in (_REPO_ROOT / ".env", _BACKEND / ".env"):
        try:
            raw = p.read_text(encoding="utf-8")
        except Exception:
            continue
        for line in raw.splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


_load_repo_dotenv()

if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sqlalchemy import func, select  # noqa: E402

from app.database import SessionLocal, init_db  # noqa: E402
from app.models import Channel, Membership, User, Workspace  # noqa: E402
from app.security import hash_password  # noqa: E402

E2E_EMAIL = "test@example.com"
E2E_PASSWORD = "1234"


def _ensure_channel_memberships(session, template_user_id: str, target_user_id: str, workspace_id: str) -> int:
    """
    Копируем каналы с шаблонного пользователя и добавляем все публичные каналы воркспейса
    (без дублей по uq_membership).
    """
    existing = {
        (m.target_type, m.target_id)
        for m in session.scalars(select(Membership).where(Membership.user_id == target_user_id)).all()
    }
    wanted_order: list[tuple[str, str, str | None]] = []

    tmpl = session.scalars(
        select(Membership).where(
            Membership.user_id == template_user_id,
            Membership.target_type == "channel",
        ),
    ).all()
    seen: set[tuple[str, str]] = set()
    for m in tmpl:
        key = (m.target_type, m.target_id)
        if key in seen:
            continue
        seen.add(key)
        wanted_order.append((m.target_type, m.target_id, m.role))

    for ch in session.scalars(select(Channel).where(Channel.workspace_id == workspace_id)).all():
        if ch.is_private:
            continue
        key = ("channel", ch.id)
        if key in seen:
            continue
        seen.add(key)
        wanted_order.append(("channel", ch.id, None))

    added = 0
    for target_type, target_id, role in wanted_order:
        key = (target_type, target_id)
        if key in existing:
            continue
        session.add(
            Membership(
                id=f"mb_{secrets.token_hex(8)}",
                user_id=target_user_id,
                target_type=target_type,
                target_id=target_id,
                joined_at=datetime.now(timezone.utc),
                role=role,
            ),
        )
        existing.add(key)
        added += 1
    return added


def main() -> None:
    init_db()
    email_norm = E2E_EMAIL.lower().strip()

    db = SessionLocal()
    try:
        ws = db.scalar(select(Workspace))
        if not ws:
            print("Ошибка: в базе нет workspace. Заполните данные или пересоздайте БД.")
            sys.exit(1)

        template = db.scalar(
            select(User).where(User.workspace_id == ws.id).order_by(User.created_at.asc()).limit(1),
        )
        if not template:
            print("Ошибка: нет ни одного пользователя — добавить test@ некуда скопировать права.")
            sys.exit(1)

        row = db.scalar(select(User).where(func.lower(User.email) == email_norm, User.workspace_id == ws.id))

        if row:
            row.password_hash = hash_password(E2E_PASSWORD)
            row.user_type = "employee"
            row.is_active = True
            n_mb = _ensure_channel_memberships(db, template.id, row.id, ws.id)
            db.commit()
            print(f"Готово: обновлён пароль для {E2E_EMAIL}; добавлено каналов (memberships): {n_mb}.")
            return

        uid = f"u_{secrets.token_hex(6)}"
        now = datetime.now(timezone.utc)
        row = User(
            id=uid,
            workspace_id=ws.id,
            email=email_norm,
            password_hash=hash_password(E2E_PASSWORD),
            name="Тест Пользователь",
            title="QA",
            department="Тестирование",
            phone="",
            status="offline",
            user_type="employee",
            avatar_url="",
            bio="",
            is_active=True,
            created_at=now,
        )
        db.add(row)
        db.flush()
        n_mb = _ensure_channel_memberships(db, template.id, row.id, ws.id)
        db.commit()
        print(
            f"Готово: создан пользователь {E2E_EMAIL} (id={uid}); добавлено каналов (memberships): {n_mb}.",
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
