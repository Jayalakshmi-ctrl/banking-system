package com.banking.account.infrastructure.client;

import com.banking.account.application.KycConstraints;
import com.banking.account.presentation.exception.BusinessRuleViolationException;
import com.banking.account.presentation.exception.UpstreamServiceException;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomerServiceClient {

    @Qualifier("customerRestClient")
    private final RestClient customerRestClient;

    public void assertKycVerified(UUID customerId) {
        try {
            KycApiResponse body = customerRestClient
                    .get()
                    .uri("/api/v1/customers/{id}/kyc", customerId)
                    .retrieve()
                    .body(KycApiResponse.class);
            if (body == null || body.kycStatus() == null) {
                throw new BusinessRuleViolationException("KYC could not be confirmed", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (!KycConstraints.VERIFIED_STATUS.equalsIgnoreCase(body.kycStatus().trim())) {
                throw new BusinessRuleViolationException("Customer KYC is not verified", HttpStatus.UNPROCESSABLE_ENTITY);
            }
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Customer not found for KYC check customerId={}", customerId);
            throw new BusinessRuleViolationException("Customer not found", HttpStatus.NOT_FOUND);
        } catch (RestClientException e) {
            log.error("Customer service unavailable customerId={}", customerId, e);
            throw new UpstreamServiceException("Customer service unavailable", e);
        }
    }

    /**
     * Best-effort read for notification payloads; does not throw on 404/5xx so account flows stay resilient.
     */
    public Optional<CustomerProfileJson> tryFetchCustomerProfile(UUID customerId) {
        try {
            CustomerProfileJson body = customerRestClient
                    .get()
                    .uri("/api/v1/customers/{id}", customerId)
                    .retrieve()
                    .body(CustomerProfileJson.class);
            if (body == null || body.email() == null || body.email().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(body);
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Customer not found for notification enrichment customerId={}", customerId);
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("Customer service unavailable for notification enrichment customerId={}", customerId, e);
            return Optional.empty();
        }
    }
}
