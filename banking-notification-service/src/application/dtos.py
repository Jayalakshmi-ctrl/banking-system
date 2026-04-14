from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from src.domain.enums import EventType, NotificationChannel


@dataclass(frozen=True)
class SendNotificationRequest:
    recipient_email: str
    recipient_phone: str
    channel: NotificationChannel
    event_type: EventType
    payload: dict[str, Any]


@dataclass(frozen=True)
class NotificationListResponse:
    data: list[dict[str, Any]]
    total: int
    limit: int
    offset: int
