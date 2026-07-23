from __future__ import annotations

import os
import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request

_lock = threading.Lock()
_hits: dict[str, list[float]] = defaultdict(list)


def _auth_rate_limit_per_minute() -> int:
    try:
        return max(1, int(os.environ.get("AUTH_RATE_LIMIT_PER_MINUTE", "20")))
    except ValueError:
        return 20


def enforce_auth_rate_limit(request: Request, *, scope: str) -> None:
    """Limit auth endpoints per client IP (in-memory; fine for single-process dev/MVP)."""
    client = request.client.host if request.client else "unknown"
    key = f"{scope}:{client}"
    window = 60.0
    limit = _auth_rate_limit_per_minute()
    now = time.monotonic()
    with _lock:
        recent = [t for t in _hits[key] if now - t < window]
        if len(recent) >= limit:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limited",
                    "message": "Too many attempts. Try again later.",
                },
            )
        recent.append(now)
        _hits[key] = recent
