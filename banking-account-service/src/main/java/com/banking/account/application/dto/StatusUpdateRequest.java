package com.banking.account.application.dto;

import com.banking.account.domain.enums.AccountStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Account status update")
public record StatusUpdateRequest(
        @NotNull @Schema(description = "New status", example = "FROZEN", allowableValues = {"ACTIVE", "FROZEN", "CLOSED"})
        AccountStatus status
) {}
