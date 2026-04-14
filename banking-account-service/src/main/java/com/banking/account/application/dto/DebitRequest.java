package com.banking.account.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

public record DebitRequest(
        @DecimalMin(value = "0.01", inclusive = true, message = "amount must be positive")
        @Digits(integer = 13, fraction = 2, message = "amount scale must be at most 2 decimal places")
        BigDecimal amount
) {}
