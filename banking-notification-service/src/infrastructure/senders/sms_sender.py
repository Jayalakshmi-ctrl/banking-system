from __future__ import annotations

import structlog

from src.infrastructure.pii import mask_phone

logger = structlog.get_logger(__name__)


def send_sms(*, to_phone: str, message: str) -> None:
    masked = mask_phone(to_phone)
    line = f"SMS SENT to {masked}: {message}"
    logger.info("mock_sms_delivery", delivery_line=line)
