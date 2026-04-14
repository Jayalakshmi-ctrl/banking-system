package com.banking.account.infrastructure.repository;

import com.banking.account.domain.model.Account;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByAccountIdAndDeletedAtIsNull(UUID accountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.accountId = :id AND a.deletedAt IS NULL")
    Optional<Account> findByAccountIdAndDeletedAtIsNullForUpdate(@Param("id") UUID id);

    long countByDeletedAtIsNull();

    boolean existsByAccountNumberAndDeletedAtIsNull(String accountNumber);

    @Query(
            value = "SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY created_at DESC OFFSET :offset LIMIT :limit",
            nativeQuery = true
    )
    List<Account> findAllActiveWithOffset(@Param("offset") int offset, @Param("limit") int limit);

    @Query(
            value = "SELECT * FROM accounts WHERE deleted_at IS NULL AND customer_id = :customerId "
                    + "ORDER BY created_at DESC OFFSET :offset LIMIT :limit",
            nativeQuery = true
    )
    List<Account> findByCustomerWithOffset(
            @Param("customerId") UUID customerId,
            @Param("offset") int offset,
            @Param("limit") int limit
    );

    @Query(value = "SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL AND customer_id = :customerId", nativeQuery = true)
    long countByCustomerIdAndDeletedAtIsNull(@Param("customerId") UUID customerId);
}
