from __future__ import annotations

from prometheus_client import Counter

notifications_sent_total = Counter(
    "notifications_sent_total",
    "Notifications successfully sent",
    ("channel", "event_type"),
)

notifications_failed_total = Counter(
    "notifications_failed_total",
    "Notifications that failed after retries",
    ("channel", "event_type"),
)
