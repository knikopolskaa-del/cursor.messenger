from __future__ import annotations

import os
import hashlib
import secrets

def _auth_pepper() -> str:
    # Read lazily so `.env` can be loaded after module import.
    return os.environ.get("AUTH_PEPPER", "messenger_v1_mem")


def hash_password(password: str) -> str:
    pepper = _auth_pepper()
    return hashlib.sha256(f"{pepper}:{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def new_token() -> str:
    return "memtok_" + secrets.token_urlsafe(24)
