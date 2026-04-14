import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";
import { AppError } from "../../application/errors";

export function createErrorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      logger.warn(
        {
          err,
          correlation_id: req.correlationId,
          internal: err.logDetail,
        },
        err.problemTitle,
      );
      res.status(err.statusCode).json({
        type: err.problemType,
        title: err.problemTitle,
        detail: err.clientDetail,
        instance: req.originalUrl,
      });
      return;
    }
    if (err instanceof ZodError) {
      logger.warn({ err: err.flatten(), correlation_id: req.correlationId }, "Validation failed");
      res.status(400).json({
        type: "https://api.bank.local/problems/validation-error",
        title: "Bad Request",
        detail: "Request failed",
        instance: req.originalUrl,
      });
      return;
    }
    logger.error({ err, correlation_id: req.correlationId }, "Unhandled error");
    res.status(500).json({
      type: "https://api.bank.local/problems/internal-error",
      title: "Internal Server Error",
      detail: "Request failed",
      instance: req.originalUrl,
    });
  };
}
