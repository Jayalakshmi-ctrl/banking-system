from __future__ import annotations

import logging
import os
import sys
import uuid
from typing import Any

import structlog
from flasgger import Swagger
from flask import Flask, g, request
from structlog.contextvars import (
    bind_contextvars,
    clear_contextvars,
    merge_contextvars,
)

from src.application.consumers import ConsumerHandlers
from src.application.services import NotificationService
from src.config import Settings
from src.infrastructure import database, messaging
from src.infrastructure.http_request_metrics import install_http_request_counter
from src.infrastructure.repositories import NotificationRepository
from src.presentation.routes import RouteDependencies, register_routes


def create_app(
    *,
    mongo_client: Any | None = None,
    enable_rabbit_consumer: bool | None = None,
) -> Flask:
    settings = Settings.from_env()
    _configure_logging(settings)
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    client = mongo_client or database.create_mongo_client(settings.mongodb_url)
    app.extensions["mongo_client"] = client
    db_handle = client.get_default_database(default="notification_db")
    repository = NotificationRepository(db_handle)
    service = NotificationService(repository, settings)
    deps = RouteDependencies(
        settings=settings,
        notification_service=service,
    )
    register_routes(app, deps)
    install_http_request_counter(app)
    _register_swagger(app)
    _register_request_hooks(app)
    _register_error_handlers(app)
    consumer_flag = enable_rabbit_consumer
    if consumer_flag is None:
        consumer_flag = os.getenv("ENABLE_RABBIT_CONSUMER", "true").lower() in (
            "1",
            "true",
            "yes",
        )
    if consumer_flag:
        handlers = ConsumerHandlers(service)
        messaging.start_consumer_thread(settings, handlers)
    return app


def _configure_logging(settings: Settings) -> None:
    level_name = settings.log_level.upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(level=level, stream=sys.stdout, format="%(message)s")
    structlog.configure(
        processors=[
            merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="timestamp"),
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def _register_swagger(app: Flask) -> None:
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/apispec.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/",
    }
    Swagger(
        app,
        config=swagger_config,
        template={
            "info": {
                "title": "Notification Service API",
                "version": "1.0.0",
                "description": "Banking notification microservice",
            }
        },
    )


def _register_request_hooks(app: Flask) -> None:
    @app.before_request
    def bind_correlation_id() -> None:
        header_value = request.headers.get("X-Correlation-ID")
        correlation_id = header_value if header_value else str(uuid.uuid4())
        g.correlation_id = correlation_id
        bind_contextvars(correlation_id=correlation_id)

    @app.teardown_request
    def unbind_context(_exc: BaseException | None) -> None:
        clear_contextvars()

    @app.after_request
    def apply_headers(response: Any) -> Any:
        response.headers["X-Correlation-ID"] = getattr(g, "correlation_id", "")
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'"
        )
        if os.getenv("ENABLE_HSTS", "").lower() in ("1", "true", "yes"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def _register_error_handlers(app: Flask) -> None:
    from src.presentation.routes import _problem

    @app.errorhandler(404)
    def handle_not_found(_e: Any) -> Any:
        return _problem(status=404, title="Not Found", detail="Request failed")

    @app.errorhandler(405)
    def handle_method_not_allowed(_e: Any) -> Any:
        return _problem(
            status=405,
            title="Method Not Allowed",
            detail="Request failed",
        )

    @app.errorhandler(500)
    def handle_internal(_e: Any) -> Any:
        return _problem(
            status=500,
            title="Internal Server Error",
            detail="Request failed",
        )


def main() -> None:
    settings = Settings.from_env()
    app = create_app()
    app.run(host="0.0.0.0", port=settings.port, threaded=True)


if __name__ == "__main__":
    main()
