from __future__ import annotations

import pytest

from src.config import Settings, _resolve_mongodb_url, _resolve_rabbitmq_url


def test_settings_reads_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MONGODB_URL", "mongodb://localhost:27017/notification_db")
    monkeypatch.setenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    settings = Settings.from_env()
    assert settings.high_value_threshold_inr == 50_000
    assert settings.max_retry_count == 3
    assert settings.port == 8004


def test_resolve_mongodb_url_from_parts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MONGODB_URL", raising=False)
    monkeypatch.setenv("MONGODB_USER", "u")
    monkeypatch.setenv("MONGODB_PASSWORD", "p@ss")
    monkeypatch.setenv("MONGODB_HOST", "mongo.svc")
    monkeypatch.setenv("MONGODB_PORT", "27017")
    monkeypatch.setenv("MONGODB_DATABASE", "notification_db")
    uri = _resolve_mongodb_url()
    assert "mongo.svc" in uri
    assert "notification_db" in uri


def test_resolve_rabbitmq_url_from_parts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RABBITMQ_URL", raising=False)
    monkeypatch.setenv("RABBITMQ_USER", "guest")
    monkeypatch.setenv("RABBITMQ_PASSWORD", "guest")
    monkeypatch.setenv("RABBITMQ_HOST", "rabbit.svc")
    monkeypatch.setenv("RABBITMQ_PORT", "5672")
    uri = _resolve_rabbitmq_url()
    assert "rabbit.svc" in uri
    assert uri.startswith("amqp://")
