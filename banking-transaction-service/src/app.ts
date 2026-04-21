import fs from "fs";
import path from "path";
import express from "express";
import type { Logger } from "pino";
import pinoHttp from "pino-http";
import promClient from "prom-client";
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

function isOpenApiDocumentationPath(urlPath: string): boolean {
  return (
    urlPath === "/openapi.json" ||
    urlPath === "/api/docs" ||
    urlPath.startsWith("/api/docs/")
  );
}

function loadOpenApiDocument(serviceVersion: string): Record<string, unknown> {
  const specPath = path.join(process.cwd(), "openapi", "openapi.json");
  if (!fs.existsSync(specPath)) {
    throw new Error(`OpenAPI spec missing at ${specPath}; rebuild the service image.`);
  }
  const raw = JSON.parse(fs.readFileSync(specPath, "utf8")) as Record<string, unknown>;
  const info = raw.info as Record<string, unknown> | undefined;
  if (info) {
    info.version = serviceVersion;
  }
  return raw;
}

function securityHeadersMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!isOpenApiDocumentationPath(req.path)) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
  }
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

  const openapiSpec = loadOpenApiDocument(input.serviceVersion);

  app.get("/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(openapiSpec));
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/openapi.json",
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 6,
        displayOperationId: false,
        showExtensions: true,
        showCommonExtensions: true,
      },
    }),
  );

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
