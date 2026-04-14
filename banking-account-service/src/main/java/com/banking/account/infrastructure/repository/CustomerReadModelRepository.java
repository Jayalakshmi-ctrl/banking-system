package com.banking.account.infrastructure.repository;

import com.banking.account.domain.model.CustomerReadModel;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerReadModelRepository extends JpaRepository<CustomerReadModel, UUID> {}
