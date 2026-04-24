package com.banking.account.infrastructure.messaging;

import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.infrastructure.client.CustomerProfileJson;
import com.banking.account.infrastructure.client.CustomerServiceClient;
import com.banking.account.infrastructure.config.RabbitMQConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AccountEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final CustomerServiceClient customerServiceClient;

    public AccountEventPublisher(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper,
            CustomerServiceClient customerServiceClient) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.customerServiceClient = customerServiceClient;
    }

    public void publishStatusChanged(UUID accountId, UUID customerId, AccountStatus previous, AccountStatus current) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventType", "account.status.changed");
        payload.put("accountId", accountId.toString());
        payload.put("customerId", customerId.toString());
        payload.put("previousStatus", previous.name());
        payload.put("newStatus", current.name());
        payload.put("occurredAt", Instant.now().toString());
        Optional<CustomerProfileJson> profile = customerServiceClient.tryFetchCustomerProfile(customerId);
        profile.ifPresent(p -> {
            payload.put("customer_email", p.email() != null ? p.email() : "");
            payload.put("customer_phone", p.phone() != null ? p.phone() : "");
        });
        try {
            String json = objectMapper.writeValueAsString(payload);
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.BANKING_DOMAIN_EXCHANGE,
                    RabbitMQConfig.ACCOUNT_STATUS_CHANGED_ROUTING_KEY,
                    json
            );
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize account status event accountId={}", accountId, e);
        }
    }
}
