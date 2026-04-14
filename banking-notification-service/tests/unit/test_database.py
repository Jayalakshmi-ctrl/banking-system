from __future__ import annotations

import mongomock

from src.infrastructure.database import get_database, ping_database


def test_ping_database_with_mongomock() -> None:
    client = mongomock.MongoClient("mongodb://localhost:27017/notification_db")
    ping_database(client)
    client.close()


def test_get_database_returns_named_db() -> None:
    client = mongomock.MongoClient("mongodb://localhost:27017/notification_db")
    db = get_database(client, "notification_db")
    assert db.name == "notification_db"
