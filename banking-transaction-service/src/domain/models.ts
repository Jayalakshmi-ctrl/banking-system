import type { TransactionType } from "./enums";

export interface TransactionRecord {
  txn_id: string;
  account_id: string;
  amount: string;
  txn_type: TransactionType;
  counterparty: string | null;
  reference: string;
  created_at: Date;
}

export interface IdempotencyRecord {
  idempotency_key: string;
  txn_id: string;
  response_body: unknown;
  created_at: Date;
  expires_at: Date;
}
