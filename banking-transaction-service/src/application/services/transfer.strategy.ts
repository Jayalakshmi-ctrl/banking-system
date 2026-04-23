import type { Logger } from "pino";
import { Decimal } from "@prisma/client/runtime/library";
import type { AppConfig } from "../../config";
import { IDEMPOTENCY_TTL_MS } from "../../config";
import { TransactionType } from "../../domain/enums";
import type { AccountServiceClient } from "../../infrastructure/clients/account-service.client";
import type { TxnEventPublisher } from "../../infrastructure/messaging/rabbitmq";
import type { IdempotencyRepository } from "../../infrastructure/repositories/idempotency.repository";
import type { TransactionRepository } from "../../infrastructure/repositories/transaction.repository";
import type { TransferRequestDto, TransferResponseDto, TransactionResponseDto } from "../dtos/transaction.dto";
import { AppError } from "../errors";
import { utcDayRange } from "./day-boundaries";
import { generateTransactionReference } from "./reference.generator";
import { exceedsDailyTransferLimit } from "./transfer-limit";
import { recordDailyLimitExceeded, recordSuccessfulTransaction } from "../../infrastructure/metrics/business-metrics";
import type { TxnContactResolver } from "./txn-contact-resolver";

const PROBLEM_BASE = "https://api.bank.local/problems";

