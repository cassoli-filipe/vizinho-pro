# app/api/v1/endpoints/reviews.py
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DbSession
from app.domain.exceptions import (
    DuplicateReviewError,
    NotAProviderError,
    NotAResidentError,
    ProfileNotFoundError,
    ReviewNotFoundError,
)
from app.schemas.review import CreateReviewRequest, RespondToReviewRequest, ReviewResponse
from app.services import review as review_service

router = APIRouter(prefix="/reviews")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ReviewResponse)
async def create_review(
    body: CreateReviewRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewResponse:
    resident_id = uuid.UUID(current_user["sub"])
    try:
        review = await review_service.create_review(db, resident_id=resident_id, data=body)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")
    except NotAResidentError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Somente moradores podem avaliar prestadores",
        )
    except DuplicateReviewError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Você já avaliou este prestador",
        )

    await db.refresh(review, ["resident"])
    return ReviewResponse(
        id=review.id,
        provider_id=review.provider_id,
        resident_full_name=review.resident.full_name,
        rating=review.rating,
        comment=review.comment,
        verified_hire=review.verified_hire,
        provider_response=review.provider_response,
        responded_at=review.responded_at,
        created_at=review.created_at,
    )


@router.patch("/{review_id}/response", status_code=status.HTTP_200_OK, response_model=ReviewResponse)
async def respond_to_review(
    review_id: uuid.UUID,
    body: RespondToReviewRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewResponse:
    provider_id = uuid.UUID(current_user["sub"])
    try:
        review = await review_service.respond_to_review(
            db, review_id=review_id, provider_id=provider_id, data=body
        )
    except ReviewNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Avaliação não encontrada")
    except NotAProviderError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para responder esta avaliação",
        )

    await db.refresh(review, ["resident"])
    return ReviewResponse(
        id=review.id,
        provider_id=review.provider_id,
        resident_full_name=review.resident.full_name,
        rating=review.rating,
        comment=review.comment,
        verified_hire=review.verified_hire,
        provider_response=review.provider_response,
        responded_at=review.responded_at,
        created_at=review.created_at,
    )
