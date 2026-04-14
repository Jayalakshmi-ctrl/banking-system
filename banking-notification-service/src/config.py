from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()

DEFAULT_HIGH_VALUE_THRESHOLD_INR = 50_000
DEFAULT_MAX_RETRY_COUNT = 3
DEFAULT_PORT = 8004
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_SERVICE_VERSION = "1.0.0"
MONGODB_DEFAULT_PORT = 27017
RABBITMQ_DEFAULT_PORT = 5672
LIST_DEFAULT_LIMIT = 20
LIST_MAX_LIMIT = 100
LIST_MIN_LIMIT = 1


@dataclass(frozen=True)
class Settings:
    mongodb_url: str
    rabbitmq_url: str
    high_value_threshold_inr: int
    max_retry_count: int
    port: int
    log_level: str
    service_version: str

    @classmethod
    def from_env(cls) -> Settings:
        mongodb_url = _resolve_mongodb_url()
        rabbitmq_url = _resolve_rabbitmq_url()
        threshold = _safe_int("HIGH_VALUE_THRESHOLD", DEFAULT_HIGH_VALUE_THRESHOLD_INR)
        max_retry = _safe_int("MAX_RETRY_COUNT", DEFAULT_MAX_RETRY_COUNT)
        port = _safe_int("PORT", DEFAULT_PORT)
        log_level = os.getenv("LOG_LEVEL") or DEFAULT_LOG_LEVEL
        version = os.getenv("SERVICE_VERSION") or DEFAULT_SERVICE_VERSION
        return cls(
            mongodb_url=mongodb_url,
            rabbitmq_url=rabbitmq_url,
            high_value_threshold_inr=threshold,
            max_retry_count=max_retry,
            port=port,
            log_level=log_level,
            service_version=version,
        )


def _safe_int(env_key: str, default: int) -> int:
    raw = os.getenv(env_key)
    if not raw or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _resolve_mongodb_url() -> str:
    explicit = os.getenv("MONGODB_URL")
    if explicit:
        return explicit
    user = os.getenv("MONGODB_USER") or "notif_user"
    password = os.getenv("MONGODB_PASSWORD") or ""
    host = os.getenv("MONGODB_HOST") or "localhost"
    port_raw = os.getenv("MONGODB_PORT")
    port = int(port_raw) if port_raw else MONGODB_DEFAULT_PORT
    database = os.getenv("MONGODB_DATABASE") or "notification_db"
    if password:
        return (
            f"mongodb://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{database}"
        )
    return f"mongodb://{host}:{port}/{database}"


def _resolve_rabbitmq_url() -> str:
    explicit = os.getenv("RABBITMQ_URL")
    if explicit:
        return explicit
    user = os.getenv("RABBITMQ_USER") or "guest"
    password = os.getenv("RABBITMQ_PASSWORD") or "guest"
    host = os.getenv("RABBITMQ_HOST") or "localhost"
    port_raw = os.getenv("RABBITMQ_PORT")
    port = int(port_raw) if port_raw else RABBITMQ_DEFAULT_PORT
    return (
        f"amqp://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/"
    )
