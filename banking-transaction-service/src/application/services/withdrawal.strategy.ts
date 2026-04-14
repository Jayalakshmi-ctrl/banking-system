import type { Logger } from "pino";
import { Decimal } from "@prisma/client/runtime/library";
import { TransactionType } from "../../domain/enums";
import type { AccountServiceClient } from "../../infrastructure/clients/account-service.client";
import type { TxnEventPublisher } from "../../infrastructure/messaging/rabbitmq";
import type { TransactionRepository } from "../../infrastructure/repositories/transaction.repository";
import type { TransactionResponseDto, WithdrawalRequestDto } from "../dtos/transaction.dto";
import { AppError } from "../errors";
import { generateTransactionReference } from "./reference.generator";

const PROBLEM_BASE = "https://api.bank.local/problems";

export interface WithdrawalStrategyDeps {
  accounts: AccountServiceClient;
  transactions: TransactionRepository;
  publisher: TxnEventPublisher;
  logger: Logger;
  high_value_threshold_inr: number;
}

function toResponse(record: {
  txn_id: string;
  account_id: string;
  amount: string;
  txn_type: string;
  counterparty: string | null;
  reference: string;
  created_at: Date;
}): TransactionResponseDto {
  return {
    txn_id: record.txn_id,
    account_id: record.account_id,
    amount: record.amount,
    txn_type: record.txn_type,
    counterparty: record.counterparty,
    reference: record.reference,
    created_at: record.created_at.toISOString(),
  };
}

export class WithdrawalStrategy {
  constructor(private readonly deps: WithdrawalStrategyDeps) {}

  async execute(dto: WithdrawalRequestDto): Promise<TransactionResponseDto> {
    const reference = generateTransactionReference();
    let validation;
    try {
      validation = await this.deps.accounts.validateAccount(dto.account_id, { amount: dto.amount });
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id }, "Withdrawal validation call failed");
      throw new AppError(
        "Withdrawal validation failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service validate failed",
      );
    }
    const status = validation.status.toUpperCase();
    if (status === "FROZEN" || status === "CLOSED") {
      throw new AppError(
        "Account blocked",
        409,
        `${PROBLEM_BASE}/account-blocked`,
        "Conflict",
        "Request failed",
        validation.reason ?? status,
      );
    }
    if (!validation.allowed) {
      throw new AppError(
        "Withdrawal not permitted",
        422,
        `${PROBLEM_BASE}/withdrawal-denied`,
        "Unprocessable Entity",
        "Request failed",
        validation.reason ?? "Insufficient funds or account rules",
      );
    }
    try {
      await this.deps.accounts.debit(dto.account_id, { amount: dto.amount, reference });
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id }, "Withdrawal debit failed");
      throw new AppError(
        "Withdrawal failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service debit failed",
      );
    }
    try {
      const record = await this.deps.transactions.create({
        account_id: dto.account_id,
        amount: dto.amount,
        txn_type: TransactionType.WITHDRAWAL,
        counterparty: dto.counterparty,
        reference,
      });
      const body = toResponse(record);
      if (new Decimal(dto.amount).greaterThan(new Decimal(this.deps.high_value_threshold_inr))) {
        this.deps.logger.info({ correlation: "high_value_txn", txn_id: body.txn_id }, "High value withdrawal recorded");
      }
      await this.deps.publisher.publishTxnCreated({
        txn_id: body.txn_id,
        account_id: body.account_id,
        amount: body.amount,
        txn_type: body.txn_type,
        reference: body.reference,
        created_at: body.created_at,
      });
      return body;
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id, reference }, "Withdrawal persist failed; compensating");
      const reversalRef = generateTransactionReference();
      try {
        await this.deps.accounts.credit(dto.account_id, { amount: dto.amount, reference: reversalRef });
      } catch (compError) {
        this.deps.logger.fatal({ err: compError, account_id: dto.account_id }, "Withdrawal compensation credit failed");
      }
      throw new AppError(
        "Withdrawal persist failed",
        500,
        `${PROBLEM_BASE}/internal-error`,
        "Internal Server Error",
        "Request failed",
        "Failed to record withdrawal",
      );
    }
  }
}
