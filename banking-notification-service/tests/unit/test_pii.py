from __future__ import annotations

from src.infrastructure.pii import mask_email, mask_phone


def test_mask_email_masks_local_part() -> None:
    masked = mask_email("victor@inbox.com")
    assert masked == "vi***@inbox.com"


def test_mask_phone_masks_middle_digits() -> None:
    masked = mask_phone("+919876543015")
    assert masked.startswith("91")
    assert masked.endswith("3015")
    assert "*" in masked


def test_mask_email_empty_returns_placeholder() -> None:
    assert mask_email("") == "***"


def test_mask_phone_short_returns_placeholder() -> None:
    assert mask_phone("123") == "****"
