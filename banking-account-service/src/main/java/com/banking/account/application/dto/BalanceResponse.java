package com.banking.account.application.dto;

import com.banking.account.domain.enums.Currency;
import java.math.BigDecimal;
import java.util.UUID;

public record BalanceResponse(UUID accountId, BigDecimal balance, Currency currency) {}
