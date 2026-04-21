package com.banking.account.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

@Schema(description = "Optional minimum-balance check for transfer validation")
public record ValidateRequest(
        @JsonProperty("amount")
                @Schema(
                        description = "Minimum balance to validate against (JSON field name is `amount`)",
                        example = "100.00")
                @DecimalMin(value = "0.00", inclusive = true)
                @Digits(integer = 13, fraction = 2)
        BigDecimal minimumBalance
) {}
