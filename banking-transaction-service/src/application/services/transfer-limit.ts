import { Decimal } from "@prisma/client/runtime/library";

export function exceedsDailyTransferLimit(params: {
  existingTransferOutSum: string;
  additionalAmount: string;
  limitInr: number;
}): boolean {
  const sum = new Decimal(params.existingTransferOutSum);
  const next = sum.plus(new Decimal(params.additionalAmount));
  return next.greaterThan(new Decimal(params.limitInr));
}
