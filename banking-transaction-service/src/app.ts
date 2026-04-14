import path from "path";
import express from "express";
import type { Logger } from "pino";
import pinoHttp from "pino-http";
import promClient from "prom-client";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { TransactionService } from "./application/services/transaction.service";
import { correlationMiddleware } from "./presentation/middleware/correlation.middleware";
import { createErrorHandler } from "./presentation/middleware/error.middleware";
import { createMetricsMiddleware } from "./presentation/middleware/metrics.middleware";
import { createStatementRouter } from "./presentation/routes/statement.routes";
import { createTransactionRouter } from "./presentation/routes/transaction.routes";

const JSON_BODY_LIMIT_BYTES = 100_000 as const;

export interface CreateAppInput {
  transactionService: TransactionService;
  logger: Logger;
  register: promClient.Registry;
  httpRequestDuration: promClient.Histogram<string>;
  serviceVersion: string;
}

function securityHeadersMiddleware(_req: express.Request, res: express.Response, next: express.NextFunction): void {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}

export function createApp(input: CreateAppInput): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(securityHeadersMiddleware);
  app.use(correlationMiddleware);
  app.use(
    pinoHttp({
      logger: input.logger,
      genReqId: (req) => req.correlationId,
      customProps: (req) => ({ correlation_id: req.correlationId }),
      autoLogging: {
        ignore: (req) => req.url === "/health" || req.url === "/metrics",
      },
    }),
  );
  app.use(createMetricsMiddleware(input.httpRequestDuration));
  app.use(express.json({ limit: JSON_BODY_LIMIT_BYTES }));

  const routesGlob =
    process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), "dist", "presentation", "routes", "*.js")
      : path.join(process.cwd(), "src", "presentation", "routes", "*.ts");

  const openapiSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Transaction Service API",
        version: input.serviceVersion,
      },
    },
    apis: [routesGlob],
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      service: "transaction-service",
      version: input.serviceVersion,
    });
  });

  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", input.register.contentType);
    res.status(200).send(await input.register.metrics());
  });

  const txRouter = createTransactionRouter(input.transactionService);
  app.use("/api/v1/transactions", txRouter);

  const statementRouter = createStatementRouter(input.transactionService);
  app.use("/api/v1/accounts/:accountId/statements", statementRouter);

  app.use(createErrorHandler(input.logger));

  return app;
}
