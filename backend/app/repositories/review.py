import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Review


async def create(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    resident_id: uuid.UUID,
    rating: int,
    comment: str | None,
    verified_hire: bool = False,
) -> Review:
    review = Review(
        provider_id=provider_id,
        resident_id=resident_id,
        rating=rating,
        comment=comment,
        verified_hire=verified_hire,
    )
    db.add(review)
    await db.flush()
    return review


async def get_by_id(db: AsyncSession, review_id: uuid.UUID) -> Review | None:
    result = await db.execute(
        select(Review).where(Review.id == review_id, Review.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_by_provider_and_resident(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    resident_id: uuid.UUID,
) -> Review | None:
    result = await db.execute(
        select(Review).where(
            Review.provider_id == provider_id,
            Review.resident_id == resident_id,
            Review.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def update_response(
    db: AsyncSession,
    *,
    review: Review,
    response_text: str,
) -> Review:
    review.provider_response = response_text
    review.responded_at = datetime.now(UTC)
    await db.flush()
    return review
