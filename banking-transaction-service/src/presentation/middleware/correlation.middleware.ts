import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const MAX_CORRELATION_LENGTH = 128 as const;

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const raw = req.header("x-correlation-id");
  const correlationId =
    typeof raw === "string" && raw.length > 0 ? raw.slice(0, MAX_CORRELATION_LENGTH) : randomUUID();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}
