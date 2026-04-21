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
                .info(new Info()
                        .title("Banking Account Service")
                        .version("1.0.0")
                        .description(
                                """
                                REST API for bank accounts. JSON uses **camelCase** (e.g. `customerId`, `accountNumber`).

                                **Create account:** `customerId` must exist in Customer Service and have **VERIFIED** KYC.
                                `accountNumber` must be exactly **12 digits** and unique among active accounts.
                                `initialBalance` is a decimal number (JSON number).

                                **Internal** debit/credit/validate endpoints are under `/internal/accounts` (not shown here).
                                """));
    }
}
