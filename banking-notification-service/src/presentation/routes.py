from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Any

from flasgger import swag_from
from flask import Blueprint, Response, g, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from src.application.dtos import SendNotificationRequest
from src.application.services import NotificationService
from src.config import LIST_DEFAULT_LIMIT, LIST_MAX_LIMIT, LIST_MIN_LIMIT, Settings
from src.domain.enums import EventType, NotificationChannel
from src.infrastructure import database, messaging
from src.presentation import schemas

UUID_V4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
PROBLEM_JSON = "application/problem+json"


@dataclass(frozen=True)
class RouteDependencies:
    settings: Settings
    notification_service: NotificationService


def register_routes(app: Any, deps: RouteDependencies) -> None:
    bp = Blueprint("notification_api", __name__)

    @bp.get("/api/v1/notifications")
    @swag_from(schemas.NOTIFICATION_LIST_SWAGGER)
    def list_notifications() -> Any:
        return _handle_list(deps.notification_service)

    @bp.get("/api/v1/notifications/<string:notification_id>")
    @swag_from(schemas.NOTIFICATION_GET_SWAGGER)
    def get_notification(notification_id: str) -> Any:
        return _handle_get(deps.notification_service, notification_id)

    @bp.post("/internal/notifications/send")
    @swag_from(schemas.INTERNAL_SEND_SWAGGER)
    def internal_send() -> Any:
        return _handle_internal_send(deps.notification_service)

    @bp.get("/health")
    @swag_from(schemas.HEALTH_SWAGGER)
    def health() -> Any:
        return _handle_health(deps.settings)

    @bp.get("/metrics")
    @swag_from(schemas.METRICS_SWAGGER)
    def metrics() -> Any:
        payload = generate_latest()
        return Response(payload, mimetype=CONTENT_TYPE_LATEST)

    app.register_blueprint(bp)


def _problem(
    *,
    status: int,
    title: str,
    detail: str,
    type_uri: str = "about:blank",
) -> tuple[Any, int]:
    body = {
        "type": type_uri,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": getattr(g, "correlation_id", None),
    }
    resp = jsonify(body)
    resp.headers["Content-Type"] = PROBLEM_JSON
    return resp, status


def _handle_list(service: NotificationService) -> Any:
    limit = _parse_limit(request.args.get("limit"))
    offset = _parse_offset(request.args.get("offset"))
    if limit is None or offset is None:
        return _problem(
            status=400,
            title="Bad Request",
            detail="Request failed",
        )
    result = service.list_notifications(limit, offset)
    return jsonify(
        {
            "data": result.data,
            "total": result.total,
            "limit": result.limit,
            "offset": result.offset,
        }
    )


def _parse_limit(raw: str | None) -> int | None:
    if raw is None or raw == "":
        return LIST_DEFAULT_LIMIT
    try:
        value = int(raw)
    except ValueError:
        return None
    if value < LIST_MIN_LIMIT or value > LIST_MAX_LIMIT:
        return None
    return value


def _parse_offset(raw: str | None) -> int | None:
    if raw is None or raw == "":
        return 0
    try:
        value = int(raw)
    except ValueError:
        return None
    if value < 0:
        return None
    return value


def _handle_get(service: NotificationService, notification_id: str) -> Any:
    if not UUID_V4_PATTERN.match(notification_id):
        return _problem(
            status=400,
            title="Bad Request",
            detail="Request failed",
        )
    found = service.get_by_id(notification_id)
    if found is None:
        return _problem(
            status=404,
            title="Not Found",
            detail="Request failed",
        )
    return jsonify(found.as_api_dict())


def _handle_internal_send(service: NotificationService) -> Any:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _problem(
            status=422,
            title="Unprocessable Entity",
            detail="Request failed",
        )
    parsed = _parse_send_payload(payload)
    if parsed is None:
        return _problem(
            status=422,
            title="Unprocessable Entity",
            detail="Request failed",
        )
    notification_id = service.send_internal(parsed)
    return jsonify({"notification_id": notification_id}), 201


def _parse_send_payload(payload: dict[str, Any]) -> SendNotificationRequest | None:
    recipient_email = payload.get("recipient_email")
    recipient_phone = payload.get("recipient_phone")
    channel_raw = payload.get("channel")
    event_raw = payload.get("event_type")
    body = payload.get("payload")
    if not isinstance(recipient_email, str):
        return None
    if not isinstance(recipient_phone, str):
        return None
    if not isinstance(channel_raw, str):
        return None
    if not isinstance(event_raw, str):
        return None
    if not isinstance(body, dict):
        return None
    if len(recipient_email) > 320 or len(recipient_phone) > 32:
        return None
    try:
        channel = NotificationChannel(channel_raw)
        event_type = EventType(event_raw)
    except ValueError:
        return None
    return SendNotificationRequest(
        recipient_email=recipient_email,
        recipient_phone=recipient_phone,
        channel=channel,
        event_type=event_type,
        payload=body,
    )


def _handle_health(settings: Settings) -> Any:
    mongo_ok = _check_mongodb(settings.mongodb_url)
    rabbit_ok = _check_rabbitmq(settings.rabbitmq_url)
    body = {
        "status": "healthy" if mongo_ok and rabbit_ok else "unhealthy",
        "service": "notification-service",
        "version": settings.service_version,
        "dependencies": {
            "mongodb": "up" if mongo_ok else "down",
            "rabbitmq": "up" if rabbit_ok else "down",
        },
    }
    status = 200 if mongo_ok and rabbit_ok else 503
    return jsonify(body), status


def _check_mongodb(uri: str) -> bool:
    try:
        client = database.create_mongo_client(uri)
        database.ping_database(client)
        client.close()
        return True
    except Exception:
        return False


def _check_rabbitmq(url: str) -> bool:
    try:
        messaging.check_rabbitmq_connectivity(url)
        return True
    except Exception:
        return False
