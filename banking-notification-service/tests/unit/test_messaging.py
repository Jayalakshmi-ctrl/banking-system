from __future__ import annotations

from unittest.mock import MagicMock, patch

import mongomock

from src.application.consumers import ConsumerHandlers
from src.application.services import NotificationService
from src.config import Settings
from src.infrastructure.messaging import check_rabbitmq_connectivity, start_consumer_thread
from src.infrastructure.repositories import NotificationRepository


def test_check_rabbitmq_connectivity_closes_connection() -> None:
    with patch("src.infrastructure.messaging.pika.BlockingConnection") as mock_bc:
        connection = MagicMock()
        mock_bc.return_value = connection
        check_rabbitmq_connectivity("amqp://guest:guest@localhost:5672/")
        connection.close.assert_called_once()


def test_start_consumer_thread_targets_loop() -> None:
    settings = Settings(
        mongodb_url="mongodb://localhost/notification_db",
        rabbitmq_url="amqp://guest:guest@localhost/",
        high_value_threshold_inr=50_000,
        max_retry_count=3,
        port=8004,
        log_level="INFO",
        service_version="1.0.0",
    )
    client = mongomock.MongoClient("mongodb://localhost/notification_db")
    db = client.get_default_database(default="notification_db")
    repo = NotificationRepository(db)
    service = NotificationService(repo, settings)
    handlers = ConsumerHandlers(service)
    with patch("src.infrastructure.messaging._consumer_loop") as mock_loop:
        thread = start_consumer_thread(settings, handlers)
        thread.join(timeout=1.0)
        mock_loop.assert_called_once()
