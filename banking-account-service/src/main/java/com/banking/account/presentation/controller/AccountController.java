package com.banking.account.presentation.controller;

import com.banking.account.application.PaginationConstraints;
import com.banking.account.application.dto.AccountResponse;
import com.banking.account.application.dto.BalanceResponse;
import com.banking.account.application.dto.CreateAccountRequest;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.dto.StatusUpdateRequest;
import com.banking.account.application.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Accounts", description = "Bank accounts (JSON uses camelCase: customerId, accountNumber, …)")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    @Operation(
            summary = "Create account",
            description =
                    "Request body: customerId (UUID, must exist with VERIFIED KYC), accountNumber (12 digits), accountType, optional currency, optional initialBalance.")
    @ResponseStatus(HttpStatus.CREATED)
    AccountResponse create(@Valid @RequestBody CreateAccountRequest request) {
        return accountService.createAccount(request);
    }

    @GetMapping
    @Operation(summary = "List accounts (paginated)")
    PagedAccountsResponse list(
            @Parameter(
                            name = "limit",
                            in = ParameterIn.QUERY,
                            description = "Page size (1–100)",
                            example = "20")
                    @RequestParam(name = "limit", required = false)
                    Integer limit,
            @Parameter(
                            name = "offset",
                            in = ParameterIn.QUERY,
                            description = "Zero-based offset",
                            example = "0")
                    @RequestParam(name = "offset", required = false)
                    Integer offset
    ) {
        int l = limit == null ? PaginationConstraints.DEFAULT_LIMIT : limit;
        int o = offset == null ? 0 : offset;
        return accountService.listAccounts(l, o);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get account by ID")
    AccountResponse get(
            @Parameter(
                            name = "id",
                            in = ParameterIn.PATH,
                            required = true,
                            description = "Account UUID",
                            example = "00000000-0000-4000-8000-000000000001")
                    @PathVariable
                    UUID id) {
        return accountService.getAccount(id);
    }

    @GetMapping("/{id}/balance")
    @Operation(summary = "Get account balance")
    BalanceResponse balance(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id) {
        return accountService.getBalance(id);
    }

    @PatchMapping("/{id}/status")
    @Operation(
            summary = "Update account status",
            description = "Request body: JSON object with `status` (ACTIVE | FROZEN | CLOSED).")
    AccountResponse updateStatus(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id,
            @Valid @RequestBody StatusUpdateRequest request) {
        return accountService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Close (soft-delete) account")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void close(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id) {
        accountService.closeAccount(id);
    }
}
