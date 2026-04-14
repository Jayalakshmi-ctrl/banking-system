import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { v5 as uuidv5 } from "uuid";

const prisma = new PrismaClient();

const TXN_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const ACCOUNT_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

type CsvRow = {
  txn_id: string;
  account_id: string;
  amount: string;
  txn_type: string;
  counterparty: string;
  reference: string;
  created_at: string;
};

async function main(): Promise<void> {
  const csvPath = path.resolve(__dirname, "..", "..", "bank_Dataset", "bank_transactions.csv");
  const raw = readFileSync(csvPath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];

  const data = rows.map((row) => ({
    txn_id: uuidv5(`txn:${row.txn_id}`, TXN_NAMESPACE),
    account_id: uuidv5(`account:${row.account_id}`, ACCOUNT_NAMESPACE),
    amount: row.amount,
    txn_type: row.txn_type,
    counterparty: row.counterparty || null,
    reference: row.reference,
    created_at: new Date(row.created_at.replace(" ", "T") + "Z"),
  }));

  await prisma.transaction.createMany({ data, skipDuplicates: true });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
