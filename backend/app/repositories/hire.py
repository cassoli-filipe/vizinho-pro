import uuid
from decimal import Decimal

from sqlalchemy import Row, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Hire, Provider, Review


async def create(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    provider_id: uuid.UUID,
    source_type: str,
    estimated_value: Decimal | None = None,
) -> Hire:
    hire = Hire(
        resident_id=resident_id,
        provider_id=provider_id,
        source_type=source_type,
        estimated_value=estimated_value,
    )
    db.add(hire)
    await db.flush()
    return hire


async def exists_for_pair(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    provider_id: uuid.UUID,
) -> bool:
    result = await db.execute(
        select(Hire.id)
        .where(Hire.resident_id == resident_id, Hire.provider_id == provider_id)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def ensure_exists(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    provider_id: uuid.UUID,
    source_type: str,
) -> None:
    """Create a hire record only if none exists for this (resident, provider) pair."""
    already_exists = await exists_for_pair(db, resident_id=resident_id, provider_id=provider_id)
    if not already_exists:
        hire = Hire(
            resident_id=resident_id,
            provider_id=provider_id,
            source_type=source_type,
        )
        db.add(hire)
        await db.flush()


async def get_for_resident(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Row], int]:
    base_filter = Hire.resident_id == resident_id

    count_result = await db.execute(
        select(func.count(Hire.id)).where(base_filter)
    )
    total: int = count_result.scalar_one()

    if total == 0:
        return [], 0

    stmt = (
        select(
            Hire.id,
            Hire.provider_id,
            Hire.hired_at,
            Hire.estimated_value,
            Hire.source_type,
            Hire.created_at,
            Provider.business_name,
            Provider.category,
            func.count(Review.id).label("review_count"),
        )
        .join(Provider, Provider.id == Hire.provider_id)
        .outerjoin(
            Review,
            (Review.provider_id == Hire.provider_id)
            & (Review.resident_id == Hire.resident_id)
            & Review.deleted_at.is_(None),
        )
        .where(base_filter)
        .group_by(
            Hire.id,
            Hire.provider_id,
            Hire.hired_at,
            Hire.estimated_value,
            Hire.source_type,
            Hire.created_at,
            Provider.business_name,
            Provider.category,
        )
        .order_by(Hire.hired_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return rows, total
