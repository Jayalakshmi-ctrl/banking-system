import argparse
import asyncio
import csv
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from src.domain.enums import KycStatus
from src.domain.models import Customer
from src.infrastructure.database import get_session_factory

SEED_NAMESPACE = uuid.NAMESPACE_URL
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def _parse_row(row: dict[str, str]) -> Customer:
    raw_id = row["customer_id"].strip()
    customer_id = uuid.uuid5(SEED_NAMESPACE, f"https://banking.internal/seed/customer/{raw_id}")
    created_at = datetime.strptime(row["created_at"].strip(), DATETIME_FORMAT).replace(
        tzinfo=timezone.utc,
    )
    kyc = KycStatus(row["kyc_status"].strip().upper())
    return Customer(
        customer_id=customer_id,
        name=row["name"].strip(),
        email=row["email"].strip(),
        phone=row["phone"].strip(),
        kyc_status=kyc.value,
        created_at=created_at,
        updated_at=created_at,
        deleted_at=None,
    )


async def run_seed(csv_path: Path) -> int:
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    factory = get_session_factory()
    rows: list[dict[str, str]] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)

    inserted = 0
    async with factory() as session:
        for row in rows:
            entity = _parse_row(row)
            stmt = pg_insert(Customer).values(
                customer_id=entity.customer_id,
                name=entity.name,
                email=entity.email,
                phone=entity.phone,
                kyc_status=entity.kyc_status,
                created_at=entity.created_at,
                updated_at=entity.updated_at,
                deleted_at=entity.deleted_at,
            ).on_conflict_do_nothing(index_elements=["customer_id"])
            result = await session.execute(stmt)
            if result.rowcount:
                inserted += 1
        await session.commit()
    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed customers from CSV into PostgreSQL")
    parser.add_argument(
        "csv_path",
        nargs="?",
        default=str(
            Path(__file__).resolve().parents[2] / "bank_Dataset" / "bank_customers.csv",
        ),
        help="Path to bank_customers.csv",
    )
    args = parser.parse_args()
    path = Path(args.csv_path)
    if not path.is_file():
        print(f"CSV not found: {path}", file=sys.stderr)
        sys.exit(1)
    count = asyncio.run(run_seed(path))
    print(f"Seeded {count} customers")


if __name__ == "__main__":
    main()
