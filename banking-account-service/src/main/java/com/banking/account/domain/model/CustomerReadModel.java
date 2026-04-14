package com.banking.account.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customer_read_model")
@Getter
@Setter
public class CustomerReadModel {

    @Id
    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "kyc_status", length = 10)
    private String kycStatus;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt;
}
