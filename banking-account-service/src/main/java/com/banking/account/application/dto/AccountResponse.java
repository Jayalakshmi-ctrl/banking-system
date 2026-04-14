package com.banking.account.application.dto;

import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        UUID customerId,
        String accountNumber,
        AccountType accountType,
        BigDecimal balance,
        Currency currency,
        AccountStatus status,
        Instant createdAt,
        Instant updatedAt
) {}
