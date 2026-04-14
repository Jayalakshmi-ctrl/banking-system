from __future__ import annotations

from src.infrastructure.senders import email_sender, sms_sender


def test_send_email_writes_structured_event(capsys: object) -> None:
    email_sender.send_email(
        to_email="user@example.com",
        subject="Test subject",
        body="Hello body",
    )
    out = capsys.readouterr().out
    assert "mock_email_delivery" in out or "EMAIL SENT" in out


def test_send_sms_writes_structured_event(capsys: object) -> None:
    sms_sender.send_sms(to_phone="919876543015", message="Hello sms")
    out = capsys.readouterr().out
    assert "mock_sms_delivery" in out or "SMS SENT" in out
