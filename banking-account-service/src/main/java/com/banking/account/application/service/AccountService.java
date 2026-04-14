package com.banking.account.application.service;

import com.banking.account.application.PaginationConstraints;
import com.banking.account.application.dto.AccountResponse;
import com.banking.account.application.dto.BalanceResponse;
import com.banking.account.application.dto.CreateAccountRequest;
import com.banking.account.application.dto.CreditRequest;
import com.banking.account.application.dto.DebitRequest;
import com.banking.account.application.dto.LedgerMutationResponse;
import com.banking.account.application.dto.PagedAccountsResponse;
import com.banking.account.application.dto.StatusUpdateRequest;
import com.banking.account.application.dto.ValidateRequest;
import com.banking.account.application.dto.ValidateResponse;
import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.domain.enums.AccountType;
import com.banking.account.domain.model.Account;
import com.banking.account.infrastructure.client.CustomerServiceClient;
import com.banking.account.infrastructure.messaging.AccountEventPublisher;
import com.banking.account.infrastructure.repository.AccountRepository;
import com.banking.account.presentation.exception.AccountNotFoundException;
import com.banking.account.presentation.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final AccountRepository accountRepository;
    private final CustomerServiceClient customerServiceClient;
    private final AccountEventPublisher accountEventPublisher;

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        if (accountRepository.existsByAccountNumberAndDeletedAtIsNull(request.accountNumber())) {
            throw new BusinessRuleViolationException("Account number already exists", HttpStatus.CONFLICT);
        }
        customerServiceClient.assertKycVerified(request.customerId());
        Account account = new Account();
        account.setCustomerId(request.customerId());
        account.setAccountNumber(request.accountNumber());
        account.setAccountType(request.accountType());
        account.setCurrency(request.currency());
        account.setBalance(request.initialBalance().setScale(2));
        account.setStatus(AccountStatus.ACTIVE);
        try {
            accountRepository.save(account);
        } catch (DataIntegrityViolationException e) {
            log.warn("Account create conflict accountNumber={}", request.accountNumber());
            throw new BusinessRuleViolationException("Account could not be created", HttpStatus.CONFLICT);
        }
        return toResponse(account);
    }

    @Transactional(readOnly = true)
    public PagedAccountsResponse listAccounts(int limit, int offset) {
        int safeLimit = clampLimit(limit);
        int safeOffset = Math.max(offset, 0);
        long total = accountRepository.countByDeletedAtIsNull();
        List<Account> rows = accountRepository.findAllActiveWithOffset(safeOffset, safeLimit);
        List<AccountResponse> data = rows.stream().map(this::toResponse).toList();
        return new PagedAccountsResponse(data, total, safeLimit, safeOffset);
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(UUID id) {
        return toResponse(requireActiveAccount(id));
    }

    @Transactional(readOnly = true)
    public BalanceResponse getBalance(UUID id) {
        Account account = requireActiveAccount(id);
        return new BalanceResponse(account.getAccountId(), account.getBalance(), account.getCurrency());
    }

    @Transactional
    public AccountResponse updateStatus(UUID id, StatusUpdateRequest request) {
        Account account = requireActiveAccount(id);
        AccountStatus previous = account.getStatus();
        if (previous == request.status()) {
            return toResponse(account);
        }
        account.setStatus(request.status());
        accountRepository.save(account);
        accountEventPublisher.publishStatusChanged(account.getAccountId(), account.getCustomerId(), previous, request.status());
        return toResponse(account);
    }

    @Transactional
    public void closeAccount(UUID id) {
        Account account = requireActiveAccount(id);
        account.setDeletedAt(Instant.now());
        account.setStatus(AccountStatus.CLOSED);
        accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public PagedAccountsResponse listByCustomer(UUID customerId, int limit, int offset) {
        int safeLimit = clampLimit(limit);
        int safeOffset = Math.max(offset, 0);
        long total = accountRepository.countByCustomerIdAndDeletedAtIsNull(customerId);
        List<Account> rows = accountRepository.findByCustomerWithOffset(customerId, safeOffset, safeLimit);
        List<AccountResponse> data = rows.stream().map(this::toResponse).toList();
        return new PagedAccountsResponse(data, total, safeLimit, safeOffset);
    }

    @Transactional(readOnly = true)
    public ValidateResponse validateForTransfer(UUID id, ValidateRequest request) {
        Account account = requireActiveAccount(id);
        String status = account.getStatus().name();
        String accountType = account.getAccountType().name();
        BigDecimal balance = account.getBalance();

        if (account.getStatus() != AccountStatus.ACTIVE) {
            return new ValidateResponse(status, accountType, balance, false, "Account is not active");
        }
        if (request.minimumBalance() != null) {
            BigDecimal min = request.minimumBalance().setScale(2);
            if (balance.compareTo(min) < 0) {
                return new ValidateResponse(status, accountType, balance, false, "Insufficient balance for operation");
            }
        }
        return new ValidateResponse(status, accountType, balance, true, null);
    }

    @Transactional
    public LedgerMutationResponse debit(UUID id, DebitRequest request) {
        Account account = accountRepository
                .findByAccountIdAndDeletedAtIsNullForUpdate(id)
                .orElseThrow(AccountNotFoundException::new);
        assertDebitCreditAllowed(account);
        BigDecimal amount = request.amount().setScale(2);
        BigDecimal next = account.getBalance().subtract(amount);
        assertNonNegativeIfRequired(account.getAccountType(), next);
        account.setBalance(next);
        accountRepository.save(account);
        return new LedgerMutationResponse(account.getAccountId(), account.getBalance());
    }

    @Transactional
    public LedgerMutationResponse credit(UUID id, CreditRequest request) {
        Account account = accountRepository
                .findByAccountIdAndDeletedAtIsNullForUpdate(id)
                .orElseThrow(AccountNotFoundException::new);
        assertDebitCreditAllowed(account);
        BigDecimal amount = request.amount().setScale(2);
        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);
        return new LedgerMutationResponse(account.getAccountId(), account.getBalance());
    }

    private static void assertDebitCreditAllowed(Account account) {
        if (account.getDeletedAt() != null) {
            throw new AccountNotFoundException();
        }
        if (account.getStatus() == AccountStatus.FROZEN || account.getStatus() == AccountStatus.CLOSED) {
            throw new BusinessRuleViolationException("Account cannot accept debits or credits in current status", HttpStatus.CONFLICT);
        }
    }

    private static void assertNonNegativeIfRequired(AccountType type, BigDecimal balanceAfter) {
        if (type != AccountType.SAVINGS && type != AccountType.SALARY) {
            return;
        }
        if (balanceAfter.compareTo(ZERO) < 0) {
            throw new BusinessRuleViolationException("Balance cannot be negative for this account type", HttpStatus.CONFLICT);
        }
    }

    private Account requireActiveAccount(UUID id) {
        return accountRepository.findByAccountIdAndDeletedAtIsNull(id).orElseThrow(AccountNotFoundException::new);
    }

    private static int clampLimit(int limit) {
        if (limit < 1) {
            return PaginationConstraints.DEFAULT_LIMIT;
        }
        return Math.min(limit, PaginationConstraints.MAX_LIMIT);
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getAccountId(),
                account.getCustomerId(),
                account.getAccountNumber(),
                account.getAccountType(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}
