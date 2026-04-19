from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Iterator

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .models import (
    Activity,
    Attachment,
    Channel,
    Direct,
    DirectParticipant,
    Group,
    GroupMember,
    Invite,
    Membership,
    Message,
    Reaction,
    SavedItem,
    User,
    UserSession,
    Workspace,
)

UTC = timezone.utc


def _user_to_dict(row: User) -> dict[str, Any]:
    return {
        "id": row.id,
        "email": row.email,
        "passwordHash": row.password_hash,
        "name": row.name,
        "title": row.title or "",
        "department": row.department or "",
        "phone": row.phone or "",
        "status": row.status or "offline",
        "userType": row.user_type,
        "avatarUrl": row.avatar_url or "",
        "bio": row.bio or "",
        "isActive": row.is_active,
        "createdAt": row.created_at,
    }


def _apply_user_dict(row: User, d: dict[str, Any]) -> None:
    row.email = d["email"]
    row.password_hash = d.get("passwordHash") or d.get("password_hash") or row.password_hash
    row.name = d["name"]
    row.title = d.get("title") or ""
    row.department = d.get("department") or ""
    row.phone = d.get("phone") or ""
    row.status = d.get("status") or "offline"
    row.user_type = d.get("userType") or d.get("user_type") or row.user_type
    row.avatar_url = d.get("avatarUrl") or d.get("avatar_url") or ""
    row.bio = d.get("bio") or ""
    row.is_active = d.get("isActive", d.get("is_active", row.is_active))
    if d.get("createdAt") or d.get("created_at"):
        row.created_at = d.get("createdAt") or d.get("created_at")


def _user_from_dict(uid: str, d: dict[str, Any], workspace_id: str) -> User:
    return User(
        id=uid,
        workspace_id=workspace_id,
        email=d["email"],
        password_hash=d.get("passwordHash") or d.get("password_hash") or "",
        name=d["name"],
        title=d.get("title") or "",
        department=d.get("department") or "",
        phone=d.get("phone") or "",
        status=d.get("status") or "offline",
        user_type=d.get("userType") or d.get("user_type") or "employee",
        avatar_url=d.get("avatarUrl") or d.get("avatar_url") or "",
        bio=d.get("bio") or "",
        is_active=d.get("isActive", d.get("is_active", True)),
        created_at=d.get("createdAt") or d.get("created_at") or datetime.now(UTC),
    )


def _channel_to_dict(row: Channel) -> dict[str, Any]:
    return {
        "id": row.id,
        "workspaceId": row.workspace_id,
        "slug": row.slug,
        "title": row.title,
        "topic": row.topic or "",
        "isPrivate": row.is_private,
        "createdBy": row.created_by_user_id,
        "createdAt": row.created_at,
        "iconUrl": row.icon_url or "",
    }


def _apply_channel_dict(row: Channel, d: dict[str, Any]) -> None:
    row.workspace_id = d.get("workspaceId", row.workspace_id)
    row.slug = d.get("slug", row.slug)
    row.title = d.get("title", row.title)
    row.topic = d.get("topic", row.topic)
    row.is_private = d.get("isPrivate", row.is_private)
    row.created_by_user_id = d.get("createdBy", row.created_by_user_id)
    row.created_at = d.get("createdAt", row.created_at)
    if "iconUrl" in d:
        row.icon_url = d.get("iconUrl") or ""


def _group_to_dict(session: Session, row: Group) -> dict[str, Any]:
    mids = session.scalars(
        select(GroupMember.user_id).where(GroupMember.group_id == row.id)
    ).all()
    return {
        "id": row.id,
        "workspaceId": row.workspace_id,
        "title": row.title,
        "createdBy": row.created_by_user_id,
        "createdAt": row.created_at,
        "memberIds": list(mids),
        "iconUrl": row.icon_url or "",
    }


def _set_group_members(session: Session, gid: str, member_ids: list[str]) -> None:
    session.execute(delete(GroupMember).where(GroupMember.group_id == gid))
    for uid in member_ids:
        session.add(GroupMember(group_id=gid, user_id=uid))


