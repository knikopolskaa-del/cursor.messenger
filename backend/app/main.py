from __future__ import annotations

import os
import logging
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi.encoders import jsonable_encoder
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import RedirectResponse
from starlette.requests import Request
from starlette.responses import Response

from .database import SessionLocal, init_db
from .routers import (
    activities,
    admin,
    attachments,
    auth,
    channels,
    conversations,
    directs,
    files,
    groups,
    messages,
    reactions,
    saved,
    search,
    users,
    workspace,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

from .security import is_production, validate_security_config
from .yos import StorageUnavailable
from .seed import seed_if_empty

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("app")

def _load_dotenv_if_present() -> None:
    # Minimal .env loader to satisfy local dev without extra deps.
    # Reads repo root `.env` and `backend/.env` if present.
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
            if not s or s.startswith("#"):
                continue
            if "=" not in s:
                continue
            k, v = s.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


_load_dotenv_if_present()


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        return [part.strip() for part in raw.split(",") if part.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]


def _cors_origin_regex() -> str | None:
    if os.environ.get("CORS_ORIGINS", "").strip():
        return os.environ.get("CORS_ORIGIN_REGEX") or None
    return r"^http://(localhost|127\.0\.0\.1):\d+$"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_security_config()
    init_db()
    (Path(__file__).resolve().parent.parent / "uploads").mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        seed_if_empty(db)
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Messenger API V1",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if is_production() else "/docs",
    redoc_url=None,
    openapi_url=None if is_production() else "/openapi.json",
)

@app.middleware("http")
async def _log_requests(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception:
        dur_ms = int((time.perf_counter() - start) * 1000)
        log.exception(
            "request error rid=%s method=%s path=%s dur_ms=%s",
            rid,
            request.method,
            request.url.path,
            dur_ms,
        )
        raise
    dur_ms = int((time.perf_counter() - start) * 1000)
    # Avoid logging bodies; log size hints and status.
    clen = response.headers.get("content-length", "")
    log.info(
        "request rid=%s method=%s path=%s status=%s dur_ms=%s bytes=%s",
        rid,
        request.method,
        request.url.path,
        response.status_code,
        dur_ms,
        clen,
    )
    response.headers["x-request-id"] = rid
    return response

@app.exception_handler(StorageUnavailable)
async def _storage_unavailable_handler(_request: Request, exc: StorageUnavailable):
    log.exception("object storage unavailable")
    return JSONResponse(
        status_code=502,
        content={
            "detail": {
                "error": "storage_unavailable",
                "message": "Object Storage unavailable",
            }
        },
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(_request: Request, exc: Exception):
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        raise exc
    log.exception("unhandled error")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(RequestValidationError)
async def _validation_error_handler(_request, exc: RequestValidationError):
    # По чеклисту: плохие данные -> 400 (а не 422).
    detail: dict = {
        "error": "validation_error",
        "message": "Некорректные данные",
    }
    if not is_production():
        detail["fields"] = jsonable_encoder(exc.errors())
    return JSONResponse(status_code=400, content={"detail": detail})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth,
    admin,
    users,
    workspace,
    files,
    channels,
    groups,
    directs,
    conversations,
    messages,
    attachments,
    reactions,
    saved,
    activities,
    search,
):
    app.include_router(r.router)


@app.get("/", include_in_schema=False)
def root():
    if is_production():
        return RedirectResponse(url="/health")
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
