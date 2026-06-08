import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserType
from app.domain.exceptions import NotAResidentError, ProfileNotFoundError
from app.repositories import hire as hire_repo
from app.repositories import profile as profile_repo
from app.schemas.hire import CreateHireRequest, HireItem, PaginatedHires


async def create_hire(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    data: CreateHireRequest,
) -> None:
    profile = await profile_repo.get_by_id(db, resident_id)
    if profile is None:
        raise ProfileNotFoundError("Perfil não encontrado")
    if profile.user_type != UserType.MORADOR:
        raise NotAResidentError("Somente moradores podem registrar contratações")

    await hire_repo.create(
        db,
        resident_id=resident_id,
        provider_id=data.provider_id,
        source_type="MANUAL",
        estimated_value=data.estimated_value,
    )


async def ensure_hire_exists(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    provider_id: uuid.UUID,
) -> None:
    await hire_repo.ensure_exists(
        db,
        resident_id=resident_id,
        provider_id=provider_id,
        source_type="REVIEW",
    )


async def list_hires(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    page: int,
    limit: int,
) -> PaginatedHires:
    rows, total = await hire_repo.get_for_resident(
        db, resident_id=resident_id, page=page, limit=limit
    )
    items = [
        HireItem(
            id=row.id,
            provider_id=row.provider_id,
            provider_business_name=row.business_name,
            provider_category=row.category,
            hired_at=row.hired_at,
            estimated_value=row.estimated_value,
            source_type=row.source_type,
            has_review=row.review_count > 0,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return PaginatedHires(items=items, total=total, page=page, page_size=limit)
