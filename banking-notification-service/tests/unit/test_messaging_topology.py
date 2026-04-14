from __future__ import annotations

from unittest.mock import MagicMock

from src.infrastructure.messaging import (
    ACCOUNT_EXCHANGE,
    ACCOUNT_QUEUE,
    TXN_EXCHANGE,
    TXN_QUEUE,
    _declare_topology,
)


def test_declare_topology_declares_exchanges_and_queues() -> None:
    channel = MagicMock()
    _declare_topology(channel)
    channel.exchange_declare.assert_any_call(
        exchange=TXN_EXCHANGE,
        exchange_type="fanout",
        durable=True,
    )
    channel.queue_declare.assert_any_call(queue=TXN_QUEUE, durable=True)
    channel.queue_bind.assert_any_call(exchange=TXN_EXCHANGE, queue=TXN_QUEUE)
    channel.exchange_declare.assert_any_call(
        exchange=ACCOUNT_EXCHANGE,
        exchange_type="fanout",
        durable=True,
    )
    channel.queue_declare.assert_any_call(queue=ACCOUNT_QUEUE, durable=True)
    channel.queue_bind.assert_any_call(
        exchange=ACCOUNT_EXCHANGE,
        queue=ACCOUNT_QUEUE,
    )
