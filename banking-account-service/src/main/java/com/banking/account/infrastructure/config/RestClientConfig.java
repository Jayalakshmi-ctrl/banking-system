package com.banking.account.infrastructure.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(CustomerServiceProperties.class)
public class RestClientConfig {

    @Bean
    RestClient customerRestClient(CustomerServiceProperties customerServiceProperties) {
        return RestClient.builder()
                .baseUrl(customerServiceProperties.url())
                .build();
    }
}
