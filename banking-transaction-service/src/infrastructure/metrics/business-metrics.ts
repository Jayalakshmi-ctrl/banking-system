import promClient from "prom-client";

let transactionsTotal: promClient.Counter | null = null;
let failedTransfersTotal: promClient.Counter | null = null;
let dailyLimitExceededTotal: promClient.Counter | null = null;

export function initBusinessMetrics(register: promClient.Registry): void {
  transactionsTotal = new promClient.Counter({
    name: "transactions_total",
    help: "Successful deposit, withdrawal, or transfer operations (transfer counts once per completed transfer, not per ledger leg)",
    labelNames: ["operation"],
    registers: [register],
  });
  failedTransfersTotal = new promClient.Counter({
    name: "failed_transfers_total",
    help: "Transfer requests that failed after reaching the transfer use case (excludes body/header validation errors)",
    registers: [register],
  });
  dailyLimitExceededTotal = new promClient.Counter({
    name: "daily_limit_exceeded_total",
    help: "Transfers rejected because the daily outbound limit would be exceeded",
    registers: [register],
  });
}

export function recordSuccessfulTransaction(operation: "deposit" | "withdrawal" | "transfer"): void {
  transactionsTotal?.labels(operation).inc();
}

export function recordFailedTransfer(): void {
  failedTransfersTotal?.inc();
}

export function recordDailyLimitExceeded(): void {
  dailyLimitExceededTotal?.inc();
}
