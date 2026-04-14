from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from src.domain.enums import EventType, NotificationChannel, NotificationStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _isoformat_or_none(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@dataclass
class Notification:
    notification_id: str
    recipient_email: str
    recipient_phone: str
    channel: NotificationChannel
    event_type: EventType
    payload: dict[str, Any]
    status: NotificationStatus
    retry_count: int
    created_at: datetime
    sent_at: datetime | None

    def to_document(self) -> dict[str, Any]:
        return {
            "notification_id": self.notification_id,
            "recipient_email": self.recipient_email,
            "recipient_phone": self.recipient_phone,
            "channel": self.channel.value,
            "event_type": self.event_type.value,
            "payload": self.payload,
            "status": self.status.value,
            "retry_count": self.retry_count,
            "created_at": self.created_at,
            "sent_at": self.sent_at,
        }

    def as_api_dict(self) -> dict[str, Any]:
        d = self.to_document()
        d["created_at"] = _isoformat_or_none(d.get("created_at"))
        d["sent_at"] = _isoformat_or_none(d.get("sent_at"))
        return d

    @classmethod
    def from_document(cls, doc: dict[str, Any]) -> Notification:
        return cls(
            notification_id=str(doc["notification_id"]),
            recipient_email=str(doc.get("recipient_email") or ""),
            recipient_phone=str(doc.get("recipient_phone") or ""),
            channel=NotificationChannel(str(doc["channel"])),
            event_type=EventType(str(doc["event_type"])),
            payload=dict(doc.get("payload") or {}),
            status=NotificationStatus(str(doc["status"])),
            retry_count=int(doc.get("retry_count") or 0),
            created_at=doc["created_at"],
            sent_at=doc.get("sent_at"),
        )


def new_notification(
    *,
    notification_id: str,
    recipient_email: str,
    recipient_phone: str,
    channel: NotificationChannel,
    event_type: EventType,
    payload: dict[str, Any],
) -> Notification:
    return Notification(
        notification_id=notification_id,
        recipient_email=recipient_email,
        recipient_phone=recipient_phone,
        channel=channel,
        event_type=event_type,
        payload=payload,
        status=NotificationStatus.PENDING,
        retry_count=0,
        created_at=utc_now(),
        sent_at=None,
    )
