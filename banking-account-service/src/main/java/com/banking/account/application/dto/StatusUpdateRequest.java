package com.banking.account.application.dto;

import com.banking.account.domain.enums.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(@NotNull AccountStatus status) {}
