from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .security import hash_password

UTC = timezone.utc


def _ts(iso: str) -> datetime:
    if iso.endswith("Z"):
        iso = iso[:-1] + "+00:00"
    return datetime.fromisoformat(iso).astimezone(UTC)


class Store:
    def __init__(self) -> None:
        self.workspace: dict[str, Any] = {}
        self.users: dict[str, dict[str, Any]] = {}
        self.invites: dict[str, dict[str, Any]] = {}
        self.channels: dict[str, dict[str, Any]] = {}
        self.groups: dict[str, dict[str, Any]] = {}
        self.directs: dict[str, dict[str, Any]] = {}
        self.memberships: list[dict[str, Any]] = []
        self.messages: dict[str, dict[str, Any]] = {}
        self.attachments: dict[str, dict[str, Any]] = {}
        self.reactions: list[dict[str, Any]] = []
        self.saved: dict[str, dict[str, Any]] = {}
        self.activities: dict[str, dict[str, Any]] = {}
        self.sessions: dict[str, dict[str, Any]] = {}
        self.user_by_email: dict[str, str] = {}
        self._counter = 0

    def next_id(self, prefix: str) -> str:
        self._counter += 1
        return f"{prefix}_{self._counter}"

    def add_membership(
        self,
        user_id: str,
        target_type: str,
        target_id: str,
        role: str | None = None,
    ) -> dict[str, Any]:
        mid = self.next_id("mb")
        m = {
            "id": mid,
            "userId": user_id,
            "targetType": target_type,
            "targetId": target_id,
            "joinedAt": datetime.now(UTC),
            "role": role,
        }
        self.memberships.append(m)
        return m

    @classmethod
    def seed(cls) -> Store:
        s = cls()
        demo_pw = hash_password("secret12")

        s.workspace = {
            "id": "w_1",
            "name": "Корпоративный воркспейс",
            "createdAt": _ts("2026-01-01T00:00:00Z"),
        }

        user_rows = [
            {
                "id": "u_me",
                "email": "maria@example.com",
                "name": "Мария С.",
                "title": "Продуктовый дизайнер",
                "department": "Дизайн",
                "phone": "+7 (999) 000-00-00",
                "status": "online",
                "userType": "employee",
                "avatarUrl": "https://i.pravatar.cc/150?u=u_me",
            },
            {
                "id": "u_ivan",
                "email": "ivan@example.com",
                "name": "Иван П.",
                "title": "Фронтенд-разработчик",
                "department": "Инженерия",
                "phone": "+7 (999) 111-11-11",
                "status": "away",
                "userType": "employee",
                "avatarUrl": "https://i.pravatar.cc/150?u=u_ivan",
            },
            {
                "id": "u_anna",
                "email": "anna@example.com",
                "name": "Анна К.",
                "title": "HR-партнёр",
                "department": "Люди",
                "phone": "+7 (999) 222-22-22",
                "status": "online",
                "userType": "admin",
                "avatarUrl": "https://i.pravatar.cc/150?u=u_anna",
            },
            {
                "id": "u_guest",
                "email": "alex.contractor@example.com",
                "name": "Алекс (Подрядчик)",
                "title": "iOS-разработчик",
                "department": "Внешний",
                "phone": "",
                "status": "online",
                "userType": "guest",
                "avatarUrl": "https://i.pravatar.cc/150?u=u_guest",
            },
        ]
        for u in user_rows:
            full = {
                **u,
                "passwordHash": demo_pw,
                "bio": "",
                "isActive": True,
                "createdAt": _ts("2026-01-15T10:00:00Z"),
            }
            s.users[u["id"]] = full
            s.user_by_email[u["email"].lower()] = u["id"]

        s.channels = {
            "c_general": {
                "id": "c_general",
                "workspaceId": "w_1",
                "slug": "general",
                "title": "общий",
                "topic": "Общие объявления и обсуждения",
                "isPrivate": False,
                "createdBy": "u_anna",
                "createdAt": _ts("2026-01-10T12:00:00Z"),
            },
            "c_design": {
                "id": "c_design",
                "workspaceId": "w_1",
                "slug": "design",
                "title": "дизайн",
                "topic": "Дизайн-ревью, ресурсы, договорённости",
                "isPrivate": True,
                "createdBy": "u_me",
                "createdAt": _ts("2026-01-10T12:05:00Z"),
            },
            "c_random": {
                "id": "c_random",
                "workspaceId": "w_1",
                "slug": "random",
                "title": "болталка",
                "topic": "Разное",
                "isPrivate": False,
                "createdBy": "u_ivan",
                "createdAt": _ts("2026-01-10T12:10:00Z"),
            },
        }

        for uid in ("u_me", "u_ivan", "u_anna"):
            for cid in ("c_general", "c_design", "c_random"):
                s.add_membership(uid, "channel", cid)
        s.add_membership("u_guest", "channel", "c_general")

        s.groups = {
            "g_launch": {
                "id": "g_launch",
                "workspaceId": "w_1",
                "title": "Команда запуска",
                "createdBy": "u_anna",
                "createdAt": _ts("2026-01-12T09:00:00Z"),
                "memberIds": ["u_me", "u_ivan", "u_anna"],
            }
        }

        s.directs = {
            "d_ivan": {
                "id": "d_ivan",
                "workspaceId": "w_1",
                "userIds": sorted(["u_me", "u_ivan"]),
                "createdAt": _ts("2026-01-11T08:00:00Z"),
            },
            "d_guest": {
                "id": "d_guest",
                "workspaceId": "w_1",
                "userIds": sorted(["u_me", "u_guest"]),
                "createdAt": _ts("2026-01-11T09:00:00Z"),
            },
        }

        def seed_message(
            mid: str,
            ctype: str,
            cid: str,
            author_id: str,
            text: str,
            created_at: datetime,
            parent: str | None,
            att_specs: list[dict[str, Any]],
            react_specs: list[dict[str, Any]],
        ) -> None:
            s.messages[mid] = {
                "id": mid,
                "conversationType": ctype,
                "conversationId": cid,
                "authorId": author_id,
                "text": text,
                "parentMessageId": parent,
                "createdAt": created_at,
                "editedAt": None,
                "deletedAt": None,
            }
            for a in att_specs:
                aid = s.next_id("at")
                size = a.get("sizeBytes", 1024)
                s.attachments[aid] = {
                    "id": aid,
                    "messageId": mid,
                    "type": a["type"],
                    "name": a["name"],
                    "sizeBytes": size,
                    "mimeType": a.get("mimeType", "application/octet-stream"),
                    "url": a.get("url", "https://example.invalid/file"),
                }
            for r in react_specs:
                for uid in r.get("userIds", []):
                    s.reactions.append(
                        {
                            "messageId": mid,
                            "emoji": r["emoji"],
                            "userId": uid,
                        }
                    )

        seed_message(
            "m1",
            "channel",
            "c_general",
            "u_anna",
            "Добро пожаловать в новый мессенджер V1. Здесь пока моковые данные, но навигация уже как в Slack.",
            _ts("2026-04-13T09:12:00Z"),
            None,
            [],
            [{"emoji": "\U0001f44d", "userIds": ["u_me", "u_ivan"]}],
        )
        seed_message(
            "m2",
            "channel",
            "c_general",
            "u_me",
            "Круто. Я добавлю макет профиля и Saved items.",
            _ts("2026-04-13T09:25:00Z"),
            None,
            [
                {
                    "type": "file",
                    "name": "spec-v1.pdf",
                    "sizeBytes": 862208,
                    "mimeType": "application/pdf",
                }
            ],
            [{"emoji": "\u2705", "userIds": ["u_anna"]}],
        )
        seed_message(
            "m3",
            "channel",
            "c_general",
            "u_ivan",
            "Я возьму Threads и Mentions. Можно сделать правый сайдбар с Files/People?",
            _ts("2026-04-13T10:02:00Z"),
            "m1",
            [
                {
                    "type": "image",
                    "name": "layout.png",
                    "sizeBytes": 1468006,
                    "mimeType": "image/png",
                }
            ],
            [],
        )
        seed_message(
            "m10",
            "channel",
            "c_design",
            "u_me",
            "В приватном #design обсуждаем UI. Гость это не видит.",
            _ts("2026-04-14T08:10:00Z"),
            None,
            [],
            [{"emoji": "\U0001f440", "userIds": ["u_ivan"]}],
        )
        seed_message(
            "m20",
            "direct",
            "d_ivan",
            "u_ivan",
            "Привет! Сможешь посмотреть мой PR по компоненту Composer?",
            _ts("2026-04-14T11:40:00Z"),
            None,
            [],
            [],
        )
        seed_message(
            "m21",
            "direct",
            "d_ivan",
            "u_me",
            "Да, после обеда.",
            _ts("2026-04-14T11:43:00Z"),
            None,
            [],
            [{"emoji": "\U0001f64c", "userIds": ["u_ivan"]}],
        )
        seed_message(
            "m30",
            "direct",
            "d_guest",
            "u_guest",
            "Hi! I can only see #general, that’s expected for guest access.",
            _ts("2026-04-14T13:00:00Z"),
            None,
            [],
            [],
        )
        seed_message(
            "m40",
            "group",
            "g_launch",
            "u_anna",
            "План запуска: в пятницу включаем доступ всей компании.",
            _ts("2026-04-14T10:00:00Z"),
            None,
            [],
            [],
        )

        s.saved = {
            "s1": {
                "id": "s1",
                "userId": "u_me",
                "type": "message",
                "messageId": "m2",
                "fileName": None,
                "conversationType": "channel",
                "conversationId": "c_general",
                "note": "",
                "savedAt": _ts("2026-04-14T09:00:00Z"),
            },
            "s2": {
                "id": "s2",
                "userId": "u_me",
                "type": "file",
                "messageId": None,
                "fileName": "spec-v1.pdf",
                "conversationType": "channel",
                "conversationId": "c_general",
                "note": "",
                "savedAt": _ts("2026-04-14T09:01:00Z"),
            },
        }

        s.activities = {
            "a1": {
                "id": "a1",
                "userId": "u_me",
                "type": "mention",
                "actorId": "u_anna",
                "messageId": "m2",
                "conversationType": "channel",
                "conversationId": "c_general",
                "payload": {
                    "text": "@Мария С. посмотри, пожалуйста, финальный текст анонса."
                },
                "createdAt": _ts("2026-04-14T09:20:00Z"),
                "readAt": None,
            },
            "a2": {
                "id": "a2",
                "userId": "u_me",
                "type": "reaction",
                "actorId": "u_ivan",
                "messageId": "m21",
                "conversationType": "direct",
                "conversationId": "d_ivan",
                "payload": {"emoji": "\U0001f64c"},
                "createdAt": _ts("2026-04-14T11:44:00Z"),
                "readAt": None,
            },
        }

        exp = datetime.now(UTC) + timedelta(days=7)
        s.invites["inv_demo_complete"] = {
            "id": "inv_1",
            "token": "inv_demo_complete",
            "workspaceId": "w_1",
            "createdBy": "u_anna",
            "expiresAt": exp,
            "usedAt": None,
            "presetEmail": "newhire@example.com",
            "presetName": "Новый Сотрудник",
        }

        return s


_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store.seed()
    return _store
