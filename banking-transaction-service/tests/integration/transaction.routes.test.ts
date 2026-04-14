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
});
