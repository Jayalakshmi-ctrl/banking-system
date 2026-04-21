# ---- Builder ----
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip wheel --no-cache-dir -r requirements.txt -w /wheels

# ---- Runtime ----
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN groupadd --system app && useradd --system -g app app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY --chown=app:app src ./src
COPY --chown=app:app migrations ./migrations
COPY --chown=app:app seed ./seed
COPY --chown=app:app alembic.ini .

USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health').read()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]