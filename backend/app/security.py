from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

_WEAK_PEPPERS = frozenset({"", "change_me", "messenger_v1_mem"})


def is_production() -> bool:
    return os.environ.get("APP_ENV", "").strip().lower() in ("production", "prod")


def _auth_pepper() -> str:
    # Read lazily so `.env` can be loaded after module import.
    v = os.environ.get("AUTH_PEPPER", "").strip()
    if is_production():
        if v in _WEAK_PEPPERS:
            raise RuntimeError(
                "AUTH_PEPPER must be set to a long random value when APP_ENV=production"
            )
        return v
    return v or "messenger_v1_mem"


def validate_security_config() -> None:
    """Fail fast on insecure production configuration."""
    _auth_pepper()
    if is_production() and not os.environ.get("CORS_ORIGINS", "").strip():
        raise RuntimeError(
            "CORS_ORIGINS must list production frontend origin(s) when APP_ENV=production"
        )


def public_registration_enabled() -> bool:
    raw = os.environ.get("PUBLIC_REGISTRATION_ENABLED")
    if raw is not None:
        return raw.strip().lower() in ("1", "true", "yes", "on")
    return not is_production()


def session_ttl_seconds() -> int:
    raw = os.environ.get("SESSION_TTL_SECONDS", str(7 * 24 * 3600)).strip()
    try:
        return max(300, int(raw))
    except ValueError:
        return 7 * 24 * 3600


def session_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=session_ttl_seconds())


def _peppered(password: str) -> bytes:
    return f"{_auth_pepper()}:{password}".encode()


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(_peppered(password), bcrypt.gensalt(rounds=12))
    return digest.decode("ascii")


def password_needs_rehash(password_hash: str) -> bool:
    return not password_hash.startswith("$2")


def _verify_legacy_sha256(password: str, password_hash: str) -> bool:
    pepper = os.environ.get("AUTH_PEPPER", "").strip() or "messenger_v1_mem"
    legacy = hashlib.sha256(f"{pepper}:{password}".encode()).hexdigest()
    return legacy == password_hash


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(_peppered(password), password_hash.encode("ascii"))
        except ValueError:
            return False
    if len(password_hash) == 64 and all(c in "0123456789abcdef" for c in password_hash.lower()):
        return _verify_legacy_sha256(password, password_hash)
    return False


def new_token() -> str:
    return "memtok_" + secrets.token_urlsafe(24)
