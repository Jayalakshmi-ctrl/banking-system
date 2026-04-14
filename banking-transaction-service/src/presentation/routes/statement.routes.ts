import { Router } from "express";
import type { TransactionService } from "../../application/services/transaction.service";
import { accountIdParamSchema, statementQuerySchema } from "../schemas/transaction.schema";

function asyncHandler(
  fn: (req: import("express").Request, res: import("express").Response) => Promise<void>,
): import("express").RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * @openapi
 * /api/v1/accounts/{accountId}/statements:
 *   get:
 *     summary: Account statement
 *     tags: [Statements]
 */

export function createStatementRouter(service: TransactionService): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { accountId } = accountIdParamSchema.parse(req.params);
      const query = statementQuerySchema.parse(req.query);
      const rows = await service.accountStatement({
        account_id: accountId,
        from_date: new Date(query.from_date),
        to_date: new Date(query.to_date),
      });
      res.status(200).json({ data: rows });
    }),
  );

  return router;
}
