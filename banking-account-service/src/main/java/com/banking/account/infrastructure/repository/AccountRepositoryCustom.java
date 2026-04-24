package com.banking.account.infrastructure.repository;

import com.banking.account.domain.model.Account;
import java.util.List;
import java.util.UUID;

public interface AccountRepositoryCustom {

    List<Account> findActiveByCustomerIdOrderedWithPagination(UUID customerId, int offset, int limit);
}
