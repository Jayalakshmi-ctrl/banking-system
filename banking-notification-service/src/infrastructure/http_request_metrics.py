from __future__ import annotations

from flask import Flask, request
from prometheus_client import Counter

_HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests served by this Flask process",
    ("method", "handler", "status"),
)


def install_http_request_counter(app: Flask) -> None:
    """Aligns with FastAPI instrumentator metric name so Grafana `http_requests_total` panels include this service."""

    @app.after_request
    def _count_http_requests(response):  # type: ignore[unused-ignore]
        rule = request.url_rule.rule if request.url_rule else request.path
        _HTTP_REQUESTS_TOTAL.labels(
            request.method or "UNKNOWN",
            rule,
            str(response.status_code),
        ).inc()
        return response
