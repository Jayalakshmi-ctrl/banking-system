from __future__ import annotations

from typing import Any

from pymongo.collection import Collection
from pymongo.database import Database

from src.domain.models import Notification

NOTIFICATIONS_COLLECTION = "notifications_log"


class NotificationRepository:
    def __init__(self, db: Database[Any]) -> None:
        self._coll: Collection[Any] = db[NOTIFICATIONS_COLLECTION]

    def insert(self, notification: Notification) -> None:
        self._coll.insert_one(notification.to_document())

    def find_by_id(self, notification_id: str) -> Notification | None:
        doc = self._coll.find_one({"notification_id": notification_id})
        if doc is None:
            return None
        return Notification.from_document(doc)

    def list_paginated(self, limit: int, offset: int) -> tuple[list[Notification], int]:
        total = self._coll.count_documents({})
        cursor = (
            self._coll.find({})
            .sort("created_at", -1)
            .skip(offset)
            .limit(limit)
        )
        items = [Notification.from_document(d) for d in cursor]
        return items, total

    def update(self, notification: Notification) -> None:
        self._coll.replace_one(
            {"notification_id": notification.notification_id},
            notification.to_document(),
        )
