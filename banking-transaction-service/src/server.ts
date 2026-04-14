import "dotenv/config";
import http from "http";
import pino from "pino";
import promClient from "prom-client";
import { loadConfig } from "./config";
import { createApp } from "./app";
import { TransactionService } from "./application/services/transaction.service";
import { DepositStrategy } from "./application/services/deposit.strategy";
import { TransferStrategy } from "./application/services/transfer.strategy";
import { WithdrawalStrategy } from "./application/services/withdrawal.strategy";
import { AccountServiceClient } from "./infrastructure/clients/account-service.client";
import { prisma } from "./infrastructure/database/prisma";
import { NullTxnEventPublisher, RabbitMqPublisher } from "./infrastructure/messaging/rabbitmq";
import type { TxnEventPublisher } from "./infrastructure/messaging/rabbitmq";
import { IdempotencyRepository } from "./infrastructure/repositories/idempotency.repository";
import { TransactionRepository } from "./infrastructure/repositories/transaction.repository";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = pino({ level: config.LOG_LEVEL });

  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });
  const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [register],
  });

  let publisher: TxnEventPublisher = new NullTxnEventPublisher();
  try {
    const rabbit = new RabbitMqPublisher(config.RABBITMQ_URL, logger);
    await rabbit.connect();
    publisher = rabbit;
  } catch (error) {
    logger.warn({ err: error }, "RabbitMQ connection failed; continuing without outbound events");
  }

  const accountClient = AccountServiceClient.fromConfig(config);
  const transactionRepo = new TransactionRepository(prisma);
  const idempotencyRepo = new IdempotencyRepository(prisma);

  const depositStrategy = new DepositStrategy({
    accounts: accountClient,
    transactions: transactionRepo,
    publisher,
    logger,
    high_value_threshold_inr: config.HIGH_VALUE_THRESHOLD,
  });
  const withdrawalStrategy = new WithdrawalStrategy({
    accounts: accountClient,
    transactions: transactionRepo,
    publisher,
    logger,
    high_value_threshold_inr: config.HIGH_VALUE_THRESHOLD,
  });
  const transferStrategy = new TransferStrategy({
    accounts: accountClient,
    transactions: transactionRepo,
    idempotency: idempotencyRepo,
    publisher,
    logger,
    config,
  });

  const transactionService = new TransactionService(
    depositStrategy,
    withdrawalStrategy,
    transferStrategy,
    transactionRepo,
  );

  const app = createApp({
    transactionService,
    logger,
    register,
    httpRequestDuration,
    serviceVersion: config.SERVICE_VERSION,
  });

  const server = http.createServer(app);
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Transaction service listening");
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down");
    server.close(() => undefined);
    await publisher.close().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
