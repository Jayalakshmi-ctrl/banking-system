package com.banking.account.application.dto;

import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "Create a new account. The customer must exist in Customer Service with VERIFIED KYC.")
public record CreateAccountRequest(
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description =
                        "Customer UUID from Customer Service. Must match a seeded customer when using bank_Dataset (e.g. customer_id=1 from CSV).",
                example = "3bfe664c-aeb8-53a5-8ae8-04933a76b51b")
        @NotNull
        UUID customerId,
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Exactly 12 digits, unique among active accounts (not already in bank_accounts seed).",
                example = "111122223333")
        @NotNull
        @Pattern(regexp = "^\\d{12}$", message = "accountNumber must be 12 digits")
        String accountNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "SAVINGS")
        @NotNull
        AccountType accountType,
        @Schema(example = "INR")
        Currency currency,
        @Schema(example = "2500.00")
        @DecimalMin(value = "0.0", inclusive = true)
        BigDecimal initialBalance
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
