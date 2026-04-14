CREATE TABLE customer_read_model (
    customer_id UUID PRIMARY KEY,
    name        VARCHAR(100),
    kyc_status  VARCHAR(10),
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
