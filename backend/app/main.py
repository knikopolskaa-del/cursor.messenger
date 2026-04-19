from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
