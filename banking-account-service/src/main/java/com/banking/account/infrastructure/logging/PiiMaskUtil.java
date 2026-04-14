package com.banking.account.infrastructure.logging;

import java.util.regex.Pattern;

public final class PiiMaskUtil {

    private static final Pattern EMAIL = Pattern.compile(
            "\\b[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}\\b"
    );
    private static final Pattern PHONE = Pattern.compile("\\b\\d{10,15}\\b");

    private PiiMaskUtil() {}

    public static String mask(String raw) {
        if (raw == null || raw.isEmpty()) {
            return raw;
        }
        String masked = EMAIL.matcher(raw).replaceAll("[EMAIL_REDACTED]");
        return PHONE.matcher(masked).replaceAll("[PHONE_REDACTED]");
    }
}
