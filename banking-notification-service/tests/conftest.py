from __future__ import annotations

import os
from typing import Any
from unittest.mock import patch

import mongomock
import pytest

os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017/notification_db")
os.environ.setdefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
os.environ.setdefault("HIGH_VALUE_THRESHOLD", "50000")
os.environ.setdefault("MAX_RETRY_COUNT", "3")
os.environ.setdefault("PORT", "8004")
os.environ.setdefault("LOG_LEVEL", "INFO")


@pytest.fixture()
def mongo_client() -> mongomock.MongoClient:
    return mongomock.MongoClient("mongodb://localhost:27017/notification_db")


@pytest.fixture()
def app(mongo_client: mongomock.MongoClient) -> Any:
    from src.main import create_app

    with (
        patch("src.presentation.routes._check_rabbitmq", return_value=True),
        patch("src.presentation.routes._check_mongodb", return_value=True),
    ):
        application = create_app(
            mongo_client=mongo_client,
            enable_rabbit_consumer=False,
        )
        yield application


@pytest.fixture()
def client(app: Any) -> Any:
    return app.test_client()
