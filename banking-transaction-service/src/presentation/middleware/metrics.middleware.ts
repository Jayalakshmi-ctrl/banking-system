import type { NextFunction, Request, Response } from "express";
import type { Histogram } from "prom-client";

export function createMetricsMiddleware(histogram: Histogram<string>): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const delta = Number(process.hrtime.bigint() - start) / 1e9;
      const route = req.route?.path ?? req.path;
      histogram.observe(
        {
          method: req.method,
          route,
          status_code: String(res.statusCode),
        },
        delta,
      );
    });
    next();
  };
}
