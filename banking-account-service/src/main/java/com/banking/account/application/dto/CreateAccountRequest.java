package com.banking.account.application.dto;

import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateAccountRequest(
        @NotNull UUID customerId,
        @NotNull @Pattern(regexp = "^\\d{12}$", message = "accountNumber must be 12 digits") String accountNumber,
        @NotNull AccountType accountType,
        Currency currency,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal initialBalance
) {
    public CreateAccountRequest {
        if (currency == null) {
            currency = Currency.INR;
        }
        if (initialBalance == null) {
            initialBalance = BigDecimal.ZERO;
        }
    }
}
