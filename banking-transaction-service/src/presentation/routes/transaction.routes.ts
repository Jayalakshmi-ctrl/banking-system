import { Router } from "express";
import type { TransactionService } from "../../application/services/transaction.service";
import {
  depositBodySchema,
  idempotencyKeyHeaderSchema,
  listQuerySchema,
  transferBodySchema,
  txnIdParamSchema,
  withdrawalBodySchema,
} from "../schemas/transaction.schema";

function asyncHandler(
  fn: (req: import("express").Request, res: import("express").Response) => Promise<void>,
): import("express").RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * @openapi
 * /api/v1/transactions/deposit:
 *   post:
 *     summary: Process deposit
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account_id, amount]
 *             properties:
 *               account_id: { type: string, format: uuid }
 *               amount: { type: string }
 *               counterparty: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
/**
 * @openapi
 * /api/v1/transactions/withdrawal:
 *   post:
 *     summary: Process withdrawal
 *     tags: [Transactions]
 */
/**
 * @openapi
 * /api/v1/transactions/transfer:
 *   post:
 *     summary: Process transfer
 *     tags: [Transactions]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 */
/**
 * @openapi
 * /api/v1/transactions:
 *   get:
 *     summary: List transactions
 *     tags: [Transactions]
 */
/**
 * @openapi
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 */

export function createTransactionRouter(service: TransactionService): Router {
  const router = Router();

  router.post(
    "/deposit",
    asyncHandler(async (req, res) => {
      const body = depositBodySchema.parse(req.body);
      const result = await service.processDeposit(body);
      res.status(201).json(result);
    }),
  );

  router.post(
    "/withdrawal",
    asyncHandler(async (req, res) => {
      const body = withdrawalBodySchema.parse(req.body);
      const result = await service.processWithdrawal(body);
      res.status(201).json(result);
    }),
  );

  router.post(
    "/transfer",
    asyncHandler(async (req, res) => {
      const headerRaw = req.header("idempotency-key");
      const idempotency_key = idempotencyKeyHeaderSchema.parse(headerRaw);
      const body = transferBodySchema.parse(req.body);
      const result = await service.processTransfer({
        dto: body,
        idempotency_key,
        now: new Date(),
      });
      res.status(201).json(result);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const query = listQuerySchema.parse(req.query);
      const result = await service.listTransactions({ limit: query.limit, offset: query.offset });
      res.status(200).json(result);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = txnIdParamSchema.parse(req.params);
      const result = await service.getTransactionById(id);
      if (!result) {
        res.status(404).json({
          type: "https://api.bank.local/problems/not-found",
          title: "Not Found",
          detail: "Request failed",
          instance: req.originalUrl,
        });
        return;
      }
      res.status(200).json(result);
    }),
  );

  return router;
}
