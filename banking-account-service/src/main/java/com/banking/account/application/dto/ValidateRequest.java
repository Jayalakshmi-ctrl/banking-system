package com.banking.account.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

public record ValidateRequest(
        @JsonProperty("amount")
        @DecimalMin(value = "0.00", inclusive = true)
        @Digits(integer = 13, fraction = 2)
        BigDecimal minimumBalance
) {}
