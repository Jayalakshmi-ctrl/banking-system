package com.banking.account.infrastructure.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KycApiResponse(
        @JsonProperty("kycStatus") @JsonAlias("kyc_status") String kycStatus
) {}
