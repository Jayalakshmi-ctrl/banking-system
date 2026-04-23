from __future__ import annotations

import threading
from typing import Callable

import pika
import structlog
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from src.application.consumers import ConsumerHandlers
from src.config import Settings

logger = structlog.get_logger(__name__)

# Must match transaction-service (topic `banking.events`, rk `txn.created`).
TXN_EVENTS_EXCHANGE = "banking.events"
TXN_ROUTING_KEY = "txn.created"
TXN_QUEUE = "txn.created.notifications"

# Must match account-service (topic `banking.domain`, rk `account.status.changed`).
BANKING_DOMAIN_EXCHANGE = "banking.domain"
ACCOUNT_STATUS_ROUTING_KEY = "account.status.changed"
ACCOUNT_QUEUE = "account.status.notifications"
RABBITMQ_SOCKET_TIMEOUT_SECONDS = 5
RABBITMQ_HEARTBEAT_SECONDS = 30
PREFETCH_COUNT = 1


def check_rabbitmq_connectivity(url: str) -> None:
    params = pika.URLParameters(url)
    params.socket_timeout = RABBITMQ_SOCKET_TIMEOUT_SECONDS
    conn = pika.BlockingConnection(params)
    conn.close()


def start_consumer_thread(settings: Settings, handlers: ConsumerHandlers) -> threading.Thread:
    thread = threading.Thread(
        target=_consumer_loop,
        args=(settings.rabbitmq_url, handlers),
        name="rabbitmq-consumer",
        daemon=True,
    )
    thread.start()
    return thread


def _consumer_loop(url: str, handlers: ConsumerHandlers) -> None:
    while True:
        try:
            _run_session(url, handlers)
        except Exception:
            logger.exception("rabbitmq_consumer_session_failed")


def _run_session(url: str, handlers: ConsumerHandlers) -> None:
    params = pika.URLParameters(url)
    params.socket_timeout = RABBITMQ_SOCKET_TIMEOUT_SECONDS
    params.heartbeat = RABBITMQ_HEARTBEAT_SECONDS
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    _declare_topology(channel)
    channel.basic_qos(prefetch_count=PREFETCH_COUNT)
    channel.basic_consume(
        queue=TXN_QUEUE,
        on_message_callback=_make_ack_callback(handlers.handle_txn_body),
        auto_ack=False,
    )
    channel.basic_consume(
        queue=ACCOUNT_QUEUE,
        on_message_callback=_make_ack_callback(handlers.handle_account_body),
        auto_ack=False,
    )
    logger.info("rabbitmq_consumer_started", queues=[TXN_QUEUE, ACCOUNT_QUEUE])
    channel.start_consuming()


def _declare_topology(channel: BlockingChannel) -> None:
    channel.exchange_declare(exchange=TXN_EVENTS_EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=TXN_QUEUE, durable=True)
    channel.queue_bind(
        exchange=TXN_EVENTS_EXCHANGE,
        queue=TXN_QUEUE,
        routing_key=TXN_ROUTING_KEY,
    )
    channel.exchange_declare(exchange=BANKING_DOMAIN_EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=ACCOUNT_QUEUE, durable=True)
    channel.queue_bind(
        exchange=BANKING_DOMAIN_EXCHANGE,
        queue=ACCOUNT_QUEUE,
        routing_key=ACCOUNT_STATUS_ROUTING_KEY,
    )


def _make_ack_callback(
    handler: Callable[[bytes], None],
) -> Callable[[BlockingChannel, Basic.Deliver, BasicProperties, bytes], None]:
    def _cb(
        ch: BlockingChannel,
        method: Basic.Deliver,
        _properties: BasicProperties,
        body: bytes,
    ) -> None:
        try:
            handler(body)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            logger.exception("consumer_handler_error")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    return _cb
