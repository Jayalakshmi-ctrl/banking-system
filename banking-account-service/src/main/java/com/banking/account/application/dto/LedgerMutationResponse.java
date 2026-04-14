package com.banking.account.application.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LedgerMutationResponse(UUID accountId, BigDecimal balanceAfter) {}