def _direct_to_dict(session: Session, row: Direct) -> dict[str, Any]:
    uids = sorted(
        session.scalars(
            select(DirectParticipant.user_id).where(DirectParticipant.direct_id == row.id)
        ).all()
    )
    return {
        "id": row.id,
        "workspaceId": row.workspace_id,
        "userIds": uids,
        "createdAt": row.created_at,
    }


def _set_direct_participants(session: Session, did: str, user_ids: list[str]) -> None:
    session.execute(delete(DirectParticipant).where(DirectParticipant.direct_id == did))
    for uid in user_ids:
        session.add(DirectParticipant(direct_id=did, user_id=uid))


def _message_conversation_tuple(row: Message) -> tuple[str, str]:
    if row.channel_id is not None:
        return ("channel", row.channel_id)
    if row.group_id is not None:
        return ("group", row.group_id)
    if row.direct_id is not None:
        return ("direct", row.direct_id)
    raise AssertionError("message row missing conversation foreign keys")


def _message_apply_conversation_fks(row: Message, ctype: str, cid: str) -> None:
    row.channel_id = None
    row.group_id = None
    row.direct_id = None
    if ctype == "channel":
        row.channel_id = cid
    elif ctype == "group":
        row.group_id = cid
    elif ctype == "direct":
        row.direct_id = cid
    else:
        raise ValueError(f"invalid conversationType: {ctype!r}")


def _assert_parent_same_conversation(
    session: Session, parent_id: str, ctype: str, cid: str
) -> None:
    parent = session.get(Message, parent_id)
    if parent is None:
        raise ValueError("parent message not found")
    pct, pci = _message_conversation_tuple(parent)
    if pct != ctype or pci != cid:
        raise ValueError("parent message is not in the same conversation")


def _message_to_dict(row: Message) -> dict[str, Any]:
    ctype, cid = _message_conversation_tuple(row)
    return {
        "id": row.id,
        "conversationType": ctype,
        "conversationId": cid,
        "authorId": row.author_id,
        "text": row.text,
        "parentMessageId": row.parent_message_id,
        "createdAt": row.created_at,
        "editedAt": row.edited_at,
        "deletedAt": row.deleted_at,
    }


def _apply_message_dict(row: Message, d: dict[str, Any]) -> None:
    if "conversationType" in d and "conversationId" in d:
        _message_apply_conversation_fks(row, d["conversationType"], d["conversationId"])
    elif "conversationType" in d or "conversationId" in d:
        raise ValueError("conversationType and conversationId must be updated together")
    if "authorId" in d:
        row.author_id = d["authorId"]
    if "text" in d:
        row.text = d["text"]
    if "parentMessageId" in d:
        row.parent_message_id = d["parentMessageId"]
    if "createdAt" in d:
        row.created_at = d["createdAt"]
    if "editedAt" in d:
        row.edited_at = d["editedAt"]
    if "deletedAt" in d:
        row.deleted_at = d["deletedAt"]


def _attachment_to_dict(row: Attachment) -> dict[str, Any]:
    return {
        "id": row.id,
        "messageId": row.message_id,
        "type": row.type,
        "name": row.name,
        "sizeBytes": row.size_bytes,
        "mimeType": row.mime_type,
        "url": row.url,
    }


def _saved_to_dict(row: SavedItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "userId": row.user_id,
        "type": row.type,
        "messageId": row.message_id,
        "fileName": row.file_name,
        "conversationType": row.conversation_type,
        "conversationId": row.conversation_id,
        "note": row.note or "",
        "savedAt": row.saved_at,
    }


def _activity_to_dict(row: Activity) -> dict[str, Any]:
    return {
        "id": row.id,
        "userId": row.user_id,
        "type": row.type,
        "actorId": row.actor_id,
        "messageId": row.message_id,
        "conversationType": row.conversation_type,
        "conversationId": row.conversation_id,
        "payload": row.payload or {},
        "createdAt": row.created_at,
        "readAt": row.read_at,
    }


