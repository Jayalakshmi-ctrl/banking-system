CREATE TABLE accounts (
    account_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID NOT NULL,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    account_type   VARCHAR(10) NOT NULL CHECK (account_type IN ('SAVINGS', 'SALARY', 'CURRENT', 'NRE')),
    balance        DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
    status         VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_accounts_customer ON accounts(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_status ON accounts(status) WHERE deleted_at IS NULL;
