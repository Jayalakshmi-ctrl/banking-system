from __future__ import annotations

import uuid
from typing import Any

import structlog

from src.application.dtos import NotificationListResponse, SendNotificationRequest
from src.config import Settings
from src.domain.enums import EventType, NotificationChannel, NotificationStatus
from src.domain.models import Notification, new_notification, utc_now
from src.infrastructure import metrics
from src.infrastructure.repositories import NotificationRepository
from src.infrastructure.senders import email_sender, sms_sender

logger = structlog.get_logger(__name__)


class NotificationService:
    def __init__(self, repository: NotificationRepository, settings: Settings) -> None:
        self._repository = repository
        self._settings = settings

    def list_notifications(self, limit: int, offset: int) -> NotificationListResponse:
        items, total = self._repository.list_paginated(limit, offset)
        return NotificationListResponse(
            data=[n.as_api_dict() for n in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_by_id(self, notification_id: str) -> Notification | None:
        return self._repository.find_by_id(notification_id)

    def send_internal(self, request: SendNotificationRequest) -> str:
        notification_id = str(uuid.uuid4())
        notification = new_notification(
            notification_id=notification_id,
            recipient_email=request.recipient_email,
            recipient_phone=request.recipient_phone,
            channel=request.channel,
            event_type=request.event_type,
            payload=request.payload,
        )
        self._repository.insert(notification)
        self._finalize_delivery(notification)
        return notification_id

    def create_from_txn_message(self, message: dict[str, Any]) -> None:
        amount = _parse_amount(message.get("amount"))
        if amount is None:
            logger.warning("txn_consumer_invalid_amount", payload_keys=list(message.keys()))
            return
        if amount <= self._settings.high_value_threshold_inr:
            return
        recipient_email = str(message.get("customer_email") or "")
        recipient_phone = str(message.get("customer_phone") or "")
        notification_id = str(uuid.uuid4())
        notification = new_notification(
            notification_id=notification_id,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            channel=NotificationChannel.EMAIL,
            event_type=EventType.TRANSACTION_ALERT,
            payload=dict(message),
        )
        self._repository.insert(notification)
        self._finalize_delivery(notification)

    def create_from_account_status_message(self, message: dict[str, Any]) -> None:
        recipient_email = str(message.get("customer_email") or "")
        recipient_phone = str(message.get("customer_phone") or "")
        channel, recipient = _resolve_account_channel(recipient_email, recipient_phone)
        notification_id = str(uuid.uuid4())
        notification = new_notification(
            notification_id=notification_id,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            channel=channel,
            event_type=EventType.ACCOUNT_STATUS_CHANGE,
            payload=dict(message),
        )
        self._repository.insert(notification)
        if recipient == "":
            self._mark_invalid_recipient(notification)
            return
        self._finalize_delivery(notification)

    def _mark_invalid_recipient(self, notification: Notification) -> None:
        notification.status = NotificationStatus.FAILED
        self._repository.update(notification)
        metrics.notifications_failed_total.labels(
            channel=notification.channel.value,
            event_type=notification.event_type.value,
        ).inc()
        logger.warning(
            "notification_missing_recipient",
            notification_id=notification.notification_id,
            event_type=notification.event_type.value,
        )

    def _finalize_delivery(self, notification: Notification) -> None:
        if not _has_recipient_for_channel(notification):
            self._mark_invalid_recipient(notification)
            return
        self._deliver_with_retries(notification)

    def _deliver_with_retries(self, notification: Notification) -> None:
        while True:
            try:
                self._send_via_channel(notification)
                notification.status = NotificationStatus.SENT
                notification.sent_at = utc_now()
                self._repository.update(notification)
                metrics.notifications_sent_total.labels(
                    channel=notification.channel.value,
                    event_type=notification.event_type.value,
                ).inc()
                logger.info(
                    "notification_delivered",
                    notification_id=notification.notification_id,
                    status=notification.status.value,
                )
                return
            except Exception:
                notification.retry_count += 1
                self._repository.update(notification)
                logger.exception(
                    "notification_delivery_attempt_failed",
                    notification_id=notification.notification_id,
                    retry_count=notification.retry_count,
                )
                if notification.retry_count > self._settings.max_retry_count:
                    notification.status = NotificationStatus.FAILED
                    self._repository.update(notification)
                    metrics.notifications_failed_total.labels(
                        channel=notification.channel.value,
                        event_type=notification.event_type.value,
                    ).inc()
                    return

    def _send_via_channel(self, notification: Notification) -> None:
        if notification.channel == NotificationChannel.EMAIL:
            subject = str(notification.payload.get("subject") or _default_email_subject(notification))
            body = str(notification.payload.get("body") or _default_email_body(notification))
            email_sender.send_email(
                to_email=notification.recipient_email,
                subject=subject,
                body=body,
            )
            return
        if notification.channel == NotificationChannel.SMS:
            text = str(notification.payload.get("sms_body") or _default_sms_body(notification))
            sms_sender.send_sms(to_phone=notification.recipient_phone, message=text)
            return
        raise ValueError("unsupported_channel")


def _parse_amount(raw: Any) -> float | None:
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _resolve_account_channel(
    email: str,
    phone: str,
) -> tuple[NotificationChannel, str]:
    if email.strip():
        return NotificationChannel.EMAIL, email.strip()
    if phone.strip():
        return NotificationChannel.SMS, phone.strip()
    return NotificationChannel.EMAIL, ""


def _has_recipient_for_channel(notification: Notification) -> bool:
    if notification.channel == NotificationChannel.EMAIL:
        return bool(notification.recipient_email.strip())
    if notification.channel == NotificationChannel.SMS:
        return bool(notification.recipient_phone.strip())
    return False


def _default_email_subject(notification: Notification) -> str:
    if notification.event_type == EventType.TRANSACTION_ALERT:
        return "High value transaction alert"
    if notification.event_type == EventType.ACCOUNT_STATUS_CHANGE:
        return "Account status change"
    return "Notification"


def _default_email_body(notification: Notification) -> str:
    return str(notification.payload)


def _default_sms_body(notification: Notification) -> str:
    if notification.event_type == EventType.ACCOUNT_STATUS_CHANGE:
        old_s = notification.payload.get("old_status", "")
        new_s = notification.payload.get("new_status", "")
        return f"Account status changed from {old_s} to {new_s}"
    return str(notification.payload)
