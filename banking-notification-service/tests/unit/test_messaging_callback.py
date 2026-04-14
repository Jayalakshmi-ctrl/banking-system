from __future__ import annotations

from unittest.mock import MagicMock

from src.infrastructure.messaging import _make_ack_callback


def test_ack_callback_nacks_when_handler_raises() -> None:
    channel = MagicMock()
    method = MagicMock()
    method.delivery_tag = 7
    properties = MagicMock()

    def boom(_body: bytes) -> None:
        raise RuntimeError("fail")

    callback = _make_ack_callback(boom)
    callback(channel, method, properties, b"{}")
    channel.basic_nack.assert_called_once_with(delivery_tag=7, requeue=False)
    channel.basic_ack.assert_not_called()


def test_ack_callback_acks_on_success() -> None:
    channel = MagicMock()
    method = MagicMock()
    method.delivery_tag = 3
    properties = MagicMock()
    calls: list[bytes] = []

    def ok(body: bytes) -> None:
        calls.append(body)

    callback = _make_ack_callback(ok)
    callback(channel, method, properties, b"hi")
    channel.basic_ack.assert_called_once_with(delivery_tag=3)
    assert calls == [b"hi"]
