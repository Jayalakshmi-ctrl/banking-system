package com.banking.account.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record ValidateResponse(
        String status,
        @JsonProperty("account_type") String accountType,
        BigDecimal balance,
        boolean allowed,
        String reason
) {}
