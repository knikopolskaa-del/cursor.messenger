"""
ORM-схема SQLite. Сообщения хранят беседу через ровно один из FK: channel_id | group_id | direct_id
(см. CheckConstraint на Message). При смене схемы в dev проще удалить backend/messenger.db и пересоздать БД.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_users_workspace_email"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, default="", server_default="")
    department: Mapped[str] = mapped_column(String, default="", server_default="")
    phone: Mapped[str] = mapped_column(String, default="", server_default="")
    status: Mapped[str] = mapped_column(String, default="offline", server_default="offline")
    user_type: Mapped[str] = mapped_column("user_type", String, nullable=False)
    avatar_url: Mapped[str] = mapped_column(String, default="", server_default="")
    bio: Mapped[str] = mapped_column(String, default="", server_default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    workspace: Mapped[Workspace] = relationship(backref="users")


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, default="", server_default="")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    icon_url: Mapped[str] = mapped_column(String, default="", server_default="")

    __table_args__ = (
        Index(
            "uq_channels_workspace_slug_ci",
            "workspace_id",
            func.lower(slug),
            unique=True,
        ),
    )


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    icon_url: Mapped[str] = mapped_column(String, default="", server_default="")

    members: Mapped[list[GroupMember]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))

    group: Mapped[Group] = relationship(back_populates="members")


class Direct(Base):
    __tablename__ = "directs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    participants: Mapped[list[DirectParticipant]] = relationship(
        back_populates="direct", cascade="all, delete-orphan"
    )


class DirectParticipant(Base):
    __tablename__ = "direct_participants"
    __table_args__ = (UniqueConstraint("direct_id", "user_id", name="uq_direct_participant"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    direct_id: Mapped[str] = mapped_column(String, ForeignKey("directs.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))

    direct: Mapped[Direct] = relationship(back_populates="participants")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        Index("ix_memberships_target", "target_type", "target_id"),
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_membership"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    target_type: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[str] = mapped_column(String, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    role: Mapped[str | None] = mapped_column(String, nullable=True)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "(channel_id IS NOT NULL AND group_id IS NULL AND direct_id IS NULL) OR "
            "(channel_id IS NULL AND group_id IS NOT NULL AND direct_id IS NULL) OR "
            "(channel_id IS NULL AND group_id IS NULL AND direct_id IS NOT NULL)",
            name="ck_message_one_conversation_fk",
        ),
        Index("ix_messages_channel_id", "channel_id"),
        Index("ix_messages_group_id", "group_id"),
        Index("ix_messages_direct_id", "direct_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    channel_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=True
    )
    group_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True
    )
    direct_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("directs.id", ondelete="CASCADE"), nullable=True
    )
    author_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    parent_message_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attachments: Mapped[list[Attachment]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )
    reactions_rel: Mapped[list[Reaction]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("message_id", "emoji", "user_id", name="uq_reaction"),
        Index("ix_reactions_message", "message_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[str] = mapped_column(String, ForeignKey("messages.id", ondelete="CASCADE"))
    emoji: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))

    message: Mapped[Message] = relationship(back_populates="reactions_rel")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    message_id: Mapped[str] = mapped_column(
        String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)

    message: Mapped[Message] = relationship(back_populates="attachments")


class FileUpload(Base):
    """Файл, загруженный пользователем; после отправки сообщения связывается с message_id."""

    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    disk_name: Mapped[str] = mapped_column(String, nullable=False)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    message_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )


class SavedItem(Base):
    __tablename__ = "saved_items"
    __table_args__ = (
        CheckConstraint(
            "type != 'message' OR message_id IS NOT NULL",
            name="ck_saved_message_requires_message_id",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String, nullable=False)
    message_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True
    )
    file_name: Mapped[str | None] = mapped_column(String, nullable=True)
    conversation_type: Mapped[str] = mapped_column(String, nullable=False)
    conversation_id: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[str] = mapped_column(String, default="", server_default="")
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String, nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    conversation_type: Mapped[str | None] = mapped_column(String, nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = (UniqueConstraint("token", name="uq_invite_token"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token: Mapped[str] = mapped_column(String, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    created_by_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    preset_email: Mapped[str | None] = mapped_column(String, nullable=True)
    preset_name: Mapped[str | None] = mapped_column(String, nullable=True)


class ConversationReadState(Base):
    """Состояние прочитанности пользователя в беседе (для будущих API «прочитано»)."""

    __tablename__ = "conversation_read_states"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "conversation_type",
            "conversation_id",
            name="uq_read_state_user_conv",
        ),
        Index("ix_read_state_conv", "conversation_type", "conversation_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_type: Mapped[str] = mapped_column(String, nullable=False)
    conversation_id: Mapped[str] = mapped_column(String, nullable=False)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_read_message_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
