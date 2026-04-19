from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
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
    Workspace,
)
from .security import hash_password

UTC = timezone.utc


def _ts(iso: str) -> datetime:
    if iso.endswith("Z"):
        iso = iso[:-1] + "+00:00"
    return datetime.fromisoformat(iso).astimezone(UTC)


def seed_if_empty(session: Session) -> None:
    if session.scalar(select(func.count()).select_from(User)):
        return

    demo_pw = hash_password("secret12")

    session.add(
        Workspace(
            id="w_1",
            name="Корпоративный воркспейс",
            created_at=_ts("2026-01-01T00:00:00Z"),
        )
    )

    user_rows = [
        {
            "id": "u_me",
            "email": "maria@example.com",
            "name": "Мария С.",
            "title": "Продуктовый дизайнер",
            "department": "Дизайн",
            "phone": "+7 (999) 000-00-00",
            "status": "online",
            "user_type": "employee",
            "avatar_url": "https://i.pravatar.cc/150?u=u_me",
        },
        {
            "id": "u_ivan",
            "email": "ivan@example.com",
            "name": "Иван П.",
            "title": "Фронтенд-разработчик",
            "department": "Инженерия",
            "phone": "+7 (999) 111-11-11",
            "status": "away",
            "user_type": "employee",
            "avatar_url": "https://i.pravatar.cc/150?u=u_ivan",
        },
        {
            "id": "u_anna",
            "email": "anna@example.com",
            "name": "Анна К.",
            "title": "HR-партнёр",
            "department": "Люди",
            "phone": "+7 (999) 222-22-22",
            "status": "online",
            "user_type": "admin",
            "avatar_url": "https://i.pravatar.cc/150?u=u_anna",
        },
        {
            "id": "u_guest",
            "email": "alex.contractor@example.com",
            "name": "Алекс (Подрядчик)",
            "title": "iOS-разработчик",
            "department": "Внешний",
            "phone": "",
            "status": "online",
            "user_type": "guest",
            "avatar_url": "https://i.pravatar.cc/150?u=u_guest",
        },
    ]
    for u in user_rows:
        session.add(
            User(
                id=u["id"],
                workspace_id="w_1",
                email=u["email"],
                password_hash=demo_pw,
                name=u["name"],
                title=u["title"],
                department=u["department"],
                phone=u["phone"],
                status=u["status"],
                user_type=u["user_type"],
                avatar_url=u["avatar_url"],
                bio="",
                is_active=True,
                created_at=_ts("2026-01-15T10:00:00Z"),
            )
        )

    session.flush()

    session.add_all(
        [
            Channel(
                id="c_general",
                workspace_id="w_1",
                slug="general",
                title="общий",
                topic="Общие объявления и обсуждения",
                is_private=False,
                created_by_user_id="u_anna",
                created_at=_ts("2026-01-10T12:00:00Z"),
            ),
            Channel(
                id="c_design",
                workspace_id="w_1",
                slug="design",
                title="дизайн",
                topic="Дизайн-ревью, ресурсы, договорённости",
                is_private=True,
                created_by_user_id="u_me",
                created_at=_ts("2026-01-10T12:05:00Z"),
            ),
            Channel(
                id="c_random",
                workspace_id="w_1",
                slug="random",
                title="болталка",
                topic="Разное",
                is_private=False,
                created_by_user_id="u_ivan",
                created_at=_ts("2026-01-10T12:10:00Z"),
            ),
        ]
    )

    def add_mb(uid: str, tt: str, tid: str, mid: str) -> None:
        session.add(
            Membership(
                id=mid,
                user_id=uid,
                target_type=tt,
                target_id=tid,
                joined_at=datetime.now(UTC),
                role=None,
            )
        )

    mb = 0
    for uid in ("u_me", "u_ivan", "u_anna"):
        for cid in ("c_general", "c_design", "c_random"):
            mb += 1
            add_mb(uid, "channel", cid, f"mb_{mb}")
    mb += 1
    add_mb("u_guest", "channel", "c_general", f"mb_{mb}")

    g = Group(
        id="g_launch",
        workspace_id="w_1",
        title="Команда запуска",
        created_by_user_id="u_anna",
        created_at=_ts("2026-01-12T09:00:00Z"),
    )
    session.add(g)
    for uid in ("u_me", "u_ivan", "u_anna"):
        session.add(GroupMember(group_id="g_launch", user_id=uid))

    for did, uids in (
        ("d_ivan", ("u_me", "u_ivan")),
        ("d_guest", ("u_me", "u_guest")),
    ):
        session.add(
            Direct(
                id=did,
                workspace_id="w_1",
                created_at=_ts("2026-01-11T08:00:00Z")
                if did == "d_ivan"
                else _ts("2026-01-11T09:00:00Z"),
            )
        )
        for u in sorted(uids):
            session.add(DirectParticipant(direct_id=did, user_id=u))

    def _message_conv_cols(ctype: str, cid: str) -> dict[str, str | None]:
        if ctype == "channel":
            return {"channel_id": cid, "group_id": None, "direct_id": None}
        if ctype == "group":
            return {"channel_id": None, "group_id": cid, "direct_id": None}
        if ctype == "direct":
            return {"channel_id": None, "group_id": None, "direct_id": cid}
        raise ValueError(ctype)

    def seed_message(
        mid: str,
        ctype: str,
        cid: str,
        author_id: str,
        text: str,
        created_at: datetime,
        parent: str | None,
        att_specs: list[dict],
        react_specs: list[dict],
        aid_start: list[int],
    ) -> int:
        session.add(
            Message(
                id=mid,
                author_id=author_id,
                text=text,
                parent_message_id=parent,
                created_at=created_at,
                edited_at=None,
                deleted_at=None,
                **_message_conv_cols(ctype, cid),
            )
        )
        n = aid_start[0]
        for a in att_specs:
            n += 1
            aid = f"at_{n}"
            session.add(
                Attachment(
                    id=aid,
                    message_id=mid,
                    type=a["type"],
                    name=a["name"],
                    size_bytes=a.get("sizeBytes", 1024),
                    mime_type=a.get("mimeType", "application/octet-stream"),
                    url=a.get("url", "https://example.invalid/file"),
                )
            )
        aid_start[0] = n
        for r in react_specs:
            for uid in r.get("userIds", []):
                session.add(Reaction(message_id=mid, emoji=r["emoji"], user_id=uid))
        return n

    aid_counter = [0]

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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
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
        aid_counter,
    )

    session.add_all(
        [
            SavedItem(
                id="s1",
                user_id="u_me",
                type="message",
                message_id="m2",
                file_name=None,
                conversation_type="channel",
                conversation_id="c_general",
                note="",
                saved_at=_ts("2026-04-14T09:00:00Z"),
            ),
            SavedItem(
                id="s2",
                user_id="u_me",
                type="file",
                message_id=None,
                file_name="spec-v1.pdf",
                conversation_type="channel",
                conversation_id="c_general",
                note="",
                saved_at=_ts("2026-04-14T09:01:00Z"),
            ),
        ]
    )

    session.add_all(
        [
            Activity(
                id="a1",
                user_id="u_me",
                type="mention",
                actor_id="u_anna",
                message_id="m2",
                conversation_type="channel",
                conversation_id="c_general",
                payload={
                    "text": "@Мария С. посмотри, пожалуйста, финальный текст анонса."
                },
                created_at=_ts("2026-04-14T09:20:00Z"),
                read_at=None,
            ),
            Activity(
                id="a2",
                user_id="u_me",
                type="reaction",
                actor_id="u_ivan",
                message_id="m21",
                conversation_type="direct",
                conversation_id="d_ivan",
                payload={"emoji": "\U0001f64c"},
                created_at=_ts("2026-04-14T11:44:00Z"),
                read_at=None,
            ),
        ]
    )

    exp = datetime.now(UTC) + timedelta(days=7)
    session.add(
        Invite(
            id="inv_1",
            token="inv_demo_complete",
            workspace_id="w_1",
            created_by_user_id="u_anna",
            expires_at=exp,
            used_at=None,
            preset_email="newhire@example.com",
            preset_name="Новый Сотрудник",
        )
    )

    session.flush()
