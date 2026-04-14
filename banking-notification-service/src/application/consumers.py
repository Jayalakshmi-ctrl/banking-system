from __future__ import annotations

import json
from typing import Any

import structlog

from src.application.services import NotificationService

logger = structlog.get_logger(__name__)


class ConsumerHandlers:
    def __init__(self, service: NotificationService) -> None:
        self._service = service

    def handle_txn_body(self, body: bytes) -> None:
        message = _parse_json_object(body)
        if message is None:
            return
        self._service.create_from_txn_message(message)

    def handle_account_body(self, body: bytes) -> None:
        message = _parse_json_object(body)
        if message is None:
            return
        self._service.create_from_account_status_message(message)


def _parse_json_object(body: bytes) -> dict[str, Any] | None:
    try:
        raw = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        logger.warning("consumer_invalid_json", error=str(exc))
        return None
    if not isinstance(raw, dict):
        logger.warning("consumer_json_not_object")
        return None
    return raw
