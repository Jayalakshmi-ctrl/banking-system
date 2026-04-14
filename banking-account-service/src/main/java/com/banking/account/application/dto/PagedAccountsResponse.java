package com.banking.account.application.dto;

import java.util.List;

public record PagedAccountsResponse(
        List<AccountResponse> data,
        long total,
        int limit,
        int offset
) {}
