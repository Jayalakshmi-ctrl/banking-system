from __future__ import annotations

EMAIL_LOCAL_VISIBLE = 2
PHONE_PREFIX_LEN = 2
PHONE_SUFFIX_LEN = 4
MASK_CHAR = "*"
MASK_LOCAL_SUFFIX_LEN = 3


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return MASK_CHAR * 3
    local, _, domain = email.partition("@")
    if not local:
        return MASK_CHAR * 3
    visible_local = local[:EMAIL_LOCAL_VISIBLE]
    masked_local = visible_local + (MASK_CHAR * MASK_LOCAL_SUFFIX_LEN)
    return f"{masked_local}@{domain}"


def mask_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) <= PHONE_PREFIX_LEN + PHONE_SUFFIX_LEN:
        return MASK_CHAR * 4
    prefix = digits[:PHONE_PREFIX_LEN]
    suffix = digits[-PHONE_SUFFIX_LEN:]
    middle_len = len(digits) - PHONE_PREFIX_LEN - PHONE_SUFFIX_LEN
    return f"{prefix}{MASK_CHAR * middle_len}{suffix}"
