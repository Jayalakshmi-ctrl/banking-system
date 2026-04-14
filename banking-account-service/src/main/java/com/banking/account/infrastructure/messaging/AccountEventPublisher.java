package com.banking.account.infrastructure.messaging;

import com.banking.account.domain.enums.AccountStatus;
import com.banking.account.infrastructure.config.RabbitMQConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public void publishStatusChanged(UUID accountId, UUID customerId, AccountStatus previous, AccountStatus current) {
        Map<String, Object> payload = Map.of(
                "eventType", "account.status.changed",
                "accountId", accountId.toString(),
                "customerId", customerId.toString(),
                "previousStatus", previous.name(),
                "newStatus", current.name(),
                "occurredAt", Instant.now().toString()
        );
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
