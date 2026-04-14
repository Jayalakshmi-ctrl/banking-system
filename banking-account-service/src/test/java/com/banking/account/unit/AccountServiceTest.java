package com.banking.account.unit;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.banking.account.application.dto.CreateAccountRequest;
import com.banking.account.application.dto.DebitRequest;
import com.banking.account.application.service.AccountService;
import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.enums.Currency;
import com.banking.account.domain.model.Account;
import com.banking.account.infrastructure.client.CustomerServiceClient;
import com.banking.account.infrastructure.messaging.AccountEventPublisher;
import com.banking.account.infrastructure.repository.AccountRepository;
import com.banking.account.presentation.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerServiceClient customerServiceClient;

    @Mock
    private AccountEventPublisher accountEventPublisher;

    @InjectMocks
    private AccountService accountService;

    private UUID accountId;
    private Account savingsAccount;

    @BeforeEach
    void setUp() {
        accountId = UUID.randomUUID();
        savingsAccount = new Account();
        savingsAccount.setAccountId(accountId);
        savingsAccount.setCustomerId(UUID.randomUUID());
        savingsAccount.setAccountNumber("123456789012");
        savingsAccount.setAccountType(AccountType.SAVINGS);
        savingsAccount.setBalance(new BigDecimal("100.00"));
        savingsAccount.setCurrency(Currency.INR);
        savingsAccount.setStatus(AccountStatus.ACTIVE);
    }

    @Test
    void test_debit_savings_negative_balance_raises_conflict() {
        when(accountRepository.findByAccountIdAndDeletedAtIsNullForUpdate(accountId))
                .thenReturn(Optional.of(savingsAccount));

        assertThatThrownBy(() -> accountService.debit(accountId, new DebitRequest(new BigDecimal("150.00"))))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void test_debit_frozen_account_raises_conflict() {
        savingsAccount.setStatus(AccountStatus.FROZEN);
        when(accountRepository.findByAccountIdAndDeletedAtIsNullForUpdate(accountId))
                .thenReturn(Optional.of(savingsAccount));

        assertThatThrownBy(() -> accountService.debit(accountId, new DebitRequest(new BigDecimal("10.00"))))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void test_create_duplicate_account_number_raises_conflict() {
        when(accountRepository.existsByAccountNumberAndDeletedAtIsNull("111111111111")).thenReturn(true);
        CreateAccountRequest request = new CreateAccountRequest(
                UUID.randomUUID(),
                "111111111111",
                AccountType.CURRENT,
                Currency.INR,
                BigDecimal.TEN
        );

        assertThatThrownBy(() -> accountService.createAccount(request))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(customerServiceClient, never()).assertKycVerified(any());
        verify(accountRepository, never()).save(any());
    }
}
