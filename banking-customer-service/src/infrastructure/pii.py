def mask_email(value: str) -> str:
    if "@" not in value:
        return "***"
    local, _, domain = value.partition("@")
    if len(local) <= 2:
        masked_local = "*" * len(local) if local else "*"
    else:
        masked_local = f"{local[:2]}***"
    return f"{masked_local}@{domain}"


def mask_phone(value: str) -> str:
    digits = "".join(c for c in value if c.isdigit())
    if len(digits) < 6:
        return "*" * len(digits) if digits else "***"
    prefix_len = 2
    suffix_len = 4
    prefix = digits[:prefix_len]
    suffix = digits[-suffix_len:]
    middle_len = max(len(digits) - prefix_len - suffix_len, 0)
    return f"{prefix}{'*' * middle_len}{suffix}"
