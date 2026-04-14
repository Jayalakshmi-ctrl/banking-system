from __future__ import annotations

from enum import Enum


class NotificationChannel(str, Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"


class EventType(str, Enum):
    TRANSACTION_ALERT = "TRANSACTION_ALERT"
    ACCOUNT_STATUS_CHANGE = "ACCOUNT_STATUS_CHANGE"


class NotificationStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
