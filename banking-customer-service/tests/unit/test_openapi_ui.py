"""OpenAPI/Swagger routes must not receive API CSP (blank Swagger UI in browsers)."""

import os

# App import loads Settings; no database is contacted for /docs or /openapi.json.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@127.0.0.1:65432/customer_openapi_unit_tests",
)

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.mark.asyncio
async def test_openapi_json_returns_schema() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    body = response.json()
    assert body.get("openapi") is not None
    assert "Customer Service" in (body.get("info") or {}).get("title", "")


@pytest.mark.asyncio
async def test_docs_html_includes_swagger_ui() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/docs")

    assert response.status_code == 200
    text = response.text.lower()
    assert "swagger" in text


@pytest.mark.asyncio
async def test_docs_response_omits_restrictive_csp() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/docs")

    assert "content-security-policy" not in {k.lower() for k in response.headers.keys()}


@pytest.mark.asyncio
async def test_api_route_includes_csp_header() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.headers.get("content-security-policy") == "default-src 'self'"
