package com.banking.account.infrastructure.repository;

import com.banking.account.domain.model.Account;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class AccountRepositoryImpl implements AccountRepositoryCustom {

    private static final String JPQL_ACTIVE_BY_CUSTOMER =
            "SELECT a FROM Account a WHERE a.deletedAt IS NULL AND a.customerId = :customerId ORDER BY a.createdAt DESC";

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<Account> findActiveByCustomerIdOrderedWithPagination(UUID customerId, int offset, int limit) {
        TypedQuery<Account> query =
                entityManager.createQuery(JPQL_ACTIVE_BY_CUSTOMER, Account.class).setParameter("customerId", customerId);
        query.setFirstResult(offset);
        query.setMaxResults(limit);
        return query.getResultList();
    }
}
