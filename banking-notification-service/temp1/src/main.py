import logging
import sys
import uuid
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from src.application.constants import (
    CORRELATION_ID_HEADER,
    RFC7807_DEFAULT_TYPE,
    SERVICE_HTTP_PORT,
)
from src.application.exceptions import (
    CustomerNotFoundError,
    DuplicateCustomerFieldError,
    InvalidKycTransitionError,
)
from src.config import get_settings
from src.presentation.routes import router as customers_router
from src.presentation.schemas import HealthResponse

logger = structlog.get_logger(__name__)


def configure_structlog(log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(message)s", stream=sys.stdout)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def _problem(
    *,
    status_code: int,
    title: str,
    detail: str,
    instance: str,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": RFC7807_DEFAULT_TYPE,
        "title": title,
        "detail": detail,
        "instance": instance,
    }
    return JSONResponse(status_code=status_code, content=body)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_structlog(settings.log_level)

    app = FastAPI(
        title="Customer Service",
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    @app.middleware("http")
    async def correlation_middleware(request: Request, call_next):
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
        response = await call_next(request)
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response

    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.exception_handler(CustomerNotFoundError)
    async def customer_not_found_handler(request: Request, exc: CustomerNotFoundError) -> JSONResponse:
        logger.warning("customer_not_found", path=request.url.path)
        return _problem(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Not found",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.exception_handler(DuplicateCustomerFieldError)
    async def duplicate_customer_handler(
        request: Request,
        exc: DuplicateCustomerFieldError,
    ) -> JSONResponse:
        logger.warning("duplicate_customer_field", path=request.url.path)
        return _problem(
            status_code=status.HTTP_409_CONFLICT,
            title="Conflict",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.exception_handler(InvalidKycTransitionError)
    async def invalid_kyc_handler(request: Request, exc: InvalidKycTransitionError) -> JSONResponse:
        logger.warning("invalid_kyc_transition", path=request.url.path)
        return _problem(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Unprocessable entity",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.warning("request_validation_failed", errors=exc.errors(), path=request.url.path)
        return _problem(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Validation error",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        logger.warning(
            "http_exception",
            status_code=exc.status_code,
            path=request.url.path,
        )
        return _problem(
            status_code=exc.status_code,
            title="Error",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", path=request.url.path)
        return _problem(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            title="Internal server error",
            detail="Request failed",
            instance=str(request.url.path),
        )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service="customer-service",
            version=settings.app_version,
        )

    app.include_router(customers_router, prefix="/api/v1/customers")

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=SERVICE_HTTP_PORT,
        reload=False,
    )


if __name__ == "__main__":
    main()
