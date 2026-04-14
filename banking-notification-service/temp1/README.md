# Banking Customer Service

This service owns customer master data and KYC state for the banking platform, exposing a JSON API for create, read, update, soft-delete, and KYC transitions with PostgreSQL as the system of record.

## Context

| Item | Value |
| --- | --- |
| Runtime | Python 3.12 |
| Framework | FastAPI |
| Database | PostgreSQL 16 |
| API port | 8001 |

## Prerequisites

- Python 3.12
- PostgreSQL 16 reachable from the host (local instance or container)
- `pip` and a virtual environment (recommended)

## Quick Start

1. Create a database named `customer_db` and a user with DDL and DML rights.

2. Copy environment defaults and adjust the connection string:

   ```bash
   cp .env.example .env
   ```

3. Create a virtual environment, install dependencies, and run migrations:

   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   ```

4. (Optional) Load seed data from the platform CSV:

   ```bash
   PYTHONPATH=. python -m seed.seed
   ```

5. Start the API:

   ```bash
   uvicorn src.main:app --host 0.0.0.0 --port 8001
   ```

6. Verify health:

   ```bash
   curl -s http://127.0.0.1:8001/health
   ```

## Testing

Unit tests (no database required):

```bash
pytest tests/unit --cov=src --cov-report=term-missing
```

Integration tests require `TEST_DATABASE_URL` pointing at an empty or disposable database (same schema as `DATABASE_URL` in `.env.example`):

```bash
export TEST_DATABASE_URL=postgresql+asyncpg://customer_user:customer_pass@localhost:5433/customer_test
pytest tests/integration
```

## API Overview

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness and readiness payload |
| GET | `/metrics` | Prometheus metrics |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers` | Paginated list (`limit`, `offset`) |
| GET | `/api/v1/customers/{id}` | Fetch one customer |
| PUT | `/api/v1/customers/{id}` | Update customer |
| DELETE | `/api/v1/customers/{id}` | Soft delete |
| PATCH | `/api/v1/customers/{id}/kyc` | Transition KYC from `PENDING` |
| GET | `/api/v1/customers/{id}/kyc` | Read KYC status |

Validation errors and domain failures return RFC 7807-style JSON bodies with generic `detail` text; correlation identifiers are accepted and echoed on the `X-Correlation-ID` header.

## Architecture

```mermaid
flowchart LR
  Client[Clients / Gateway] --> API[FastAPI Presentation]
  API --> App[Application Services]
  App --> Repo[Repositories]
  Repo --> DB[(PostgreSQL customer_db)]
```

Layers follow domain-driven boundaries: presentation (HTTP schemas and routing), application (use cases and DTOs), domain (entities and enums), and infrastructure (SQLAlchemy, persistence helpers). Dependencies point inward toward the domain.

## Docker

Build and run (after setting `DATABASE_URL` for the container environment):

```bash
docker build -t banking-customer-service:latest .
docker run --rm -p 8001:8001 -e DATABASE_URL="postgresql+asyncpg://..." banking-customer-service:latest
```

## Kubernetes

Example manifests live under `k8s/`. The Deployment overrides `DATABASE_URL` from a Secret; the ConfigMap carries non-secret defaults and `SERVICE_NAME`. Replace image names, hosts, and credentials for your cluster before applying.

## Common Issues

- **Alembic cannot connect**: Ensure `DATABASE_URL` uses the `postgresql+asyncpg` scheme and that PostgreSQL accepts connections from your host.
- **Port already in use**: Change the `uvicorn` port or stop the conflicting process.
- **Seed script duplicate key**: Truncate `customers` or use a fresh database before re-running `python -m seed.seed`.
