import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import factory
import pytest

from src.application.constants import MAX_CUSTOMER_PAGE_LIMIT
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
from src.infrastructure.pii import mask_email, mask_phone
from src.infrastructure.repositories import CustomerRepository


class CreateCustomerCommandFactory(factory.Factory):
    class Meta:
        model = CreateCustomerCommand

    name = factory.Sequence(lambda n: f"Factory User {n}")
    email = factory.LazyAttribute(lambda o: f"factory.user.{o.name.split()[-1]}@example.com")
    phone = factory.Sequence(lambda n: f"9{100000000 + n:09d}")
    kyc_status = KycStatus.PENDING


def _sample_read_model() -> CustomerReadModel:
    now = datetime.now(timezone.utc)
    return CustomerReadModel(
        customer_id=uuid.uuid4(),
        name="Test User",
        email="test.user@example.com",
        phone="9123456789",
        kyc_status=KycStatus.PENDING,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_create_customer_success_persists_masked_logging_path() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    repo.email_conflicts = AsyncMock(return_value=False)
    repo.phone_conflicts = AsyncMock(return_value=False)
    model = _sample_read_model()
    repo.create = AsyncMock(return_value=model)
    service = CustomerService(repo)
    command = CreateCustomerCommandFactory.build(
        name=model.name,
        email=model.email,
        phone=model.phone,
    )

    result = await service.create_customer(command)

    assert result.customer_id == model.customer_id
    repo.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_customer_duplicate_email_raises() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    repo.email_conflicts = AsyncMock(return_value=True)
    repo.phone_conflicts = AsyncMock(return_value=False)
    service = CustomerService(repo)
    command = CreateCustomerCommand(
        name="A",
        email="a@example.com",
        phone="9123456789",
        kyc_status=KycStatus.PENDING,
    )

    with pytest.raises(DuplicateCustomerFieldError):
        await service.create_customer(command)


@pytest.mark.asyncio
async def test_get_customer_not_found_raises() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    repo.get_active_by_id = AsyncMock(return_value=None)
    service = CustomerService(repo)
    cid = uuid.uuid4()

    with pytest.raises(CustomerNotFoundError):
        await service.get_customer(cid)


@pytest.mark.asyncio
async def test_list_customers_clamps_limit() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    repo.list_active_page = AsyncMock(return_value=((), 0))
    service = CustomerService(repo)

    await service.list_customers(CustomerListQuery(limit=9999, offset=0))

    repo.list_active_page.assert_awaited_once()
    call_kw = repo.list_active_page.await_args.kwargs
    assert call_kw["limit"] == MAX_CUSTOMER_PAGE_LIMIT


@pytest.mark.asyncio
async def test_update_kyc_invalid_transition_raises() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    verified = _sample_read_model()
    verified = CustomerReadModel(
        customer_id=verified.customer_id,
        name=verified.name,
        email=verified.email,
        phone=verified.phone,
        kyc_status=KycStatus.VERIFIED,
        created_at=verified.created_at,
        updated_at=verified.updated_at,
    )
    repo.get_active_by_id = AsyncMock(return_value=verified)
    service = CustomerService(repo)
    command = UpdateKycCommand(customer_id=verified.customer_id, new_status=KycStatus.REJECTED)

    with pytest.raises(InvalidKycTransitionError):
        await service.update_kyc_status(command)


@pytest.mark.asyncio
async def test_update_kyc_pending_to_verified_succeeds() -> None:
    repo = AsyncMock(spec=CustomerRepository)
    pending = _sample_read_model()
    verified = CustomerReadModel(
        customer_id=pending.customer_id,
        name=pending.name,
        email=pending.email,
        phone=pending.phone,
        kyc_status=KycStatus.VERIFIED,
        created_at=pending.created_at,
        updated_at=pending.updated_at,
    )
    repo.get_active_by_id = AsyncMock(return_value=pending)
    repo.update_kyc = AsyncMock(return_value=verified)
    service = CustomerService(repo)
    command = UpdateKycCommand(customer_id=pending.customer_id, new_status=KycStatus.VERIFIED)

    result = await service.update_kyc_status(command)

    assert result.kyc_status == KycStatus.VERIFIED


def test_mask_email_and_phone_formats() -> None:
    assert mask_email("vivaan.khan90@inbox.com") == "vi***@inbox.com"
    assert mask_phone("9288355015") == "92****5015"
