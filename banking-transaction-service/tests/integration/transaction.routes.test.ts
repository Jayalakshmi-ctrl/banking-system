import request from "supertest";
import pino from "pino";
import promClient from "prom-client";
import { createApp } from "../../src/app";
import type { TransactionService } from "../../src/application/services/transaction.service";

function buildMetrics(): { register: promClient.Registry; httpRequestDuration: promClient.Histogram<string> } {
  const register = new promClient.Registry();
  const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds_test",
    help: "HTTP request duration in seconds (test)",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.05, 0.1],
    registers: [register],
  });
  return { register, httpRequestDuration };
}

describe("HTTP API", () => {
  it("returns health payload", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "healthy",
      service: "transaction-service",
      version: "1.0.0",
    });
  });

  it("rejects invalid deposit body with RFC 7807 shape", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).post("/api/v1/transactions/deposit").send({ account_id: "not-a-uuid", amount: "-1" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      detail: "Request failed",
      instance: expect.any(String),
    });
    expect(service.processDeposit).not.toHaveBeenCalled();
  });

  it("rejects transfer without Idempotency-Key", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .send({
        from_account_id: "550e8400-e29b-41d4-a716-446655440000",
        to_account_id: "660e8400-e29b-41d4-a716-446655440001",
        amount: "10.00",
      });
    expect(res.status).toBe(400);
    expect(service.processTransfer).not.toHaveBeenCalled();
  });

  it("returns paginated list from service", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      }),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/api/v1/transactions").query({ limit: 20, offset: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it("exposes prometheus metrics", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("serves OpenAPI document at /openapi.json", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.paths["/api/v1/transactions/deposit"]).toBeDefined();
  });

  it("serves swagger UI without Content-Security-Policy on /api/docs/", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-security-policy"]).toBeUndefined();
    expect(res.text.toLowerCase()).toContain("swagger");
  });

  it("returns 404 when transaction id is unknown", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn().mockResolvedValue(null),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/api/v1/transactions/550e8400-e29b-41d4-a716-446655440000");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ title: "Not Found" });
    expect(service.getTransactionById).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns transaction by id when found", async () => {
    const created = new Date("2024-06-01T12:00:00.000Z");
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn().mockResolvedValue({
        txn_id: "550e8400-e29b-41d4-a716-446655440000",
        account_id: "660e8400-e29b-41d4-a716-446655440001",
        amount: "100.50",
        txn_type: "DEPOSIT",
        counterparty: null,
        reference: "REF-1",
        created_at: created.toISOString(),
      }),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).get("/api/v1/transactions/550e8400-e29b-41d4-a716-446655440000");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      txn_id: "550e8400-e29b-41d4-a716-446655440000",
      account_id: "660e8400-e29b-41d4-a716-446655440001",
      amount: "100.50",
      txn_type: "DEPOSIT",
      counterparty: null,
      reference: "REF-1",
      created_at: created.toISOString(),
    });
  });

  it("rejects statement request with invalid date query", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app)
      .get("/api/v1/accounts/550e8400-e29b-41d4-a716-446655440000/statements")
      .query({ from_date: "not-a-date", to_date: "2024-12-31T00:00:00.000Z" });
    expect(res.status).toBe(400);
    expect(service.accountStatement).not.toHaveBeenCalled();
  });

  it("invokes statement service with valid ISO range", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn().mockResolvedValue([]),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app)
      .get("/api/v1/accounts/550e8400-e29b-41d4-a716-446655440000/statements")
      .query({
        from_date: "2024-01-01T00:00:00.000Z",
        to_date: "2024-12-31T23:59:59.000Z",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
    expect(service.accountStatement).toHaveBeenCalledTimes(1);
  });

  it("accepts transfer with Idempotency-Key header", async () => {
    const created = new Date("2024-08-01T10:00:00.000Z");
    const leg = {
      txn_id: "11111111-1111-4111-8111-111111111111",
      account_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: "10.00",
      txn_type: "TRANSFER_OUT",
      counterparty: null,
      reference: "REF-OUT",
      created_at: created.toISOString(),
    };
    const legIn = {
      txn_id: "22222222-2222-4222-8222-222222222222",
      account_id: "660e8400-e29b-41d4-a716-446655440001",
      amount: "10.00",
      txn_type: "TRANSFER_IN",
      counterparty: null,
      reference: "REF-IN",
      created_at: created.toISOString(),
    };
    const transferResult = { transfer_out: leg, transfer_in: legIn };
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn().mockResolvedValue(transferResult),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set("Idempotency-Key", "idem-key-001")
      .send({
        from_account_id: "550e8400-e29b-41d4-a716-446655440000",
        to_account_id: "660e8400-e29b-41d4-a716-446655440001",
        amount: "10.00",
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(transferResult);
    expect(service.processTransfer).toHaveBeenCalledTimes(1);
  });

  it("rejects withdrawal with non-positive amount", async () => {
    const service = {
      processDeposit: jest.fn(),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app)
      .post("/api/v1/transactions/withdrawal")
      .send({
        account_id: "550e8400-e29b-41d4-a716-446655440000",
        amount: "0.00",
      });
    expect(res.status).toBe(400);
    expect(service.processWithdrawal).not.toHaveBeenCalled();
  });

  it("accepts deposit with valid body and calls service", async () => {
    const created = new Date("2024-07-01T08:00:00.000Z");
    const depositResult = {
      txn_id: "33333333-3333-4333-8333-333333333333",
      account_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: "25.00",
      txn_type: "DEPOSIT",
      counterparty: "ATM",
      reference: "REF-D",
      created_at: created.toISOString(),
    };
    const service = {
      processDeposit: jest.fn().mockResolvedValue(depositResult),
      processWithdrawal: jest.fn(),
      processTransfer: jest.fn(),
      listTransactions: jest.fn(),
      getTransactionById: jest.fn(),
      accountStatement: jest.fn(),
    } as unknown as TransactionService;
    const { register, httpRequestDuration } = buildMetrics();
    const app = createApp({
      transactionService: service,
      logger: pino({ level: "silent" }),
      register,
      httpRequestDuration,
      serviceVersion: "1.0.0",
    });
    const res = await request(app).post("/api/v1/transactions/deposit").send({
      account_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: "25.00",
      counterparty: "ATM",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(depositResult);
    expect(service.processDeposit).toHaveBeenCalledWith({
      account_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: "25.00",
      counterparty: "ATM",
    });
  });
});