def _invite_to_dict(row: Invite) -> dict[str, Any]:
    return {
        "id": row.id,
        "token": row.token,
        "workspaceId": row.workspace_id,
        "createdBy": row.created_by_user_id,
        "expiresAt": row.expires_at,
        "usedAt": row.used_at,
        "presetEmail": row.preset_email,
        "presetName": row.preset_name,
    }


def _apply_invite_dict(row: Invite, d: dict[str, Any]) -> None:
    if "workspaceId" in d:
        row.workspace_id = d["workspaceId"]
    if "createdBy" in d:
        row.created_by_user_id = d["createdBy"]
    if "expiresAt" in d:
        row.expires_at = d["expiresAt"]
    if "usedAt" in d:
        row.used_at = d["usedAt"]
    if "presetEmail" in d:
        row.preset_email = d.get("presetEmail")
    if "presetName" in d:
        row.preset_name = d.get("presetName")


class _UsersMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, uid: str) -> dict[str, Any] | None:
        row = self._s.get(User, uid)
        return _user_to_dict(row) if row else None

    def __getitem__(self, uid: str) -> dict[str, Any]:
        u = self.get(uid)
        if not u:
            raise KeyError(uid)
        return u

    def __setitem__(self, uid: str, d: dict[str, Any]) -> None:
        row = self._s.get(User, uid)
        ws = d.get("workspaceId") or (row.workspace_id if row else "w_1")
        if row:
            _apply_user_dict(row, d)
        else:
            self._s.add(_user_from_dict(uid, d, ws))

    def __contains__(self, uid: str) -> bool:
        return self._s.get(User, uid) is not None

    def values(self) -> list[dict[str, Any]]:
        return [_user_to_dict(r) for r in self._s.scalars(select(User)).all()]


class _EmailIndex:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, email: str) -> str | None:
        e = email.lower().strip()
        row = self._s.scalar(select(User).where(func.lower(User.email) == e))
        return row.id if row else None

    def __setitem__(self, email: str, uid: str) -> None:
        return

    def __delitem__(self, email: str) -> None:
        return

    def __contains__(self, email: str) -> bool:
        return self.get(email) is not None


class _ChannelsMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, cid: str) -> dict[str, Any] | None:
        row = self._s.get(Channel, cid)
        return _channel_to_dict(row) if row else None

    def __setitem__(self, cid: str, d: dict[str, Any]) -> None:
        row = self._s.get(Channel, cid)
        if row:
            _apply_channel_dict(row, d)
        else:
            self._s.add(
                Channel(
                    id=cid,
                    workspace_id=d["workspaceId"],
                    slug=d["slug"],
                    title=d["title"],
                    topic=d.get("topic") or "",
                    is_private=d["isPrivate"],
                    created_by_user_id=d["createdBy"],
                    created_at=d["createdAt"],
                    icon_url=d.get("iconUrl") or "",
                )
            )

    def __delitem__(self, cid: str) -> None:
        row = self._s.get(Channel, cid)
        if row:
            self._s.delete(row)

    def values(self) -> list[dict[str, Any]]:
        return [_channel_to_dict(r) for r in self._s.scalars(select(Channel)).all()]


class _GroupsMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, gid: str) -> dict[str, Any] | None:
        row = self._s.get(Group, gid)
        return _group_to_dict(self._s, row) if row else None

    def __setitem__(self, gid: str, d: dict[str, Any]) -> None:
        row = self._s.get(Group, gid)
        if row:
            row.title = d.get("title", row.title)
            row.workspace_id = d.get("workspaceId", row.workspace_id)
            row.created_by_user_id = d.get("createdBy", row.created_by_user_id)
            row.created_at = d.get("createdAt", row.created_at)
            if "iconUrl" in d:
                row.icon_url = d.get("iconUrl") or ""
            if "memberIds" in d:
                _set_group_members(self._s, gid, list(d["memberIds"]))
        else:
            self._s.add(
                Group(
                    id=gid,
                    workspace_id=d["workspaceId"],
                    title=d["title"],
                    created_by_user_id=d["createdBy"],
                    created_at=d["createdAt"],
                    icon_url=d.get("iconUrl") or "",
                )
            )
            _set_group_members(self._s, gid, list(d.get("memberIds", [])))

    def __delitem__(self, gid: str) -> None:
        row = self._s.get(Group, gid)
        if row:
            self._s.delete(row)

    def values(self) -> list[dict[str, Any]]:
        return [_group_to_dict(self._s, r) for r in self._s.scalars(select(Group)).all()]


