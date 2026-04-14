package com.banking.account.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI accountServiceOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Banking Account Service").version("1.0.0"));
    }
}
