package com.banking.account.infrastructure.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomerProfileJson(
        @JsonProperty("customer_id") String customerId,
        String email,
        String phone
) {}