class _DirectsMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, did: str) -> dict[str, Any] | None:
        row = self._s.get(Direct, did)
        return _direct_to_dict(self._s, row) if row else None

    def __setitem__(self, did: str, d: dict[str, Any]) -> None:
        row = self._s.get(Direct, did)
        if row:
            row.workspace_id = d.get("workspaceId", row.workspace_id)
            row.created_at = d.get("createdAt", row.created_at)
            if "userIds" in d:
                _set_direct_participants(self._s, did, list(d["userIds"]))
        else:
            self._s.add(
                Direct(
                    id=did,
                    workspace_id=d["workspaceId"],
                    created_at=d["createdAt"],
                )
            )
            _set_direct_participants(self._s, did, list(d["userIds"]))

    def values(self) -> list[dict[str, Any]]:
        return [_direct_to_dict(self._s, r) for r in self._s.scalars(select(Direct)).all()]


class _MessagesMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, mid: str) -> dict[str, Any] | None:
        row = self._s.get(Message, mid)
        return _message_to_dict(row) if row else None

    def __setitem__(self, mid: str, d: dict[str, Any]) -> None:
        row = self._s.get(Message, mid)
        if row:
            _apply_message_dict(row, d)
            pid = row.parent_message_id
            if pid:
                ct, ci = _message_conversation_tuple(row)
                _assert_parent_same_conversation(self._s, pid, ct, ci)
        else:
            pid = d.get("parentMessageId")
            if pid:
                _assert_parent_same_conversation(
                    self._s, pid, d["conversationType"], d["conversationId"]
                )
            msg = Message(
                id=mid,
                channel_id=None,
                group_id=None,
                direct_id=None,
                author_id=d["authorId"],
                text=d["text"],
                parent_message_id=pid,
                created_at=d["createdAt"],
                edited_at=d.get("editedAt"),
                deleted_at=d.get("deletedAt"),
            )
            _message_apply_conversation_fks(msg, d["conversationType"], d["conversationId"])
            self._s.add(msg)

    def __delitem__(self, mid: str) -> None:
        row = self._s.get(Message, mid)
        if row:
            self._s.delete(row)

    def values(self) -> list[dict[str, Any]]:
        return [_message_to_dict(r) for r in self._s.scalars(select(Message)).all()]


class _AttachmentsMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, aid: str) -> dict[str, Any] | None:
        row = self._s.get(Attachment, aid)
        return _attachment_to_dict(row) if row else None

    def __setitem__(self, aid: str, d: dict[str, Any]) -> None:
        row = self._s.get(Attachment, aid)
        if row:
            row.message_id = d.get("messageId", row.message_id)
            row.type = d.get("type", row.type)
            row.name = d.get("name", row.name)
            row.size_bytes = d.get("sizeBytes", row.size_bytes)
            row.mime_type = d.get("mimeType", row.mime_type)
            row.url = d.get("url", row.url)
        else:
            self._s.add(
                Attachment(
                    id=aid,
                    message_id=d["messageId"],
                    type=d["type"],
                    name=d["name"],
                    size_bytes=d["sizeBytes"],
                    mime_type=d.get("mimeType") or "application/octet-stream",
                    url=d.get("url") or "",
                )
            )

    def __delitem__(self, aid: str) -> None:
        row = self._s.get(Attachment, aid)
        if row:
            self._s.delete(row)

    def values(self) -> list[dict[str, Any]]:
        return [_attachment_to_dict(r) for r in self._s.scalars(select(Attachment)).all()]

    def items(self) -> list[tuple[str, dict[str, Any]]]:
        return [(r.id, _attachment_to_dict(r)) for r in self._s.scalars(select(Attachment)).all()]


