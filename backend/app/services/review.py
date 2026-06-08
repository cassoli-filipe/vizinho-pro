import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserType
from app.domain.exceptions import (
    DuplicateReviewError,
    NotAProviderError,
    NotAResidentError,
    ProfileNotFoundError,
    ReviewNotFoundError,
)
from app.domain.models import Review
from app.repositories import hire as hire_repo
from app.repositories import profile as profile_repo
from app.repositories import review as review_repo
from app.schemas.review import CreateReviewRequest, RespondToReviewRequest


async def create_review(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    data: CreateReviewRequest,
) -> Review:
    profile = await profile_repo.get_by_id(db, resident_id)
    if profile is None:
        raise ProfileNotFoundError("Perfil não encontrado")
    if profile.user_type != UserType.MORADOR:
        raise NotAResidentError("Somente moradores podem avaliar prestadores")

    existing = await review_repo.get_by_provider_and_resident(
        db, provider_id=data.provider_id, resident_id=resident_id
    )
    if existing is not None:
        raise DuplicateReviewError("Você já avaliou este prestador")

    hire_exists = await hire_repo.exists_for_pair(
        db, resident_id=resident_id, provider_id=data.provider_id
    )
    verified_hire = hire_exists

    review = await review_repo.create(
        db,
        provider_id=data.provider_id,
        resident_id=resident_id,
        rating=data.rating,
        comment=data.comment,
        verified_hire=verified_hire,
    )

    if verified_hire:
        await hire_repo.ensure_exists(
            db,
            resident_id=resident_id,
            provider_id=data.provider_id,
            source_type="REVIEW",
        )

    return review


async def respond_to_review(
    db: AsyncSession,
    *,
    review_id: uuid.UUID,
    provider_id: uuid.UUID,
    data: RespondToReviewRequest,
) -> Review:
    review = await review_repo.get_by_id(db, review_id)
    if review is None:
        raise ReviewNotFoundError("Avaliação não encontrada")
    if review.provider_id != provider_id:
        raise NotAProviderError("Você não tem permissão para responder esta avaliação")

    return await review_repo.update_response(db, review=review, response_text=data.response)
