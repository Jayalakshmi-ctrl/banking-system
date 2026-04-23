from __future__ import annotations

import json
from typing import Any
from unittest.mock import patch

import mongomock


def test_health_returns_healthy(client: Any) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "notification-service"
    assert payload["version"] == "1.0.0"
    assert payload["dependencies"]["mongodb"] == "up"
    assert payload["dependencies"]["rabbitmq"] == "up"


def test_list_notifications_empty(client: Any) -> None:
    response = client.get("/api/v1/notifications")
    assert response.status_code == 200
    body = response.get_json()
    assert body["data"] == []
    assert body["total"] == 0
    assert body["limit"] == 20
    assert body["offset"] == 0


def test_list_notifications_invalid_limit_returns_400(client: Any) -> None:
    response = client.get("/api/v1/notifications?limit=0")
    assert response.status_code == 400
    assert response.content_type is not None
    assert "problem+json" in response.content_type


def test_list_notifications_invalid_offset_returns_400(client: Any) -> None:
    response = client.get("/api/v1/notifications?offset=-1")
    assert response.status_code == 400


def test_list_notifications_non_numeric_limit_returns_400(client: Any) -> None:
    response = client.get("/api/v1/notifications?limit=abc")
    assert response.status_code == 400


def test_internal_send_sms_transaction_alert_uses_payload_body(client: Any) -> None:
    response = client.post(
        "/internal/notifications/send",
        data=json.dumps(
            {
                "recipient_email": "",
                "recipient_phone": "919876543015",
                "channel": "SMS",
                "event_type": "TRANSACTION_ALERT",
                "payload": {"info": "large transfer"},
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 201


def test_internal_send_sms_channel_returns_201(client: Any) -> None:
    response = client.post(
        "/internal/notifications/send",
        data=json.dumps(
            {
                "recipient_email": "",
                "recipient_phone": "919876543015",
                "channel": "SMS",
                "event_type": "ACCOUNT_STATUS_CHANGE",
                "payload": {"sms_body": "Frozen"},
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 201


def test_internal_send_success_returns_201(client: Any) -> None:
    response = client.post(
        "/internal/notifications/send",
        data=json.dumps(
            {
                "recipient_email": "user@example.com",
                "recipient_phone": "",
                "channel": "EMAIL",
                "event_type": "TRANSACTION_ALERT",
                "payload": {"subject": "Hello", "body": "World"},
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 201
    body = response.get_json()
    assert "notification_id" in body


def test_internal_send_wrong_field_types_returns_422(client: Any) -> None:
    response = client.post(
        "/internal/notifications/send",
        data=json.dumps(
            {
                "recipient_email": 123,
                "recipient_phone": "",
                "channel": "EMAIL",
                "event_type": "TRANSACTION_ALERT",
                "payload": {},
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 422


def test_internal_send_invalid_json_returns_422(client: Any) -> None:
    response = client.post(
        "/internal/notifications/send",
        data="not-json",
        content_type="application/json",
    )
    assert response.status_code == 422


def test_get_notification_not_found_returns_404(client: Any) -> None:
    nid = "550e8400-e29b-41d4-a716-446655440000"
    response = client.get(f"/api/v1/notifications/{nid}")
    assert response.status_code == 404


def test_get_notification_invalid_id_returns_400(client: Any) -> None:
    response = client.get("/api/v1/notifications/not-a-uuid")
    assert response.status_code == 400


def test_correlation_id_roundtrip(client: Any) -> None:
    response = client.get("/health", headers={"X-Correlation-ID": "abc-123"})
    assert response.headers.get("X-Correlation-ID") == "abc-123"


def test_metrics_endpoint_returns_prometheus_text(client: Any) -> None:
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert b"notifications_sent_total" in response.data
    assert b"http_requests_total" in response.data


def test_health_unhealthy_when_dependencies_down() -> None:
    from src.main import create_app

    mongo = mongomock.MongoClient("mongodb://localhost/notification_db")
    with (
        patch("src.presentation.routes._check_mongodb", return_value=False),
        patch("src.presentation.routes._check_rabbitmq", return_value=False),
    ):
        application = create_app(mongo_client=mongo, enable_rabbit_consumer=False)
        response = application.test_client().get("/health")
    assert response.status_code == 503
    body = response.get_json()
    assert body["status"] == "unhealthy"


def test_get_notification_after_create_returns_200(client: Any) -> None:
    create = client.post(
        "/internal/notifications/send",
        data=json.dumps(
            {
                "recipient_email": "user@example.com",
                "recipient_phone": "",
                "channel": "EMAIL",
                "event_type": "ACCOUNT_STATUS_CHANGE",
                "payload": {"subject": "S", "body": "B"},
            }
        ),
        content_type="application/json",
    )
    notification_id = create.get_json()["notification_id"]
    response = client.get(f"/api/v1/notifications/{notification_id}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["notification_id"] == notification_id
