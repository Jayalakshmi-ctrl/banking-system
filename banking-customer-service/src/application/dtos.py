import uuid
from dataclasses import dataclass
from datetime import datetime

from src.domain.enums import KycStatus


@dataclass(frozen=True, slots=True)
class CreateCustomerCommand:
    name: str
    email: str
    phone: str
    kyc_status: KycStatus


@dataclass(frozen=True, slots=True)
class UpdateCustomerCommand:
    customer_id: uuid.UUID
    name: str
    email: str
    phone: str


@dataclass(frozen=True, slots=True)
class UpdateKycCommand:
    customer_id: uuid.UUID
    new_status: KycStatus


@dataclass(frozen=True, slots=True)
class CustomerReadModel:
    customer_id: uuid.UUID
    name: str
    email: str
    phone: str
    kyc_status: KycStatus
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class PaginatedCustomersResult:
    items: tuple[CustomerReadModel, ...]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True, slots=True)
class CustomerListQuery:
    limit: int
    offset: int
