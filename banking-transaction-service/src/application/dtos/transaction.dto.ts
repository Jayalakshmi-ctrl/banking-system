export interface DepositRequestDto {
  account_id: string;
  amount: string;
  counterparty?: string;
}

export interface WithdrawalRequestDto {
  account_id: string;
  amount: string;
  counterparty?: string;
}

export interface TransferRequestDto {
  from_account_id: string;
  to_account_id: string;
  amount: string;
  counterparty?: string;
}

export interface TransactionResponseDto {
  txn_id: string;
  account_id: string;
  amount: string;
  txn_type: string;
  counterparty: string | null;
  reference: string;
  created_at: string;
}

export interface TransferResponseDto {
  transfer_out: TransactionResponseDto;
  transfer_in: TransactionResponseDto;
}

export interface PaginatedTransactionsDto {
  data: TransactionResponseDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatementQueryDto {
  account_id: string;
  from_date: Date;
  to_date: Date;
}
