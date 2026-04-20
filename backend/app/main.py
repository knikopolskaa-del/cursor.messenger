from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import RedirectResponse

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
from .seed import seed_if_empty


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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    (Path(__file__).resolve().parent.parent / "uploads").mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        seed_if_empty(db)
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="Messenger API V1", version="0.1.0", lifespan=lifespan)

@app.exception_handler(RequestValidationError)
async def _validation_error_handler(_request, exc: RequestValidationError):
    # По чеклисту: плохие данные -> 400 (а не 422).
    return JSONResponse(
        status_code=400,
        content={
            "detail": {
                "error": "validation_error",
                "message": "Некорректные данные",
                "fields": exc.errors(),
            }
        },
    )

app.add_middleware(
    CORSMiddleware,
    # Dev: Vite может выбрать другой порт (5174, 5175, ...).
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
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
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
