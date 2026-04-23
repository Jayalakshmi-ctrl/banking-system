import type { Logger } from "pino";
import { Decimal } from "@prisma/client/runtime/library";
import { TransactionType } from "../../domain/enums";
import type { AccountServiceClient } from "../../infrastructure/clients/account-service.client";
import type { TxnEventPublisher } from "../../infrastructure/messaging/rabbitmq";
import type { TransactionRepository } from "../../infrastructure/repositories/transaction.repository";
import type { DepositRequestDto, TransactionResponseDto } from "../dtos/transaction.dto";
import { AppError } from "../errors";
import { generateTransactionReference } from "./reference.generator";
import { recordSuccessfulTransaction } from "../../infrastructure/metrics/business-metrics";
import type { TxnContactResolver } from "./txn-contact-resolver";

const PROBLEM_BASE = "https://api.bank.local/problems";

export interface DepositStrategyDeps {
  accounts: AccountServiceClient;
  transactions: TransactionRepository;
  publisher: TxnEventPublisher;
  logger: Logger;
  high_value_threshold_inr: number;
  contactResolver: TxnContactResolver;
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

function assertAccountOperational(status: string, logDetail: string): void {
  const normalized = status.toUpperCase();
  if (normalized === "FROZEN" || normalized === "CLOSED") {
    throw new AppError(
      "Account blocked",
      409,
      `${PROBLEM_BASE}/account-blocked`,
      "Conflict",
      "Request failed",
      logDetail,
    );
  }
}

export class DepositStrategy {
  constructor(private readonly deps: DepositStrategyDeps) {}

  async execute(dto: DepositRequestDto): Promise<TransactionResponseDto> {
    const reference = generateTransactionReference();
    let validation;
    try {
      validation = await this.deps.accounts.validateAccount(dto.account_id, {});
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id }, "Deposit validation failed");
      throw new AppError(
        "Deposit validation failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service validate failed",
      );
    }
    assertAccountOperational(validation.status, validation.reason ?? validation.status);
    try {
      await this.deps.accounts.credit(dto.account_id, { amount: dto.amount, reference });
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id }, "Deposit credit failed");
      throw new AppError(
        "Deposit failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service credit failed",
      );
    }
    try {
      const record = await this.deps.transactions.create({
        account_id: dto.account_id,
        amount: dto.amount,
        txn_type: TransactionType.DEPOSIT,
        counterparty: dto.counterparty,
        reference,
      });
      const body = toResponse(record);
      if (new Decimal(dto.amount).greaterThan(new Decimal(this.deps.high_value_threshold_inr))) {
        this.deps.logger.info({ correlation: "high_value_txn", txn_id: body.txn_id }, "High value deposit recorded");
      }
      const contact = await this.deps.contactResolver.forAccount(body.account_id);
      await this.deps.publisher.publishTxnCreated({
        txn_id: body.txn_id,
        account_id: body.account_id,
        amount: body.amount,
        txn_type: body.txn_type,
        reference: body.reference,
        created_at: body.created_at,
        ...contact,
      });
      recordSuccessfulTransaction("deposit");
      return body;
    } catch (error) {
      this.deps.logger.error({ err: error, account_id: dto.account_id, reference }, "Deposit persist failed; compensating");
      const reversalRef = generateTransactionReference();
      try {
        await this.deps.accounts.debit(dto.account_id, { amount: dto.amount, reference: reversalRef });
      } catch (compError) {
        this.deps.logger.fatal({ err: compError, account_id: dto.account_id }, "Deposit compensation debit failed");
      }
      throw new AppError(
        "Deposit persist failed",
        500,
        `${PROBLEM_BASE}/internal-error`,
        "Internal Server Error",
        "Request failed",
        "Failed to record deposit",
      );
    }
  }
}
