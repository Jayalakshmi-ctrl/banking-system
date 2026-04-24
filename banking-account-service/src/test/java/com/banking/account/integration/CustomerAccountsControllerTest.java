package com.banking.account.integration;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.banking.account.application.dto.AccountResponse;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.service.AccountService;
import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import com.banking.account.presentation.controller.CustomerAccountsController;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CustomerAccountsController.class)
class CustomerAccountsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountService accountService;

    @Test
    void test_get_customer_accounts_returns_paged_payload_with_accounts_array() throws Exception {
        UUID customerId = UUID.fromString("d1c1e62e-20b0-55e6-8630-cd4167a64c0a");
        UUID accountId = UUID.fromString("b6c9c6b5-cc48-5d71-be85-c12755b1a66e");
        AccountResponse row = new AccountResponse(
                accountId,
                customerId,
                "222121684341",
                AccountType.SALARY,
                new BigDecimal("379062.61"),
                Currency.INR,
                AccountStatus.ACTIVE,
                Instant.parse("2025-03-27T15:37:45Z"),
                Instant.parse("2025-03-27T15:37:45Z"));
        when(accountService.listByCustomer(eq(customerId), anyInt(), anyInt()))
                .thenReturn(new PagedAccountsResponse(List.of(row), 2, 20, 0));

        mockMvc.perform(get("/api/v1/customers/{customerId}/accounts", customerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accounts").isArray())
                .andExpect(jsonPath("$.accounts.length()").value(1))
                .andExpect(jsonPath("$.accounts[0].id").value(accountId.toString()))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.limit").value(20))
                .andExpect(jsonPath("$.offset").value(0));
    }
}
