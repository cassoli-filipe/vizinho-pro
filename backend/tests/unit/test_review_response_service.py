import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.exceptions import NotAProviderError, ReviewNotFoundError
from app.schemas.review import RespondToReviewRequest
from app.services import review as review_service
from tests.factories import ReviewFactory

_PROVIDER_ID = uuid.uuid4()
_REVIEW_ID = uuid.uuid4()


def _response_data(text: str = "Obrigado pela avaliação.") -> RespondToReviewRequest:
    return RespondToReviewRequest(response=text)


@pytest.mark.asyncio
async def test_respond_to_review_success() -> None:
    mock_db = AsyncMock()
    review = ReviewFactory.build(id=_REVIEW_ID, provider_id=_PROVIDER_ID)
    updated = ReviewFactory.build(
        id=_REVIEW_ID,
        provider_id=_PROVIDER_ID,
        provider_response="Obrigado pela avaliação.",
    )

    with (
        patch("app.services.review.review_repo.get_by_id", return_value=review),
        patch("app.services.review.review_repo.update_response", return_value=updated),
    ):
        result = await review_service.respond_to_review(
            mock_db,
            review_id=_REVIEW_ID,
            provider_id=_PROVIDER_ID,
            data=_response_data(),
        )

    assert result.provider_response == "Obrigado pela avaliação."


@pytest.mark.asyncio
async def test_edit_response_overwrites_previous() -> None:
    mock_db = AsyncMock()
    review = ReviewFactory.build(
        id=_REVIEW_ID,
        provider_id=_PROVIDER_ID,
        provider_response="Resposta antiga",
    )
    updated = ReviewFactory.build(
        id=_REVIEW_ID,
        provider_id=_PROVIDER_ID,
        provider_response="Resposta nova",
    )

    with (
        patch("app.services.review.review_repo.get_by_id", return_value=review),
        patch("app.services.review.review_repo.update_response", return_value=updated),
    ):
        result = await review_service.respond_to_review(
            mock_db,
            review_id=_REVIEW_ID,
            provider_id=_PROVIDER_ID,
            data=_response_data("Resposta nova"),
        )

    assert result.provider_response == "Resposta nova"


@pytest.mark.asyncio
async def test_respond_fails_if_review_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.review.review_repo.get_by_id", return_value=None):
        with pytest.raises(ReviewNotFoundError):
            await review_service.respond_to_review(
                mock_db,
                review_id=_REVIEW_ID,
                provider_id=_PROVIDER_ID,
                data=_response_data(),
            )


@pytest.mark.asyncio
async def test_respond_fails_if_wrong_provider() -> None:
    mock_db = AsyncMock()
    other_provider_id = uuid.uuid4()
    review = ReviewFactory.build(id=_REVIEW_ID, provider_id=other_provider_id)

    with patch("app.services.review.review_repo.get_by_id", return_value=review):
        with pytest.raises(NotAProviderError):
            await review_service.respond_to_review(
                mock_db,
                review_id=_REVIEW_ID,
                provider_id=_PROVIDER_ID,
                data=_response_data(),
            )


def test_respond_fails_if_response_empty() -> None:
    with pytest.raises(Exception):
        RespondToReviewRequest(response="")


def test_respond_fails_if_response_whitespace_only() -> None:
    with pytest.raises(Exception):
        RespondToReviewRequest(response="   ")


def test_respond_fails_if_response_too_long() -> None:
    with pytest.raises(Exception):
        RespondToReviewRequest(response="x" * 1001)
