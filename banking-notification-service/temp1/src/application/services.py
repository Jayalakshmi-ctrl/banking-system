import uuid

import structlog

from src.application.constants import (
    DEFAULT_CUSTOMER_PAGE_LIMIT,
    MAX_CUSTOMER_PAGE_LIMIT,
    MIN_CUSTOMER_PAGE_OFFSET,
)
from src.application.dtos import (
    CreateCustomerCommand,
    CustomerListQuery,
    CustomerReadModel,
    PaginatedCustomersResult,
    UpdateCustomerCommand,
    UpdateKycCommand,
)
from src.application.exceptions import (
    CustomerNotFoundError,
    DuplicateCustomerFieldError,
    InvalidKycTransitionError,
)
from src.domain.enums import KycStatus
from src.infrastructure.pii import mask_email, mask_phone
from src.infrastructure.repositories import CustomerRepository

logger = structlog.get_logger(__name__)


class CustomerService:
    def __init__(self, repository: CustomerRepository) -> None:
        self._repository = repository

    async def create_customer(self, command: CreateCustomerCommand) -> CustomerReadModel:
        if await self._repository.email_conflicts(command.email, None):
            raise DuplicateCustomerFieldError("Email already in use")
        if await self._repository.phone_conflicts(command.phone, None):
            raise DuplicateCustomerFieldError("Phone already in use")
        created = await self._repository.create(command)
        logger.info(
            "customer_created",
            customer_id=str(created.customer_id),
            email=mask_email(created.email),
            phone=mask_phone(created.phone),
        )
        return created

    async def get_customer(self, customer_id: uuid.UUID) -> CustomerReadModel:
        row = await self._repository.get_active_by_id(customer_id)
        if row is None:
            raise CustomerNotFoundError()
        return row

    async def list_customers(self, query: CustomerListQuery) -> PaginatedCustomersResult:
        limit = query.limit if query.limit > 0 else DEFAULT_CUSTOMER_PAGE_LIMIT
        limit = min(limit, MAX_CUSTOMER_PAGE_LIMIT)
        offset = query.offset if query.offset >= MIN_CUSTOMER_PAGE_OFFSET else MIN_CUSTOMER_PAGE_OFFSET
        items, total = await self._repository.list_active_page(limit=limit, offset=offset)
        return PaginatedCustomersResult(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    async def update_customer(self, command: UpdateCustomerCommand) -> CustomerReadModel:
        if await self._repository.email_conflicts(command.email, command.customer_id):
            raise DuplicateCustomerFieldError("Email already in use")
        if await self._repository.phone_conflicts(command.phone, command.customer_id):
            raise DuplicateCustomerFieldError("Phone already in use")
        updated = await self._repository.update(command)
        if updated is None:
            raise CustomerNotFoundError()
        logger.info(
            "customer_updated",
            customer_id=str(updated.customer_id),
            email=mask_email(updated.email),
            phone=mask_phone(updated.phone),
        )
        return updated

    async def soft_delete_customer(self, customer_id: uuid.UUID) -> None:
        deleted = await self._repository.soft_delete(customer_id)
        if not deleted:
            raise CustomerNotFoundError()
        logger.info("customer_soft_deleted", customer_id=str(customer_id))

    async def update_kyc_status(self, command: UpdateKycCommand) -> CustomerReadModel:
        current = await self._repository.get_active_by_id(command.customer_id)
        if current is None:
            raise CustomerNotFoundError()
        if current.kyc_status != KycStatus.PENDING:
            raise InvalidKycTransitionError("KYC can only change from PENDING")
        if command.new_status not in (KycStatus.VERIFIED, KycStatus.REJECTED):
            raise InvalidKycTransitionError("Invalid target KYC status")
        updated = await self._repository.update_kyc(command)
        if updated is None:
            raise CustomerNotFoundError()
        logger.info(
            "customer_kyc_updated",
            customer_id=str(updated.customer_id),
            kyc_status=updated.kyc_status.value,
        )
        return updated

    async def get_kyc_status(self, customer_id: uuid.UUID) -> KycStatus:
        current = await self._repository.get_active_by_id(customer_id)
        if current is None:
            raise CustomerNotFoundError()
        return current.kyc_status
