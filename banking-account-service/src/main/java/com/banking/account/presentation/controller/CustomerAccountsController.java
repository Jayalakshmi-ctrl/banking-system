package com.banking.account.presentation.controller;

import com.banking.account.application.PaginationConstraints;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
@Tag(name = "Customer accounts", description = "Accounts for a given customer UUID")
@RequiredArgsConstructor
public class CustomerAccountsController {

    private final AccountService accountService;

    @GetMapping("/{customerId}/accounts")
    @Operation(summary = "List accounts for a customer")
    PagedAccountsResponse byCustomer(
            @Parameter(
                            name = "customerId",
                            in = ParameterIn.PATH,
                            required = true,
                            description = "Customer UUID (from Customer Service)",
                            example = "3bfe664c-aeb8-53a5-8ae8-04933a76b51b")
                    @PathVariable
                    UUID customerId,
            @Parameter(name = "limit", in = ParameterIn.QUERY, description = "Page size", example = "20")
                    @RequestParam(name = "limit", required = false)
                    Integer limit,
            @Parameter(name = "offset", in = ParameterIn.QUERY, description = "Offset", example = "0")
                    @RequestParam(name = "offset", required = false)
                    Integer offset
    ) {
        int l = limit == null ? PaginationConstraints.DEFAULT_LIMIT : limit;
        int o = offset == null ? 0 : offset;
        return accountService.listByCustomer(customerId, l, o);
    }
}
