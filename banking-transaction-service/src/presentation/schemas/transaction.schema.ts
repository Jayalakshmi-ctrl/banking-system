import { z } from "zod";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../../config";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive decimal with up to 2 fractional digits")
  .refine((v) => parseFloat(v) > 0, "Amount must be greater than zero");

export const accountIdSchema = z.string().regex(UUID_REGEX, "Invalid UUID");

export const depositBodySchema = z
  .object({
    account_id: accountIdSchema,
    amount: amountSchema,
    counterparty: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9:_\-.\s]+$/)
      .optional(),
  })
  .strict();

export const withdrawalBodySchema = z
  .object({
    account_id: accountIdSchema,
    amount: amountSchema,
    counterparty: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9:_\-.\s]+$/)
      .optional(),
  })
  .strict();

export const transferBodySchema = z
  .object({
    from_account_id: accountIdSchema,
    to_account_id: accountIdSchema,
    amount: amountSchema,
    counterparty: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9:_\-.\s]+$/)
      .optional(),
  })
  .strict();

export const idempotencyKeyHeaderSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const statementQuerySchema = z
  .object({
    from_date: z.string().datetime({ offset: true }),
    to_date: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((q) => new Date(q.from_date) <= new Date(q.to_date), {
    message: "from_date must be before or equal to to_date",
  });

export const txnIdParamSchema = z.object({
  id: accountIdSchema,
});

export const accountIdParamSchema = z.object({
  accountId: accountIdSchema,
});
