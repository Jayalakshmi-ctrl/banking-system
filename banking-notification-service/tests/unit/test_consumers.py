from __future__ import annotations

import mongomock
import pytest

from src.application.consumers import ConsumerHandlers
from src.application.services import NotificationService
from src.config import Settings
from src.infrastructure.repositories import NotificationRepository


@pytest.fixture()
def service_and_handlers() -> tuple[NotificationService, ConsumerHandlers]:
    settings = Settings(
        mongodb_url="mongodb://localhost/notification_db",
        rabbitmq_url="amqp://guest:guest@localhost/",
        high_value_threshold_inr=50_000,
        max_retry_count=3,
        port=8004,
        log_level="INFO",
        service_version="1.0.0",
    )
    client = mongomock.MongoClient("mongodb://localhost/notification_db")
    db = client.get_default_database(default="notification_db")
    repo = NotificationRepository(db)
    service = NotificationService(repo, settings)
    return service, ConsumerHandlers(service)


def test_handle_txn_body_ignores_invalid_json(
    service_and_handlers: tuple[NotificationService, ConsumerHandlers],
) -> None:
    _, handlers = service_and_handlers
    handlers.handle_txn_body(b"not-json{")


def test_handle_txn_body_ignores_non_object(
    service_and_handlers: tuple[NotificationService, ConsumerHandlers],
) -> None:
    _, handlers = service_and_handlers
    handlers.handle_txn_body(b"[1,2,3]")


def test_handle_txn_body_processes_high_value(
    service_and_handlers: tuple[NotificationService, ConsumerHandlers],
) -> None:
    service, handlers = service_and_handlers
    body = (
        b'{"txn_id":"550e8400-e29b-41d4-a716-446655440000",'
        b'"account_id":"550e8400-e29b-41d4-a716-446655440001",'
        b'"amount":200000,"txn_type":"TRANSFER_OUT","reference":"R1",'
        b'"counterparty":"X","customer_email":"u@example.com"}'
    )
    handlers.handle_txn_body(body)
    listed = service.list_notifications(10, 0)
    assert listed.total == 1


def test_handle_account_body_uses_sms_when_no_email(
    service_and_handlers: tuple[NotificationService, ConsumerHandlers],
) -> None:
    service, handlers = service_and_handlers
    body = (
        b'{"account_id":"550e8400-e29b-41d4-a716-446655440000",'
        b'"customer_id":"550e8400-e29b-41d4-a716-446655440001",'
        b'"old_status":"ACTIVE","new_status":"FROZEN",'
        b'"customer_email":"","customer_phone":"919876543015"}'
    )
    handlers.handle_account_body(body)
    listed = service.list_notifications(10, 0)
    assert listed.total == 1
    assert listed.data[0]["channel"] == "SMS"
