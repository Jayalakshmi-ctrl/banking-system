import os
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_URL"),
        reason="TEST_DATABASE_URL is not set",
    ),
]


@pytest.fixture
async def api_client():
    from src.config import get_settings
    from src.infrastructure.database import init_db_schema, reset_database_engine
    from src.main import app

    get_settings.cache_clear()
    await reset_database_engine()
    await init_db_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    await reset_database_engine()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_health_returns_payload(api_client: AsyncClient) -> None:
    response = await api_client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "customer-service"
    assert body["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_create_customer_validation_error_returns_rfc7807(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/api/v1/customers",
        json={"name": "", "email": "bad", "phone": "12"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["type"] == "about:blank"
    assert body["title"] == "Validation error"
    assert body["detail"] == "Request failed"
    assert isinstance(body["instance"], str)


@pytest.mark.asyncio
async def test_create_and_get_customer_round_trip(api_client: AsyncClient) -> None:
    payload = {
        "name": "Integration User",
        "email": "integration.user@example.com",
        "phone": "9123456789",
    }
    created = await api_client.post("/api/v1/customers", json=payload)

    assert created.status_code == 201
    customer_id = created.json()["customer_id"]

    fetched = await api_client.get(f"/api/v1/customers/{customer_id}")

    assert fetched.status_code == 200
    assert fetched.json()["email"] == payload["email"]


@pytest.mark.asyncio
async def test_get_unknown_customer_returns_404_problem(api_client: AsyncClient) -> None:
    unknown_id = uuid.uuid4()
    response = await api_client.get(f"/api/v1/customers/{unknown_id}")

    assert response.status_code == 404
    body = response.json()
    assert body["type"] == "about:blank"
    assert body["detail"] == "Request failed"


@pytest.mark.asyncio
async def test_list_customers_pagination_envelope(api_client: AsyncClient) -> None:
    await api_client.post(
        "/api/v1/customers",
        json={
            "name": "List User",
            "email": "list.user@example.com",
            "phone": "9234567890",
        },
    )

    response = await api_client.get("/api/v1/customers", params={"limit": 10, "offset": 0})

    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert body["limit"] == 10
    assert body["offset"] == 0
    assert body["total"] >= 1


@pytest.mark.asyncio
async def test_patch_kyc_from_pending_succeeds(api_client: AsyncClient) -> None:
    created = await api_client.post(
        "/api/v1/customers",
        json={
            "name": "Kyc User",
            "email": "kyc.user@example.com",
            "phone": "9345678901",
        },
    )
    customer_id = created.json()["customer_id"]

    response = await api_client.patch(
        f"/api/v1/customers/{customer_id}/kyc",
        json={"kyc_status": "VERIFIED"},
    )

    assert response.status_code == 200
    assert response.json()["kyc_status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_metrics_endpoint_exposed(api_client: AsyncClient) -> None:
    response = await api_client.get("/metrics")

    assert response.status_code == 200
    assert len(response.text) > 0


@pytest.mark.asyncio
async def test_get_kyc_after_create(api_client: AsyncClient) -> None:
    created = await api_client.post(
        "/api/v1/customers",
        json={
            "name": "Kyc Get User",
            "email": "kyc.get.user@example.com",
            "phone": "9456789012",
        },
    )
    customer_id = created.json()["customer_id"]

    response = await api_client.get(f"/api/v1/customers/{customer_id}/kyc")

    assert response.status_code == 200
    assert response.json()["kyc_status"] == "PENDING"


@pytest.mark.asyncio
async def test_update_customer_put_round_trip(api_client: AsyncClient) -> None:
    created = await api_client.post(
        "/api/v1/customers",
        json={
            "name": "Put User",
            "email": "put.user@example.com",
            "phone": "9567890123",
        },
    )
    customer_id = created.json()["customer_id"]

    response = await api_client.put(
        f"/api/v1/customers/{customer_id}",
        json={
            "name": "Put User Updated",
            "email": "put.user.updated@example.com",
            "phone": "9678901234",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Put User Updated"
    assert body["email"] == "put.user.updated@example.com"
    assert body["phone"] == "9678901234"


@pytest.mark.asyncio
async def test_soft_delete_customer_returns_204_and_get_404(api_client: AsyncClient) -> None:
    created = await api_client.post(
        "/api/v1/customers",
        json={
            "name": "Delete User",
            "email": "delete.user@example.com",
            "phone": "9789012345",
        },
    )
    customer_id = created.json()["customer_id"]

    deleted = await api_client.delete(f"/api/v1/customers/{customer_id}")

    assert deleted.status_code == 204

    fetched = await api_client.get(f"/api/v1/customers/{customer_id}")
    assert fetched.status_code == 404
