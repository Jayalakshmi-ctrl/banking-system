import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos import (
    CreateCustomerCommand,
    CustomerReadModel,
    UpdateCustomerCommand,
    UpdateKycCommand,
)
from src.application.exceptions import DuplicateCustomerFieldError
from src.domain.enums import KycStatus
from src.domain.models import Customer


def _to_read_model(row: Customer) -> CustomerReadModel:
    return CustomerReadModel(
        customer_id=row.customer_id,
        name=row.name,
        email=row.email,
        phone=row.phone,
        kyc_status=KycStatus(row.kyc_status),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class CustomerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, command: CreateCustomerCommand) -> CustomerReadModel:
        entity = Customer(
            name=command.name,
            email=command.email,
            phone=command.phone,
            kyc_status=command.kyc_status.value,
        )
        self._session.add(entity)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise DuplicateCustomerFieldError("Unique constraint violated") from exc
        await self._session.refresh(entity)
        return _to_read_model(entity)

    async def get_active_by_id(self, customer_id: uuid.UUID) -> CustomerReadModel | None:
        stmt = select(Customer).where(
            Customer.customer_id == customer_id,
            Customer.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return _to_read_model(row)

    async def count_active(self) -> int:
        stmt = select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def list_active_page(
        self,
        *,
        limit: int,
        offset: int,
    ) -> tuple[tuple[CustomerReadModel, ...], int]:
        total = await self.count_active()
        stmt = (
            select(Customer)
            .where(Customer.deleted_at.is_(None))
            .order_by(Customer.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        rows = result.scalars().all()
        return tuple(_to_read_model(r) for r in rows), total

    async def email_conflicts(
        self,
        email: str,
        exclude_customer_id: uuid.UUID | None,
    ) -> bool:
        stmt = select(Customer.customer_id).where(Customer.email == email)
        if exclude_customer_id is not None:
            stmt = stmt.where(Customer.customer_id != exclude_customer_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def phone_conflicts(
        self,
        phone: str,
        exclude_customer_id: uuid.UUID | None,
    ) -> bool:
        stmt = select(Customer.customer_id).where(Customer.phone == phone)
        if exclude_customer_id is not None:
            stmt = stmt.where(Customer.customer_id != exclude_customer_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def update(self, command: UpdateCustomerCommand) -> CustomerReadModel | None:
        existing = await self.get_active_by_id(command.customer_id)
        if existing is None:
            return None
        stmt = (
            update(Customer)
            .where(
                Customer.customer_id == command.customer_id,
                Customer.deleted_at.is_(None),
            )
            .values(
                name=command.name,
                email=command.email,
                phone=command.phone,
                updated_at=datetime.now(timezone.utc),
            )
            .returning(Customer)
        )
        try:
            result = await self._session.execute(stmt)
        except IntegrityError as exc:
            raise DuplicateCustomerFieldError("Unique constraint violated") from exc
        row = result.scalar_one_or_none()
        if row is None:
            return None
        await self._session.refresh(row)
        return _to_read_model(row)

    async def soft_delete(self, customer_id: uuid.UUID) -> bool:
        stmt = (
            update(Customer)
            .where(
                Customer.customer_id == customer_id,
                Customer.deleted_at.is_(None),
            )
            .values(
                deleted_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def update_kyc(self, command: UpdateKycCommand) -> CustomerReadModel | None:
        existing = await self.get_active_by_id(command.customer_id)
        if existing is None:
            return None
        stmt = (
            update(Customer)
            .where(
                Customer.customer_id == command.customer_id,
                Customer.deleted_at.is_(None),
            )
            .values(
                kyc_status=command.new_status.value,
                updated_at=datetime.now(timezone.utc),
            )
            .returning(Customer)
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        await self._session.refresh(row)
        return _to_read_model(row)
