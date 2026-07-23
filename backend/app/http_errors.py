from __future__ import annotations

import logging

from fastapi import HTTPException

log = logging.getLogger(__name__)


def client_error(
    status_code: int,
    detail: str | dict,
    *,
    log_message: str | None = None,
    exc: BaseException | None = None,
) -> HTTPException:
    """Log server-side context; never put exc text into detail."""
    if exc is not None:
        log.exception(log_message or "request failed")
    elif log_message:
        log.warning(log_message)
    return HTTPException(status_code=status_code, detail=detail)


def internal_error(*, log_message: str = "internal error", exc: BaseException | None = None) -> HTTPException:
    if exc is not None:
        log.exception(log_message)
    else:
        log.error(log_message)
    return HTTPException(status_code=500, detail="Internal server error")
