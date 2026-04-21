package com.banking.account.presentation.controller;

import com.banking.account.application.dto.CreditRequest;
import com.banking.account.application.dto.DebitRequest;
import com.banking.account.application.dto.LedgerMutationResponse;
import com.banking.account.application.dto.ValidateRequest;
import com.banking.account.application.dto.ValidateResponse;
import com.banking.account.application.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(
        name = "Internal accounts",
        description = "Ledger operations used by Transaction Service (not for public clients).")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;

    @PostMapping("/{id}/validate")
    @Operation(
            summary = "Validate account for transfer",
            description =
                    "Optional JSON body: `{ \"amount\": 100.50 }` — minimum balance check (field name `amount` in JSON maps to minimum balance). Body may be empty.")
    ValidateResponse validate(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id,
            @Valid @RequestBody(required = false) ValidateRequest request) {
        ValidateRequest body = request == null ? new ValidateRequest(null) : request;
        return accountService.validateForTransfer(id, body);
    }

    @PostMapping("/{id}/debit")
    @Operation(
            summary = "Debit account",
            description = "Request body: `{ \"amount\": 100.50 }` (JSON number, max 2 decimal places, > 0).")
    LedgerMutationResponse debit(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id,
            @Valid @RequestBody DebitRequest request) {
        return accountService.debit(id, request);
    }

    @PostMapping("/{id}/credit")
    @Operation(
            summary = "Credit account",
            description = "Request body: `{ \"amount\": 100.50 }` (JSON number, max 2 decimal places, > 0).")
    LedgerMutationResponse credit(
            @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Account UUID")
                    @PathVariable
                    UUID id,
            @Valid @RequestBody CreditRequest request) {
        return accountService.credit(id, request);
    }
}
