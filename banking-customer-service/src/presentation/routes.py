import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from src.application.constants import (
    DEFAULT_CUSTOMER_PAGE_LIMIT,
    MAX_CUSTOMER_PAGE_LIMIT,
    MIN_CUSTOMER_PAGE_OFFSET,
)
from src.application.dtos import (
    CreateCustomerCommand,
    CustomerListQuery,
    CustomerReadModel,
    UpdateCustomerCommand,
    UpdateKycCommand,
)
from src.application.exceptions import (
    CustomerNotFoundError,
    DuplicateCustomerFieldError,
    InvalidKycTransitionError,
)
from src.application.services import CustomerService
from src.domain.enums import KycStatus
from src.infrastructure.database import get_db_session
from src.infrastructure.repositories import CustomerRepository
from src.presentation.schemas import (
    CustomerCreateRequest,
    CustomerListEnvelope,
    CustomerResponse,
    CustomerUpdateRequest,
    KycStatusPatchRequest,
    KycStatusResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["customers"])


def _to_response(model: CustomerReadModel) -> CustomerResponse:
    return CustomerResponse(
        customer_id=model.customer_id,
        name=model.name,
        email=model.email,
        phone=model.phone,
        kyc_status=model.kyc_status,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


async def get_customer_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CustomerService:
    return CustomerService(CustomerRepository(session))


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CustomerResponse)
async def create_customer(
    body: CustomerCreateRequest,
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> CustomerResponse:
    kyc = body.kyc_status if body.kyc_status is not None else KycStatus.PENDING
    command = CreateCustomerCommand(
        name=body.name,
        email=str(body.email),
        phone=body.phone,
        kyc_status=kyc,
    )
    created = await service.create_customer(command)
    return _to_response(created)


@router.get("", response_model=CustomerListEnvelope)
async def list_customers(
    service: Annotated[CustomerService, Depends(get_customer_service)],
    limit: int = Query(
        default=DEFAULT_CUSTOMER_PAGE_LIMIT,
        ge=1,
        le=MAX_CUSTOMER_PAGE_LIMIT,
        description="Page size (1–100)",
        examples=[20],
    ),
    offset: int = Query(
        default=MIN_CUSTOMER_PAGE_OFFSET,
        ge=MIN_CUSTOMER_PAGE_OFFSET,
        description="Zero-based row offset",
        examples=[0],
    ),
) -> CustomerListEnvelope:
    page = await service.list_customers(CustomerListQuery(limit=limit, offset=offset))
    return CustomerListEnvelope(
        data=[_to_response(item) for item in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{customer_id}/kyc", response_model=KycStatusResponse)
async def get_kyc(
    customer_id: Annotated[uuid.UUID, Path(description="Customer UUID")],
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> KycStatusResponse:
    status_value = await service.get_kyc_status(customer_id)
    return KycStatusResponse(kyc_status=status_value)


@router.patch("/{customer_id}/kyc", response_model=CustomerResponse)
async def patch_kyc(
    customer_id: uuid.UUID,
    body: KycStatusPatchRequest,
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> CustomerResponse:
    command = UpdateKycCommand(customer_id=customer_id, new_status=body.kyc_status)
    updated = await service.update_kyc_status(command)
    return _to_response(updated)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: uuid.UUID,
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> CustomerResponse:
    row = await service.get_customer(customer_id)
    return _to_response(row)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdateRequest,
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> CustomerResponse:
    command = UpdateCustomerCommand(
        customer_id=customer_id,
        name=body.name,
        email=str(body.email),
        phone=body.phone,
    )
    updated = await service.update_customer(command)
    return _to_response(updated)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: uuid.UUID,
    service: Annotated[CustomerService, Depends(get_customer_service)],
) -> None:
    await service.soft_delete_customer(customer_id)