class _SavedMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, sid: str) -> dict[str, Any] | None:
        row = self._s.get(SavedItem, sid)
        return _saved_to_dict(row) if row else None

    def __setitem__(self, sid: str, d: dict[str, Any]) -> None:
        row = self._s.get(SavedItem, sid)
        if row:
            row.user_id = d.get("userId", row.user_id)
            row.type = d.get("type", row.type)
            row.message_id = d.get("messageId", row.message_id)
            row.file_name = d.get("fileName", row.file_name)
            row.conversation_type = d.get("conversationType", row.conversation_type)
            row.conversation_id = d.get("conversationId", row.conversation_id)
            row.note = d.get("note", row.note)
            row.saved_at = d.get("savedAt", row.saved_at)
        else:
            self._s.add(
                SavedItem(
                    id=sid,
                    user_id=d["userId"],
                    type=d["type"],
                    message_id=d.get("messageId"),
                    file_name=d.get("fileName"),
                    conversation_type=d["conversationType"],
                    conversation_id=d["conversationId"],
                    note=d.get("note") or "",
                    saved_at=d["savedAt"],
                )
            )

    def __delitem__(self, sid: str) -> None:
        row = self._s.get(SavedItem, sid)
        if row:
            self._s.delete(row)

    def values(self) -> list[dict[str, Any]]:
        return [_saved_to_dict(r) for r in self._s.scalars(select(SavedItem)).all()]


class _ActivitiesMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, aid: str) -> dict[str, Any] | None:
        row = self._s.get(Activity, aid)
        return _activity_to_dict(row) if row else None

    def __setitem__(self, aid: str, d: dict[str, Any]) -> None:
        row = self._s.get(Activity, aid)
        if row:
            row.read_at = d.get("readAt", row.read_at)
            row.payload = d.get("payload", row.payload)
            row.user_id = d.get("userId", row.user_id)
            row.type = d.get("type", row.type)
            row.actor_id = d.get("actorId", row.actor_id)
            row.message_id = d.get("messageId", row.message_id)
            row.conversation_type = d.get("conversationType", row.conversation_type)
            row.conversation_id = d.get("conversationId", row.conversation_id)
            row.created_at = d.get("createdAt", row.created_at)
        else:
            self._s.add(
                Activity(
                    id=aid,
                    user_id=d["userId"],
                    type=d["type"],
                    actor_id=d.get("actorId"),
                    message_id=d.get("messageId"),
                    conversation_type=d.get("conversationType"),
                    conversation_id=d.get("conversationId"),
                    payload=d.get("payload") or {},
                    created_at=d["createdAt"],
                    read_at=d.get("readAt"),
                )
            )

    def values(self) -> list[dict[str, Any]]:
        return [_activity_to_dict(r) for r in self._s.scalars(select(Activity)).all()]


class _InvitesMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, token: str) -> dict[str, Any] | None:
        row = self._s.scalar(select(Invite).where(Invite.token == token))
        return _invite_to_dict(row) if row else None

    def __setitem__(self, token: str, d: dict[str, Any]) -> None:
        row = self._s.scalar(select(Invite).where(Invite.token == token))
        if row:
            _apply_invite_dict(row, d)
        else:
            self._s.add(
                Invite(
                    id=d["id"],
                    token=token,
                    workspace_id=d["workspaceId"],
                    created_by_user_id=d["createdBy"],
                    expires_at=d["expiresAt"],
                    used_at=d.get("usedAt"),
                    preset_email=d.get("presetEmail"),
                    preset_name=d.get("presetName"),
                )
            )


