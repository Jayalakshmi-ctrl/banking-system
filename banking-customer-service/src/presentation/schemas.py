from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.application.constants import (
    MAX_CUSTOMER_EMAIL_LENGTH,
    MAX_CUSTOMER_NAME_LENGTH,
    MIN_CUSTOMER_NAME_LENGTH,
    PHONE_DIGITS_PATTERN,
)
from src.domain.enums import KycStatus


class CustomerCreateRequest(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Jane Customer",
                "email": "jane.customer@example.com",
                "phone": "9123456789",
                "kyc_status": "PENDING",
            }
        },
    )

    name: str = Field(min_length=MIN_CUSTOMER_NAME_LENGTH, max_length=MAX_CUSTOMER_NAME_LENGTH)
    email: EmailStr = Field(max_length=MAX_CUSTOMER_EMAIL_LENGTH)
    phone: str = Field(pattern=PHONE_DIGITS_PATTERN)
    kyc_status: KycStatus | None = None


class CustomerUpdateRequest(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Jane Customer Updated",
                "email": "jane.updated@example.com",
                "phone": "9234567890",
            }
        },
    )

    name: str = Field(min_length=MIN_CUSTOMER_NAME_LENGTH, max_length=MAX_CUSTOMER_NAME_LENGTH)
    email: EmailStr = Field(max_length=MAX_CUSTOMER_EMAIL_LENGTH)
    phone: str = Field(pattern=PHONE_DIGITS_PATTERN)


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: UUID
    name: str
    email: str
    phone: str
    kyc_status: KycStatus
    created_at: datetime
    updated_at: datetime


class CustomerListEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: list[CustomerResponse]
    total: int
    limit: int
    offset: int


class KycStatusPatchRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"example": {"kyc_status": "VERIFIED"}},
    )

    kyc_status: KycStatus


class KycStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kyc_status: KycStatus


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    version: str


class ProblemDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    title: str
    detail: str
    instance: str
