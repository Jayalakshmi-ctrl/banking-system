package com.banking.account.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Paginated account list")
public record PagedAccountsResponse(
        @Schema(description = "Accounts on this page (same order as GET /api/v1/accounts)")
        List<AccountResponse> accounts,
        long total,
        int limit,
        int offset
) {}
