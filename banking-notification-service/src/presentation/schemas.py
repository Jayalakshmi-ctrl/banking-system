from __future__ import annotations

NOTIFICATION_LIST_SWAGGER = {
    "tags": ["Notifications"],
    "parameters": [
        {
            "name": "limit",
            "in": "query",
            "type": "integer",
            "required": False,
            "default": 20,
        },
        {
            "name": "offset",
            "in": "query",
            "type": "integer",
            "required": False,
            "default": 0,
        },
    ],
    "responses": {
        "200": {
            "description": "Paginated notifications",
            "schema": {
                "type": "object",
                "properties": {
                    "data": {"type": "array"},
                    "total": {"type": "integer"},
                    "limit": {"type": "integer"},
                    "offset": {"type": "integer"},
                },
            },
        },
        "400": {"description": "Invalid pagination"},
    },
}

NOTIFICATION_GET_SWAGGER = {
    "tags": ["Notifications"],
    "parameters": [
        {
            "name": "notification_id",
            "in": "path",
            "type": "string",
            "required": True,
            "description": "UUID of the notification (must match route /api/v1/notifications/{notification_id})",
        }
    ],
    "responses": {
        "200": {"description": "Notification found"},
        "404": {"description": "Not found"},
    },
}

INTERNAL_SEND_SWAGGER = {
    "tags": ["Internal"],
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "required": [
                    "recipient_email",
                    "recipient_phone",
                    "channel",
                    "event_type",
                    "payload",
                ],
                "properties": {
                    "recipient_email": {
                        "type": "string",
                        "format": "email",
                        "example": "customer@example.com",
                    },
                    "recipient_phone": {
                        "type": "string",
                        "example": "9123456789",
                        "description": "Digits-only phone for SMS when channel is SMS",
                    },
                    "channel": {
                        "type": "string",
                        "enum": ["EMAIL", "SMS"],
                        "example": "EMAIL",
                    },
                    "event_type": {
                        "type": "string",
                        "enum": ["TRANSACTION_ALERT", "ACCOUNT_STATUS_CHANGE"],
                        "example": "TRANSACTION_ALERT",
                    },
                    "payload": {
                        "type": "object",
                        "example": {
                            "amount": "50000.00",
                            "currency": "INR",
                            "reference": "TXN-REF-001",
                        },
                    },
                },
                "example": {
                    "recipient_email": "customer@example.com",
                    "recipient_phone": "9123456789",
                    "channel": "EMAIL",
                    "event_type": "TRANSACTION_ALERT",
                    "payload": {
                        "amount": "50000.00",
                        "currency": "INR",
                        "reference": "TXN-REF-001",
                    },
                },
            },
        }
    ],
    "responses": {
        "201": {"description": "Notification accepted"},
        "422": {"description": "Validation error"},
    },
}

HEALTH_SWAGGER = {
    "tags": ["Health"],
    "responses": {"200": {"description": "Healthy"}, "503": {"description": "Unhealthy"}},
}

METRICS_SWAGGER = {
    "tags": ["Observability"],
    "responses": {"200": {"description": "Prometheus text exposition"}},
}
