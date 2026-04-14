package com.banking.account.presentation.controller;

import com.banking.account.application.PaginationConstraints;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.service.AccountService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerAccountsController {

    private final AccountService accountService;

    @GetMapping("/{customerId}/accounts")
    PagedAccountsResponse byCustomer(
            @PathVariable UUID customerId,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "offset", required = false) Integer offset
    ) {
        int l = limit == null ? PaginationConstraints.DEFAULT_LIMIT : limit;
        int o = offset == null ? 0 : offset;
        return accountService.listByCustomer(customerId, l, o);
    }
}
