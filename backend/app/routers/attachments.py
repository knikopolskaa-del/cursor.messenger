from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..access import is_admin
from ..deps import current_user
from ..schemas import AttachmentOut, AttachmentPatchBody
from ..deps import get_store
from ..store import Store

router = APIRouter(tags=["attachments"])


@router.patch("/attachments/{attachment_id}", response_model=AttachmentOut)
def patch_attachment(
    attachment_id: str,
    body: AttachmentPatchBody,
    user: Annotated[dict, Depends(current_user)],
    store: Annotated[Store, Depends(get_store)],
):
    att = store.attachments.get(attachment_id)
    if not att:
        raise HTTPException(404, detail="Attachment not found")
    msg = store.messages.get(att["messageId"])
    if not msg:
        raise HTTPException(404, detail="Attachment not found")
    if msg["authorId"] != user["id"] and not is_admin(user):
        raise HTTPException(403, detail={"error": "forbidden", "message": "Cannot edit attachment"})
    if body.name is not None:
        att["name"] = body.name
    return AttachmentOut(
        id=att["id"],
        messageId=att["messageId"],
        type=att["type"],
        name=att["name"],
        sizeBytes=att["sizeBytes"],
        mimeType=att.get("mimeType") or "",
        url=att.get("url") or "",
    )
