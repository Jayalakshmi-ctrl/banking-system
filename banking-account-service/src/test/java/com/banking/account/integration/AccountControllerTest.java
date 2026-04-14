package com.banking.account.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.banking.account.application.dto.AccountResponse;
import com.banking.account.application.service.AccountService;
import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import com.banking.account.presentation.controller.AccountController;
import com.banking.account.presentation.exception.AccountNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AccountController.class)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AccountService accountService;

    @Test
    void test_post_accounts_invalid_account_number_returns_400() throws Exception {
        Map<String, Object> body = Map.of(
                "customerId", UUID.randomUUID().toString(),
                "accountNumber", "bad",
                "accountType", "CURRENT"
        );

        mockMvc.perform(post("/api/v1/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void test_get_account_unknown_id_returns_404() throws Exception {
        UUID id = UUID.randomUUID();
        when(accountService.getAccount(any(UUID.class))).thenThrow(new AccountNotFoundException());

        mockMvc.perform(get("/api/v1/accounts/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void test_get_account_returns_200() throws Exception {
        UUID id = UUID.randomUUID();
        AccountResponse response = new AccountResponse(
                id,
                UUID.randomUUID(),
                "123456789012",
                AccountType.SAVINGS,
                new BigDecimal("10.00"),
                Currency.INR,
                AccountStatus.ACTIVE,
                Instant.parse("2024-01-01T00:00:00Z"),
                Instant.parse("2024-01-01T00:00:00Z")
        );
        when(accountService.getAccount(id)).thenReturn(response);

        mockMvc.perform(get("/api/v1/accounts/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber").value("123456789012"));
    }
}
