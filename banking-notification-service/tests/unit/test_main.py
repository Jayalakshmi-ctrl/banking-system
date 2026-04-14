from __future__ import annotations

from unittest.mock import patch

import mongomock

from src.main import create_app


def test_create_app_starts_consumer_when_enabled() -> None:
    mongo = mongomock.MongoClient("mongodb://localhost/notification_db")
    with (
        patch("src.main.messaging.start_consumer_thread") as mock_start,
        patch("src.presentation.routes._check_mongodb", return_value=True),
        patch("src.presentation.routes._check_rabbitmq", return_value=True),
    ):
        create_app(mongo_client=mongo, enable_rabbit_consumer=True)
        mock_start.assert_called_once()


def test_create_app_skips_consumer_when_disabled() -> None:
    mongo = mongomock.MongoClient("mongodb://localhost/notification_db")
    with (
        patch("src.main.messaging.start_consumer_thread") as mock_start,
        patch("src.presentation.routes._check_mongodb", return_value=True),
        patch("src.presentation.routes._check_rabbitmq", return_value=True),
    ):
        create_app(mongo_client=mongo, enable_rabbit_consumer=False)
        mock_start.assert_not_called()


def test_unknown_route_returns_problem_json() -> None:
    mongo = mongomock.MongoClient("mongodb://localhost/notification_db")
    with (
        patch("src.presentation.routes._check_mongodb", return_value=True),
        patch("src.presentation.routes._check_rabbitmq", return_value=True),
    ):
        application = create_app(mongo_client=mongo, enable_rabbit_consumer=False)
    response = application.test_client().get("/does-not-exist")
    assert response.status_code == 404
    assert "application/problem+json" in (response.content_type or "")
