package com.banking.account.presentation.controller;

import com.banking.account.application.dto.CreditRequest;
import com.banking.account.application.dto.DebitRequest;
import com.banking.account.application.dto.LedgerMutationResponse;
import com.banking.account.application.dto.ValidateRequest;
import com.banking.account.application.dto.ValidateResponse;
import com.banking.account.application.service.AccountService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/accounts")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;

    @PostMapping("/{id}/validate")
    ValidateResponse validate(@PathVariable UUID id, @Valid @RequestBody(required = false) ValidateRequest request) {
        ValidateRequest body = request == null ? new ValidateRequest(null) : request;
        return accountService.validateForTransfer(id, body);
    }

    @PostMapping("/{id}/debit")
    LedgerMutationResponse debit(@PathVariable UUID id, @Valid @RequestBody DebitRequest request) {
        return accountService.debit(id, request);
    }

    @PostMapping("/{id}/credit")
    LedgerMutationResponse credit(@PathVariable UUID id, @Valid @RequestBody CreditRequest request) {
        return accountService.credit(id, request);
    }
}
