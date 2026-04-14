package com.banking.account.presentation.controller;

import com.banking.account.application.PaginationConstraints;
import com.banking.account.application.dto.AccountResponse;
import com.banking.account.application.dto.BalanceResponse;
import com.banking.account.application.dto.CreateAccountRequest;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.dto.StatusUpdateRequest;
import com.banking.account.application.service.AccountService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AccountResponse create(@Valid @RequestBody CreateAccountRequest request) {
        return accountService.createAccount(request);
    }

    @GetMapping
    PagedAccountsResponse list(
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "offset", required = false) Integer offset
    ) {
        int l = limit == null ? PaginationConstraints.DEFAULT_LIMIT : limit;
        int o = offset == null ? 0 : offset;
        return accountService.listAccounts(l, o);
    }

    @GetMapping("/{id}")
    AccountResponse get(@PathVariable UUID id) {
        return accountService.getAccount(id);
    }

    @GetMapping("/{id}/balance")
    BalanceResponse balance(@PathVariable UUID id) {
        return accountService.getBalance(id);
    }

    @PatchMapping("/{id}/status")
    AccountResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest request) {
        return accountService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void close(@PathVariable UUID id) {
        accountService.closeAccount(id);
    }
}