class _SessionsMap:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, token: str) -> dict[str, Any] | None:
        row = self._s.get(UserSession, token)
        if not row:
            return None
        return {
            "token": row.token,
            "userId": row.user_id,
            "expiresAt": row.expires_at,
        }

    def __setitem__(self, token: str, d: dict[str, Any]) -> None:
        row = self._s.get(UserSession, token)
        if row:
            row.user_id = d["userId"]
            row.expires_at = d.get("expiresAt")
        else:
            self._s.add(
                UserSession(
                    token=token,
                    user_id=d["userId"],
                    expires_at=d.get("expiresAt"),
                )
            )

    def __delitem__(self, token: str) -> None:
        row = self._s.get(UserSession, token)
        if row:
            self._s.delete(row)

    def pop(self, token: str, default: Any = None) -> Any:
        row = self._s.get(UserSession, token)
        if not row:
            return default
        self._s.delete(row)
        return {"token": row.token, "userId": row.user_id, "expiresAt": row.expires_at}

    def items(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for row in self._s.scalars(select(UserSession)).all():
            out.append(
                (
                    row.token,
                    {
                        "token": row.token,
                        "userId": row.user_id,
                        "expiresAt": row.expires_at,
                    },
                )
            )
        return out


class _MembershipsList:
    def __init__(self, session: Session) -> None:
        self._s = session

    def __iter__(self) -> Iterator[dict[str, Any]]:
        for m in self._s.scalars(select(Membership)).all():
            yield {
                "id": m.id,
                "userId": m.user_id,
                "targetType": m.target_type,
                "targetId": m.target_id,
                "joinedAt": m.joined_at,
                "role": m.role,
            }


class _ReactionsList:
    def __init__(self, session: Session) -> None:
        self._s = session

    def __iter__(self) -> Iterator[dict[str, Any]]:
        for r in self._s.scalars(select(Reaction)).all():
            yield {"messageId": r.message_id, "emoji": r.emoji, "userId": r.user_id}

    def append(self, d: dict[str, Any]) -> None:
        self._s.add(
            Reaction(
                message_id=d["messageId"],
                emoji=d["emoji"],
                user_id=d["userId"],
            )
        )


class Store:
    def __init__(self, session: Session) -> None:
        self._session = session
        self.users = _UsersMap(session)
        self.user_by_email = _EmailIndex(session)
        self.channels = _ChannelsMap(session)
        self.groups = _GroupsMap(session)
        self.directs = _DirectsMap(session)
        self.messages = _MessagesMap(session)
        self.attachments = _AttachmentsMap(session)
        self.saved = _SavedMap(session)
        self.activities = _ActivitiesMap(session)
        self.invites = _InvitesMap(session)
        self.sessions = _SessionsMap(session)
        self.memberships = _MembershipsList(session)
        self.reactions = _ReactionsList(session)

    @property
    def session(self) -> Session:
        return self._session

    @property
    def workspace(self) -> dict[str, Any]:
        w = self._session.scalar(select(Workspace))
        if not w:
            return {}
        return {"id": w.id, "name": w.name, "createdAt": w.created_at}

    def next_id(self, prefix: str) -> str:
        return f"{prefix}_{secrets.token_hex(8)}"

    def add_membership(
        self,
        user_id: str,
        target_type: str,
        target_id: str,
        role: str | None = None,
    ) -> dict[str, Any]:
        mid = self.next_id("mb")
        m = Membership(
            id=mid,
            user_id=user_id,
            target_type=target_type,
            target_id=target_id,
            joined_at=datetime.now(UTC),
            role=role,
        )
        self._session.add(m)
        return {
            "id": mid,
            "userId": user_id,
            "targetType": target_type,
            "targetId": target_id,
            "joinedAt": m.joined_at,
            "role": role,
        }

    def remove_memberships_for_channel(self, channel_id: str) -> None:
        self._session.execute(
            delete(Membership).where(
                Membership.target_type == "channel",
                Membership.target_id == channel_id,
            )
        )

    def remove_channel_member(self, channel_id: str, user_id: str) -> None:
        self._session.execute(
            delete(Membership).where(
                Membership.target_type == "channel",
                Membership.target_id == channel_id,
                Membership.user_id == user_id,
            )
        )

    def remove_reaction(self, message_id: str, emoji: str, user_id: str) -> None:
        self._session.execute(
            delete(Reaction).where(
                Reaction.message_id == message_id,
                Reaction.emoji == emoji,
                Reaction.user_id == user_id,
            )
        )

    def delete_reactions_for_message(self, message_id: str) -> None:
        self._session.execute(delete(Reaction).where(Reaction.message_id == message_id))
