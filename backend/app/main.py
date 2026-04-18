from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse

from .routers import (
    activities,
    admin,
    attachments,
    auth,
    channels,
    conversations,
    directs,
    groups,
    messages,
    reactions,
    saved,
    search,
    users,
    workspace,
)

app = FastAPI(title="Messenger API V1", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth,
    admin,
    users,
    workspace,
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
