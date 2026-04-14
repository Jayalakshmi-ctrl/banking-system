import type { Prisma, PrismaClient } from "@prisma/client";
import { TransactionType } from "../../domain/enums";
import type { TransactionRecord } from "../../domain/models";

function toRecord(row: {
  txn_id: string;
  account_id: string;
  amount: Prisma.Decimal;
  txn_type: string;
  counterparty: string | null;
  reference: string;
  created_at: Date;
}): TransactionRecord {
  return {
    txn_id: row.txn_id,
    account_id: row.account_id,
    amount: row.amount.toFixed(2),
    txn_type: row.txn_type as TransactionType,
    counterparty: row.counterparty,
    reference: row.reference,
    created_at: row.created_at,
  };
}

export interface CreateTransactionInput {
  txn_id?: string;
  account_id: string;
  amount: string;
  txn_type: TransactionType;
  counterparty?: string;
  reference: string;
}

export class TransactionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const row = await this.db.transaction.create({
      data: {
        ...(input.txn_id ? { txn_id: input.txn_id } : {}),
        account_id: input.account_id,
        amount: input.amount,
        txn_type: input.txn_type,
        counterparty: input.counterparty ?? null,
        reference: input.reference,
      },
    });
    return toRecord(row);
  }

  async createMany(inputs: CreateTransactionInput[]): Promise<TransactionRecord[]> {
    const rows = await this.db.$transaction(
      inputs.map((input) =>
        this.db.transaction.create({
          data: {
            ...(input.txn_id ? { txn_id: input.txn_id } : {}),
            account_id: input.account_id,
            amount: input.amount,
            txn_type: input.txn_type,
            counterparty: input.counterparty ?? null,
            reference: input.reference,
          },
        }),
      ),
    );
    return rows.map(toRecord);
  }

  async findById(txnId: string): Promise<TransactionRecord | null> {
    const row = await this.db.transaction.findUnique({ where: { txn_id: txnId } });
    return row ? toRecord(row) : null;
  }

  async list(params: { limit: number; offset: number }): Promise<{ rows: TransactionRecord[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.db.transaction.findMany({
        orderBy: { created_at: "desc" },
        take: params.limit,
        skip: params.offset,
      }),
      this.db.transaction.count(),
    ]);
    return { rows: rows.map(toRecord), total };
  }

  async statement(params: { account_id: string; from: Date; to: Date }): Promise<TransactionRecord[]> {
    const rows = await this.db.transaction.findMany({
      where: {
        account_id: params.account_id,
        created_at: { gte: params.from, lte: params.to },
      },
      orderBy: { created_at: "asc" },
    });
    return rows.map(toRecord);
  }

  async sumTransferOutForAccountDay(params: { account_id: string; dayStart: Date; dayEnd: Date }): Promise<string> {
    const agg = await this.db.transaction.aggregate({
      where: {
        account_id: params.account_id,
        txn_type: TransactionType.TRANSFER_OUT,
        created_at: { gte: params.dayStart, lte: params.dayEnd },
      },
      _sum: { amount: true },
    });
    const v = agg._sum.amount;
    return v ? v.toFixed(2) : "0.00";
  }

  async createTransferWithIdempotency(params: {
    outbound: CreateTransactionInput;
    inbound: CreateTransactionInput;
    idempotency_key: string;
    expires_at: Date;
  }): Promise<{ outbound: TransactionRecord; inbound: TransactionRecord }> {
    const result = await this.db.$transaction(async (tx) => {
      const outRow = await tx.transaction.create({
        data: {
          ...(params.outbound.txn_id ? { txn_id: params.outbound.txn_id } : {}),
          account_id: params.outbound.account_id,
          amount: params.outbound.amount,
          txn_type: params.outbound.txn_type,
          counterparty: params.outbound.counterparty ?? null,
          reference: params.outbound.reference,
        },
      });
      const inRow = await tx.transaction.create({
        data: {
          ...(params.inbound.txn_id ? { txn_id: params.inbound.txn_id } : {}),
          account_id: params.inbound.account_id,
          amount: params.inbound.amount,
          txn_type: params.inbound.txn_type,
          counterparty: params.inbound.counterparty ?? null,
          reference: params.inbound.reference,
        },
      });
      const outbound = toRecord(outRow);
      const inbound = toRecord(inRow);
      const responseBody = {
        transfer_out: {
          txn_id: outbound.txn_id,
          account_id: outbound.account_id,
          amount: outbound.amount,
          txn_type: outbound.txn_type,
          counterparty: outbound.counterparty,
          reference: outbound.reference,
          created_at: outbound.created_at.toISOString(),
        },
        transfer_in: {
          txn_id: inbound.txn_id,
          account_id: inbound.account_id,
          amount: inbound.amount,
          txn_type: inbound.txn_type,
          counterparty: inbound.counterparty,
          reference: inbound.reference,
          created_at: inbound.created_at.toISOString(),
        },
      };
      await tx.idempotencyKey.create({
        data: {
          idempotency_key: params.idempotency_key,
          txn_id: outRow.txn_id,
          response_body: responseBody,
          expires_at: params.expires_at,
        },
      });
      return { outRow, inRow };
    });
    return {
      outbound: toRecord(result.outRow),
      inbound: toRecord(result.inRow),
    };
  }
}
