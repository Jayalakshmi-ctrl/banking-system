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
            "name": "id",
            "in": "path",
            "type": "string",
            "required": True,
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
                    "recipient_email": {"type": "string"},
                    "recipient_phone": {"type": "string"},
                    "channel": {"type": "string", "enum": ["EMAIL", "SMS"]},
                    "event_type": {
                        "type": "string",
                        "enum": ["TRANSACTION_ALERT", "ACCOUNT_STATUS_CHANGE"],
                    },
                    "payload": {"type": "object"},
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
