package com.banking.account.presentation.exception;

import org.springframework.http.HttpStatus;

public class BusinessRuleViolationException extends RuntimeException {

    private final HttpStatus status;

    public BusinessRuleViolationException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
