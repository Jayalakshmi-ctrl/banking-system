package com.banking.account.infrastructure.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String BANKING_DOMAIN_EXCHANGE = "banking.domain";
    public static final String ACCOUNT_STATUS_CHANGED_ROUTING_KEY = "account.status.changed";

    @Bean
    TopicExchange bankingDomainExchange() {
        return new TopicExchange(BANKING_DOMAIN_EXCHANGE, true, false);
    }
}
