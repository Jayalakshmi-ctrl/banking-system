import { TransactionService } from "../../src/application/services/transaction.service";
import { TransactionType } from "../../src/domain/enums";

describe("TransactionService", () => {
  it("processDeposit delegates to deposit strategy", async () => {
    const deposit = { execute: jest.fn().mockResolvedValue({ txn_id: "t1" }) };
    const withdrawal = { execute: jest.fn() };
    const transfer = { execute: jest.fn() };
    const transactions = {
      list: jest.fn(),
      findById: jest.fn(),
      statement: jest.fn(),
    };
    const svc = new TransactionService(
      deposit as never,
      withdrawal as never,
      transfer as never,
      transactions as never,
    );
    const dto = { account_id: "a1", amount: "10.00" };
    await svc.processDeposit(dto);
    expect(deposit.execute).toHaveBeenCalledWith(dto);
    expect(withdrawal.execute).not.toHaveBeenCalled();
  });

  it("listTransactions maps records to DTO shape", async () => {
    const deposit = { execute: jest.fn() };
    const withdrawal = { execute: jest.fn() };
    const transfer = { execute: jest.fn() };
    const created = new Date("2024-01-02T03:04:05.000Z");
    const transactions = {
      list: jest.fn().mockResolvedValue({
        total: 1,
        rows: [
          {
            txn_id: "550e8400-e29b-41d4-a716-446655440000",
            account_id: "660e8400-e29b-41d4-a716-446655440000",
            amount: "1.00",
            txn_type: TransactionType.DEPOSIT,
            counterparty: null,
            reference: "TXN20240102-ABCDEF",
            created_at: created,
          },
        ],
      }),
      findById: jest.fn(),
      statement: jest.fn(),
    };
    const svc = new TransactionService(
      deposit as never,
      withdrawal as never,
      transfer as never,
      transactions as never,
    );
    const result = await svc.listTransactions({ limit: 20, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.data[0].created_at).toBe(created.toISOString());
  });
});
