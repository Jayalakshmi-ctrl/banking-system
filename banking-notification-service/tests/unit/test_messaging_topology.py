from __future__ import annotations

from unittest.mock import MagicMock

from src.infrastructure.messaging import (
    ACCOUNT_QUEUE,
    ACCOUNT_STATUS_ROUTING_KEY,
    BANKING_DOMAIN_EXCHANGE,
    TXN_EVENTS_EXCHANGE,
    TXN_QUEUE,
    TXN_ROUTING_KEY,
    _declare_topology,
)


def test_declare_topology_declares_exchanges_and_queues() -> None:
    channel = MagicMock()
    _declare_topology(channel)
    channel.exchange_declare.assert_any_call(
        exchange=TXN_EVENTS_EXCHANGE,
        exchange_type="topic",
        durable=True,
    )
    channel.queue_declare.assert_any_call(queue=TXN_QUEUE, durable=True)
    channel.queue_bind.assert_any_call(
        exchange=TXN_EVENTS_EXCHANGE,
        queue=TXN_QUEUE,
        routing_key=TXN_ROUTING_KEY,
    )
    channel.exchange_declare.assert_any_call(
        exchange=BANKING_DOMAIN_EXCHANGE,
        exchange_type="topic",
        durable=True,
    )
    channel.queue_declare.assert_any_call(queue=ACCOUNT_QUEUE, durable=True)
    channel.queue_bind.assert_any_call(
        exchange=BANKING_DOMAIN_EXCHANGE,
        queue=ACCOUNT_QUEUE,
        routing_key=ACCOUNT_STATUS_ROUTING_KEY,
    )
