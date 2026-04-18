from __future__ import annotations

import hashlib
import secrets

SALT = "messenger_v1_mem"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{SALT}:{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def new_token() -> str:
    return "memtok_" + secrets.token_urlsafe(24)
