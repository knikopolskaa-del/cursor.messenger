from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

ConversationType = Literal["channel", "group", "direct"]
UserType = Literal["employee", "admin", "guest", "intern"]
AttachmentType = Literal["file", "image", "video", "audio"]
UserStatus = Literal["online", "away", "dnd", "offline"]

# Latin digits + underscore + hyphen + Cyrillic
SLUG_RE = re.compile(r"^[a-zA-Z0-9_\-\u0400-\u04FF]{2,50}$")
NAMED_REACTIONS = frozenset(
    {"thumbsup", "thumbsdown", "eyes", "pray", "white_check_mark", "sparkles"}
)



def validate_slug(v: str) -> str:
    s = v.strip()
    if not SLUG_RE.fullmatch(s):
        raise ValueError(
            "slug must be 2-50 chars: letters (Latin/Cyrillic), digits, _ and -"
        )
    return s


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterInviteBody(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    title: str = ""
    department: str = ""

    @field_validator("name")
    @classmethod
    def name_trim(cls, v: str) -> str:
        t = v.strip()
        if len(t) < 2:
            raise ValueError("name must be at least 2 characters after trim")
        return t


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    title: str = ""
    department: str = ""
    phone: str = ""
    avatarUrl: str = ""
    bio: str = ""
    userType: UserType
    status: UserStatus = "offline"
    isActive: bool = True
    createdAt: datetime | None = None


class LoginResponse(BaseModel):
    accessToken: str
    user: UserPublic


class PatchMeBody(BaseModel):
    title: str | None = None
    department: str | None = None
    phone: str | None = None
    avatarUrl: str | None = None
    bio: str | None = None
    status: UserStatus | None = None
    name: str | None = None


class AdminPatchUserBody(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    title: str | None = None
    department: str | None = None
    phone: str | None = None
    avatarUrl: str | None = None
    bio: str | None = None
    userType: UserType | None = None
    status: UserStatus | None = None
    isActive: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class CreateUserBody(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2)
    title: str = ""
    department: str = ""
    userType: UserType = "employee"
    temporaryPassword: str = Field(min_length=6)

    @field_validator("name")
    @classmethod
    def name_trim(cls, v: str) -> str:
        t = v.strip()
        if len(t) < 2:
            raise ValueError("name must be at least 2 characters after trim")
        return t


class WorkspaceOut(BaseModel):
    id: str
    name: str
    createdAt: datetime


class ChannelCreate(BaseModel):
    slug: str
    title: str = Field(min_length=1, max_length=200)
    topic: str = ""
    isPrivate: bool = False

    @field_validator("slug")
    @classmethod
    def slug_ok(cls, v: str) -> str:
        return validate_slug(v)


class ChannelPatch(BaseModel):
    slug: str | None = None
    title: str | None = Field(default=None, max_length=200)
    topic: str | None = None
    isPrivate: bool | None = None

    @field_validator("slug")
    @classmethod
    def slug_ok(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return validate_slug(v)


class ChannelOut(BaseModel):
    id: str
    workspaceId: str
    slug: str
    title: str
    topic: str
    isPrivate: bool
    createdBy: str
    createdAt: datetime


class GroupCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    memberIds: list[str] = Field(min_length=2)


class GroupPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=80)
    memberIds: list[str] | None = None


class GroupOut(BaseModel):
    id: str
    workspaceId: str
    title: str
    createdBy: str
    createdAt: datetime
    memberIds: list[str]


class DirectCreate(BaseModel):
    peerUserId: str


class DirectOut(BaseModel):
    id: str
    workspaceId: str
    userIds: list[str]
    createdAt: datetime


class AttachmentIn(BaseModel):
    type: AttachmentType
    name: str = Field(min_length=1, max_length=260)
    sizeBytes: int = Field(ge=0, le=100_000_000)
    mimeType: str = ""
    url: str = "https://example.invalid/file"


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    parentMessageId: str | None = None
    attachments: list[AttachmentIn] | None = None

    @field_validator("text")
    @classmethod
    def text_strip(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("text cannot be empty")
        if len(t) > 4000:
            raise ValueError("text too long")
        return t


class MessagePatch(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def text_strip(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("text cannot be empty")
        return t


class AttachmentOut(BaseModel):
    id: str
    messageId: str
    type: AttachmentType
    name: str
    sizeBytes: int
    mimeType: str
    url: str


class ReactionAgg(BaseModel):
    emoji: str
    userIds: list[str]


class MessageOut(BaseModel):
    id: str
    conversationType: ConversationType
    conversationId: str
    authorId: str
    text: str
    parentMessageId: str | None
    createdAt: datetime
    editedAt: datetime | None = None
    deletedAt: datetime | None = None
    attachments: list[AttachmentOut] = []
    reactions: list[ReactionAgg] = []


class SavedCreate(BaseModel):
    type: Literal["message", "file"] = "message"
    messageId: str | None = None
    fileName: str | None = None
    conversationType: ConversationType
    conversationId: str
    note: str = ""


class SavedPatch(BaseModel):
    note: str | None = None


class SavedOut(BaseModel):
    id: str
    userId: str
    type: Literal["message", "file"]
    messageId: str | None = None
    fileName: str | None = None
    conversationType: ConversationType
    conversationId: str
    note: str = ""
    savedAt: datetime


class ActivityOut(BaseModel):
    id: str
    userId: str
    type: str
    actorId: str | None = None
    messageId: str | None = None
    conversationType: ConversationType | None = None
    conversationId: str | None = None
    payload: dict[str, Any] = {}
    createdAt: datetime
    readAt: datetime | None = None


class InviteCreateResponse(BaseModel):
    inviteUrl: str
    token: str
    expiresAt: datetime


class ReactionBody(BaseModel):
    emoji: str = Field(min_length=1, max_length=32)

    @field_validator("emoji")
    @classmethod
    def emoji_ok(cls, v: str) -> str:
        e = v.strip()
        if not e:
            raise ValueError("emoji required")
        if e in NAMED_REACTIONS:
            return e
        if 1 <= len(e) <= 16:
            return e
        raise ValueError("emoji not allowed")


class AttachmentPatchBody(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=260)


class SearchQuery(BaseModel):
    q: str = Field(min_length=1, max_length=100)
    scope: Literal["messages", "all"] = "messages"