export interface TransferStrategyDeps {
  accounts: AccountServiceClient;
  transactions: TransactionRepository;
  idempotency: IdempotencyRepository;
  publisher: TxnEventPublisher;
  logger: Logger;
  config: AppConfig;
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

function assertOperational(status: string, logDetail: string): void {
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

export interface TransferExecutionInput {
  dto: TransferRequestDto;
  idempotency_key: string;
  now: Date;
}

export class TransferStrategy {
  constructor(private readonly deps: TransferStrategyDeps) {}

  async execute(input: TransferExecutionInput): Promise<TransferResponseDto> {
    const cached = await this.deps.idempotency.findValid(input.idempotency_key, input.now);
    if (cached?.response_body) {
      return cached.response_body as TransferResponseDto;
    }

    const { dto } = input;
    if (dto.from_account_id === dto.to_account_id) {
      throw new AppError(
        "Invalid transfer",
        422,
        `${PROBLEM_BASE}/invalid-transfer`,
        "Unprocessable Entity",
        "Request failed",
        "Source and destination must differ",
      );
    }

    let fromValidation;
    let toValidation;
    try {
      [fromValidation, toValidation] = await Promise.all([
        this.deps.accounts.validateAccount(dto.from_account_id, { amount: dto.amount }),
        this.deps.accounts.validateAccount(dto.to_account_id, {}),
      ]);
    } catch (error) {
      this.deps.logger.error({ err: error }, "Transfer validation failed");
      throw new AppError(
        "Transfer validation failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service validate failed",
      );
    }

    assertOperational(fromValidation.status, fromValidation.reason ?? fromValidation.status);
    assertOperational(toValidation.status, toValidation.reason ?? toValidation.status);

    if (!fromValidation.allowed) {
      throw new AppError(
        "Transfer not permitted",
        422,
        `${PROBLEM_BASE}/transfer-denied`,
        "Unprocessable Entity",
        "Request failed",
        fromValidation.reason ?? "Insufficient funds or restrictions",
      );
    }

    const { start, end } = utcDayRange(input.now);
    const spent = await this.deps.transactions.sumTransferOutForAccountDay({
      account_id: dto.from_account_id,
      dayStart: start,
      dayEnd: end,
    });
    if (
      exceedsDailyTransferLimit({
        existingTransferOutSum: spent,
        additionalAmount: dto.amount,
        limitInr: this.deps.config.DAILY_TRANSFER_LIMIT,
      })
    ) {
      recordDailyLimitExceeded();
      throw new AppError(
        "Daily transfer limit exceeded",
        422,
        `${PROBLEM_BASE}/transfer-limit`,
        "Unprocessable Entity",
        "Request failed",
        "Daily TRANSFER_OUT aggregate would exceed configured limit",
      );
    }

    const outRef = generateTransactionReference();
    const inRef = generateTransactionReference();

    try {
      await this.deps.accounts.debit(dto.from_account_id, { amount: dto.amount, reference: outRef });
    } catch (error) {
      this.deps.logger.error({ err: error, from: dto.from_account_id }, "Transfer debit failed");
      throw new AppError(
        "Transfer debit failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service debit failed",
      );
    }

    try {
      await this.deps.accounts.credit(dto.to_account_id, { amount: dto.amount, reference: inRef });
    } catch (error) {
      this.deps.logger.error({ err: error, to: dto.to_account_id }, "Transfer credit failed; compensating source");
      const reversalRef = generateTransactionReference();
      try {
        await this.deps.accounts.credit(dto.from_account_id, { amount: dto.amount, reference: reversalRef });
      } catch (compError) {
        this.deps.logger.fatal({ err: compError, from: dto.from_account_id }, "Transfer compensation credit failed");
      }
      throw new AppError(
        "Transfer credit failed",
        502,
        `${PROBLEM_BASE}/upstream-error`,
        "Bad Gateway",
        "Request failed",
        "Account service credit failed",
      );
    }

    const expiresAt = new Date(input.now.getTime() + IDEMPOTENCY_TTL_MS);
    let response: TransferResponseDto;
    try {
      const pair = await this.deps.transactions.createTransferWithIdempotency({
        outbound: {
          account_id: dto.from_account_id,
          amount: dto.amount,
          txn_type: TransactionType.TRANSFER_OUT,
          counterparty: dto.counterparty,
          reference: outRef,
        },
        inbound: {
          account_id: dto.to_account_id,
          amount: dto.amount,
          txn_type: TransactionType.TRANSFER_IN,
          counterparty: dto.counterparty,
          reference: inRef,
        },
        idempotency_key: input.idempotency_key,
        expires_at: expiresAt,
      });
      response = {
        transfer_out: toResponse(pair.outbound),
        transfer_in: toResponse(pair.inbound),
      };
    } catch (error) {
      this.deps.logger.fatal(
        { err: error, from: dto.from_account_id, to: dto.to_account_id },
        "Transfer ledger write failed after successful account movements; compensating",
      );
      const reverseDebitRef = generateTransactionReference();
      const reverseCreditRef = generateTransactionReference();
      try {
        await this.deps.accounts.credit(dto.from_account_id, { amount: dto.amount, reference: reverseDebitRef });
        await this.deps.accounts.debit(dto.to_account_id, { amount: dto.amount, reference: reverseCreditRef });
        this.deps.logger.info(
          { from: dto.from_account_id, to: dto.to_account_id },
          "Transfer compensation successful after ledger write failure",
        );
      } catch (compError) {
        this.deps.logger.fatal(
          { err: compError, from: dto.from_account_id, to: dto.to_account_id },
          "Transfer compensation failed; manual reconciliation required",
        );
      }
      throw new AppError(
        "Transfer persist failed",
        500,
        `${PROBLEM_BASE}/internal-error`,
        "Internal Server Error",
        "Request failed",
        "Failed to record transfer",
      );
    }

    if (new Decimal(dto.amount).greaterThan(new Decimal(this.deps.config.HIGH_VALUE_THRESHOLD))) {
      this.deps.logger.info(
        { correlation: "high_value_txn", transfer_out_id: response.transfer_out.txn_id },
        "High value transfer recorded",
      );
    }

    await this.publishPair(response);
    recordSuccessfulTransaction("transfer");

    return response;
  }

  private async publishPair(response: TransferResponseDto): Promise<void> {
    await this.publishTxnLeg(response.transfer_out);
    await this.publishTxnLeg(response.transfer_in);
  }

  private async publishTxnLeg(leg: TransactionResponseDto): Promise<void> {
    const contact = await this.deps.contactResolver.forAccount(leg.account_id);
    await this.deps.publisher.publishTxnCreated({
      txn_id: leg.txn_id,
      account_id: leg.account_id,
      amount: leg.amount,
      txn_type: leg.txn_type,
      reference: leg.reference,
      created_at: leg.created_at,
      ...contact,
    });
  }
}
