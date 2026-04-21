package com.banking.account.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

@Schema(description = "Ledger credit amount (JSON number)")
public record CreditRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "100.50")
                @DecimalMin(value = "0.01", inclusive = true, message = "amount must be positive")
                @Digits(integer = 13, fraction = 2, message = "amount scale must be at most 2 decimal places")
        BigDecimal amount
) {}
