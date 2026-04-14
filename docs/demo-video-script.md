# Demo Video Script (15 minutes max)

## Segment 1: Docker Deployment (3 minutes)

1. Show `docker-compose.yml` briefly (service list)
2. Run `docker compose up --build -d`
3. Run `docker compose ps` -- show all 11 containers healthy
4. Show health check endpoints:
   - `curl http://localhost:8001/health`
   - `curl http://localhost:8002/health`
   - `curl http://localhost:8003/health`
   - `curl http://localhost:8004/health`

## Segment 2: CRUD Operations (4 minutes)

### Customer Service
1. Create customer: `POST /api/v1/customers`
2. List customers: `GET /api/v1/customers`
3. Update KYC: `PATCH /api/v1/customers/{id}/kyc` (PENDING -> VERIFIED)

### Account Service
1. Create account: `POST /api/v1/accounts` (show KYC validation from Customer Service)
2. Check balance: `GET /api/v1/accounts/{id}/balance`
3. Update status: `PATCH /api/v1/accounts/{id}/status` (ACTIVE -> FROZEN -> ACTIVE)

### Transaction Service
1. Deposit: `POST /api/v1/transactions/deposit`
2. Withdrawal: `POST /api/v1/transactions/withdrawal`
3. Statement: `GET /api/v1/accounts/{id}/statements`

## Segment 3: Inter-Service Communication (3 minutes)

### Fund Transfer (Full Workflow)
1. Show the transfer request with Idempotency-Key header
2. Execute `POST /api/v1/transactions/transfer` (amount > 50,000 for notification trigger)
3. Show the TRANSFER_OUT and TRANSFER_IN records
4. Show idempotency by resending the same request (200 OK cached response)
5. Show notification created in Notification Service: `GET /api/v1/notifications`

### Business Rule Enforcement
1. Show daily limit exceeded error (attempt transfer > 200,000)
2. Show overdraft prevention (withdrawal exceeding balance)
3. Show frozen account rejection

## Segment 4: Database Verification (2 minutes)

1. Connect to Customer DB: show customers table
2. Connect to Account DB: show accounts and customer_read_model
3. Connect to Transaction DB: show transactions and idempotency_keys
4. Connect to MongoDB: show notifications_log collection

## Segment 5: Monitoring and Logs (2 minutes)

1. Open Grafana at localhost:3000 (admin/admin)
2. Show the Banking System Overview dashboard
3. Show Prometheus targets at localhost:9090/targets
4. Show structured JSON logs: `docker compose logs transaction-service | head -20`
5. Show RabbitMQ management UI at localhost:15672

## Segment 6: Minikube Deployment (1 minute)

1. Show `minikube start`
2. Run `bash banking-infra/k8s/deploy-all.sh`
3. Show `kubectl -n banking-system get pods`
4. Show `kubectl -n banking-system get svc`
5. Show `kubectl -n banking-system logs -l app=transaction-service`
6. Execute one curl through NodePort to verify

## Sample Curl Commands for Demo

```bash
# Create customer
curl -s -X POST http://localhost:8001/api/v1/customers \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: demo-001" \
  -d '{"name":"Demo User","email":"demo@test.com","phone":"9876543210"}' | jq

# Verify KYC
curl -s -X PATCH http://localhost:8001/api/v1/customers/<CUSTOMER_ID>/kyc \
  -H "Content-Type: application/json" \
  -d '{"kyc_status":"VERIFIED"}' | jq

# Create source account
curl -s -X POST http://localhost:8002/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"<CUSTOMER_ID>","account_type":"SAVINGS","currency":"INR"}' | jq

# Create destination account
curl -s -X POST http://localhost:8002/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"<CUSTOMER_ID>","account_type":"CURRENT","currency":"INR"}' | jq

# Deposit funds into source
curl -s -X POST http://localhost:8003/api/v1/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{"account_id":"<SOURCE_ACCOUNT_ID>","amount":150000}' | jq

# Transfer (high-value, triggers notification)
curl -s -X POST http://localhost:8003/api/v1/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-transfer-001" \
  -d '{"from_account_id":"<SOURCE_ID>","to_account_id":"<DEST_ID>","amount":75000}' | jq

# Check notifications
curl -s http://localhost:8004/api/v1/notifications | jq

# Verify idempotency (re-send same transfer)
curl -s -X POST http://localhost:8003/api/v1/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-transfer-001" \
  -d '{"from_account_id":"<SOURCE_ID>","to_account_id":"<DEST_ID>","amount":75000}' | jq

# Test business rule: daily limit
curl -s -X POST http://localhost:8003/api/v1/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-transfer-002" \
  -d '{"from_account_id":"<SOURCE_ID>","to_account_id":"<DEST_ID>","amount":199000}' | jq
```
