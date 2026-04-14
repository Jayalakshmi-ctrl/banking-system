import type { PrismaClient } from "@prisma/client";

export interface StoreIdempotencyInput {
  key: string;
  txn_id: string;
  response_body: unknown;
  expires_at: Date;
}

export class IdempotencyRepository {
  constructor(private readonly db: PrismaClient) {}

  async findValid(key: string, now: Date): Promise<{ response_body: unknown } | null> {
    const row = await this.db.idempotencyKey.findUnique({ where: { idempotency_key: key } });
    if (!row) {
      return null;
    }
    if (row.expires_at <= now) {
      return null;
    }
    return { response_body: row.response_body };
  }

  async store(input: StoreIdempotencyInput): Promise<void> {
    await this.db.idempotencyKey.create({
      data: {
        idempotency_key: input.key,
        txn_id: input.txn_id,
        response_body: input.response_body as object,
        expires_at: input.expires_at,
      },
    });
  }
}
