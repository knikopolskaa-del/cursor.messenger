from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from .models import Base

_DEFAULT_URL = "sqlite:///./messenger.db"

DATABASE_URL = os.environ.get("MESSENGER_DATABASE_URL", _DEFAULT_URL)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)

def _sqlite_has_column(conn, table: str, column: str) -> bool:
    cur = conn.exec_driver_sql(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]  # type: ignore[index]
    return column in cols


def _sqlite_ensure_columns() -> None:
    """
    Minimal dev-time migration helper.

    `create_all()` doesn't alter existing tables, so after schema changes
    (e.g. adding `icon_url`) старые sqlite БД будут ломать API 500.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return
    with engine.begin() as conn:
        # channels.icon_url
        try:
            if _sqlite_has_column(conn, "channels", "icon_url") is False:
                conn.exec_driver_sql("ALTER TABLE channels ADD COLUMN icon_url VARCHAR DEFAULT ''")
        except Exception:
            # If table doesn't exist yet, create_all() will handle it.
            pass
        # groups.icon_url
        try:
            if _sqlite_has_column(conn, "groups", "icon_url") is False:
                conn.exec_driver_sql("ALTER TABLE groups ADD COLUMN icon_url VARCHAR DEFAULT ''")
        except Exception:
            pass


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _sqlite_ensure_columns()


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
