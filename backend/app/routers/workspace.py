from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..deps import current_user
from ..schemas import WorkspaceOut
from ..store import Store, get_store

router = APIRouter(tags=["workspace"])


@router.get("/workspace", response_model=WorkspaceOut)
def get_workspace(
    _: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    w = store.workspace
    return WorkspaceOut(id=w["id"], name=w["name"], createdAt=w["createdAt"])
