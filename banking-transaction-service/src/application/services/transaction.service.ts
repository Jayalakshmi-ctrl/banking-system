import type {
  DepositRequestDto,
  PaginatedTransactionsDto,
  StatementQueryDto,
  TransactionResponseDto,
  TransferRequestDto,
  TransferResponseDto,
  WithdrawalRequestDto,
} from "../dtos/transaction.dto";
import type { DepositStrategy } from "./deposit.strategy";
import type { TransferStrategy } from "./transfer.strategy";
import type { WithdrawalStrategy } from "./withdrawal.strategy";
import { recordFailedTransfer } from "../../infrastructure/metrics/business-metrics";
import type { TransactionRepository } from "../../infrastructure/repositories/transaction.repository";

function mapRecord(record: {
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

export class TransactionService {
  constructor(
    private readonly depositStrategy: DepositStrategy,
    private readonly withdrawalStrategy: WithdrawalStrategy,
    private readonly transferStrategy: TransferStrategy,
    private readonly transactions: TransactionRepository,
  ) {}

  processDeposit(dto: DepositRequestDto): Promise<TransactionResponseDto> {
    return this.depositStrategy.execute(dto);
  }

  processWithdrawal(dto: WithdrawalRequestDto): Promise<TransactionResponseDto> {
    return this.withdrawalStrategy.execute(dto);
  }

  async processTransfer(params: { dto: TransferRequestDto; idempotency_key: string; now: Date }): Promise<TransferResponseDto> {
    try {
      return await this.transferStrategy.execute({
        dto: params.dto,
        idempotency_key: params.idempotency_key,
        now: params.now,
      });
    } catch (error) {
      recordFailedTransfer();
      throw error;
    }
  }

  async listTransactions(params: { limit: number; offset: number }): Promise<PaginatedTransactionsDto> {
    const { rows, total } = await this.transactions.list({ limit: params.limit, offset: params.offset });
    return {
      data: rows.map(mapRecord),
      total,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async getTransactionById(txnId: string): Promise<TransactionResponseDto | null> {
    const row = await this.transactions.findById(txnId);
    return row ? mapRecord(row) : null;
  }

  async accountStatement(query: StatementQueryDto): Promise<TransactionResponseDto[]> {
    const rows = await this.transactions.statement({
      account_id: query.account_id,
      from: query.from_date,
      to: query.to_date,
    });
    return rows.map(mapRecord);
  }
}
