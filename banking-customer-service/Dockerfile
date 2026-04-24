FROM python:3.12-slim AS builder

WORKDIR /build
COPY banking-customer-service/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip wheel --no-cache-dir -r requirements.txt -w /wheels

FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN groupadd --system app && useradd --system -g app app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY banking-customer-service/src ./src
COPY banking-customer-service/migrations ./migrations
COPY banking-customer-service/seed ./seed
COPY bank_Dataset/bank_customers.csv ./seed/data/bank_customers.csv
COPY banking-customer-service/alembic.ini .
COPY banking-customer-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health')"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
