package com.banking.account.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "customer-service")
public record CustomerServiceProperties(String url) {}
