CREATE TABLE "transactions" (
    "txn_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "txn_type" VARCHAR(15) NOT NULL,
    "counterparty" VARCHAR(100),
    "reference" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("txn_id")
);

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0);

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_txn_type_check" CHECK ("txn_type" IN ('DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','PAYMENT'));

CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

CREATE INDEX "idx_txn_account" ON "transactions"("account_id");

CREATE INDEX "idx_txn_created" ON "transactions"("created_at");

CREATE TABLE "idempotency_keys" (
    "idempotency_key" VARCHAR(64) NOT NULL,
    "txn_id" UUID NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("idempotency_key")
);

CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys"("expires_at");

CREATE TABLE "account_read_model" (
    "account_id" UUID NOT NULL,
    "status" VARCHAR(10),
    "account_type" VARCHAR(10),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_read_model_pkey" PRIMARY KEY ("account_id")
);
