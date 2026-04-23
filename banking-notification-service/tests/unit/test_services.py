from __future__ import annotations

from unittest.mock import MagicMock, patch

import mongomock
import pytest

from src.application.dtos import SendNotificationRequest
from src.application.services import NotificationService, _status_transition_labels
from src.config import Settings
from src.domain.enums import EventType, NotificationChannel, NotificationStatus
from src.infrastructure.repositories import NotificationRepository


@pytest.fixture()
def settings() -> Settings:
    return Settings(
        mongodb_url="mongodb://localhost/notification_db",
        rabbitmq_url="amqp://guest:guest@localhost/",
        high_value_threshold_inr=50_000,
        max_retry_count=3,
        port=8004,
        log_level="INFO",
        service_version="1.0.0",
    )


@pytest.fixture()
def repository(settings: Settings) -> NotificationRepository:
    client = mongomock.MongoClient()
    db = client.get_database("notification_db")
    return NotificationRepository(db)


@pytest.fixture()
def service(
    repository: NotificationRepository,
    settings: Settings,
) -> NotificationService:
    return NotificationService(repository, settings)


def test_create_from_txn_invalid_amount_does_not_insert(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_txn_message({"amount": "not-a-number"})
    assert repository._coll.count_documents({}) == 0


def test_create_from_txn_below_threshold_does_not_insert(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_txn_message(
        {
            "txn_id": "550e8400-e29b-41d4-a716-446655440000",
            "account_id": "550e8400-e29b-41d4-a716-446655440001",
            "amount": 1000,
            "txn_type": "TRANSFER_OUT",
            "reference": "TXN1",
            "counterparty": "x",
        }
    )
    assert repository._coll.count_documents({}) == 0


def test_create_from_txn_without_email_marks_failed(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_txn_message(
        {
            "txn_id": "550e8400-e29b-41d4-a716-446655440000",
            "account_id": "550e8400-e29b-41d4-a716-446655440001",
            "amount": 200_000,
            "txn_type": "TRANSFER_OUT",
            "reference": "TXN1",
            "counterparty": "x",
        }
    )
    stored = repository._coll.find_one({})
    assert stored is not None
    assert stored["status"] == NotificationStatus.FAILED.value


def test_create_from_txn_missing_amount_skips_insert(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_txn_message(
        {
            "txn_id": "550e8400-e29b-41d4-a716-446655440000",
            "account_id": "550e8400-e29b-41d4-a716-446655440001",
            "txn_type": "TRANSFER_OUT",
        }
    )
    assert repository._coll.count_documents({}) == 0


def test_create_from_txn_above_threshold_inserts(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_txn_message(
        {
            "txn_id": "550e8400-e29b-41d4-a716-446655440000",
            "account_id": "550e8400-e29b-41d4-a716-446655440001",
            "amount": 150_000,
            "txn_type": "TRANSFER_OUT",
            "reference": "TXN1",
            "counterparty": "x",
            "customer_email": "user@example.com",
        }
    )
    assert repository._coll.count_documents({}) == 1


def test_deliver_retries_then_failed(
    repository: NotificationRepository,
    settings: Settings,
) -> None:
    svc = NotificationService(repository, settings)
    mock_send = MagicMock(side_effect=RuntimeError("downstream"))
    request = SendNotificationRequest(
        recipient_email="a@b.com",
        recipient_phone="",
        channel=NotificationChannel.EMAIL,
        event_type=EventType.TRANSACTION_ALERT,
        payload={"subject": "s", "body": "b"},
    )
    with patch("src.application.services.email_sender.send_email", mock_send):
        notification_id = svc.send_internal(request)
    found = svc.get_by_id(notification_id)
    assert found is not None
    assert found.status == NotificationStatus.FAILED
    assert found.retry_count == settings.max_retry_count + 1


def test_account_status_missing_contact_marks_failed(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_account_status_message(
        {
            "account_id": "550e8400-e29b-41d4-a716-446655440000",
            "customer_id": "550e8400-e29b-41d4-a716-446655440001",
            "old_status": "ACTIVE",
            "new_status": "FROZEN",
            "customer_email": "",
            "customer_phone": "",
        }
    )
    assert repository._coll.count_documents({}) == 1
    stored = repository._coll.find_one({})
    assert stored["status"] == NotificationStatus.FAILED.value


def test_status_transition_labels_accepts_java_account_payload_keys() -> None:
    old_s, new_s = _status_transition_labels({"previousStatus": "ACTIVE", "newStatus": "FROZEN"})
    assert old_s == "ACTIVE"
    assert new_s == "FROZEN"


def test_account_status_prefers_email_channel(
    service: NotificationService,
    repository: NotificationRepository,
) -> None:
    service.create_from_account_status_message(
        {
            "account_id": "550e8400-e29b-41d4-a716-446655440000",
            "customer_id": "550e8400-e29b-41d4-a716-446655440001",
            "old_status": "ACTIVE",
            "new_status": "FROZEN",
            "customer_email": "c@d.com",
            "customer_phone": "+919999999999",
        }
    )
    stored = repository._coll.find_one({})
    assert stored is not None
    assert stored["channel"] == NotificationChannel.EMAIL.value
