from __future__ import annotations

import structlog

from src.infrastructure.pii import mask_email

logger = structlog.get_logger(__name__)
BODY_PREVIEW_MAX_LEN = 200


def send_email(*, to_email: str, subject: str, body: str) -> None:
    masked = mask_email(to_email)
    line = f"EMAIL SENT to {masked}: {subject}"
    preview = body if len(body) <= BODY_PREVIEW_MAX_LEN else body[:BODY_PREVIEW_MAX_LEN] + "..."
    logger.info("mock_email_delivery", delivery_line=line, body_preview=preview)
