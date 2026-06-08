import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.exceptions import DuplicateReviewError, NotAResidentError, ProfileNotFoundError
from app.schemas.review import CreateReviewRequest
from app.services import review as review_service
from tests.factories import ProfileFactory, ProviderFactory, ReviewFactory


_RESIDENT_ID = uuid.uuid4()
_PROVIDER_ID = uuid.uuid4()


def _review_data() -> CreateReviewRequest:
    return CreateReviewRequest(
        provider_id=_PROVIDER_ID,
        rating=4,
        comment="Ótimo serviço",
    )


@pytest.mark.asyncio
async def test_create_review_success() -> None:
    mock_db = AsyncMock()
    morador = ProfileFactory.build(id=_RESIDENT_ID, user_type="morador")
    review = ReviewFactory.build(provider_id=_PROVIDER_ID, resident_id=_RESIDENT_ID)

    with (
        patch("app.services.review.profile_repo.get_by_id", return_value=morador),
        patch("app.services.review.review_repo.get_by_provider_and_resident", return_value=None),
        patch("app.services.review.review_repo.create", return_value=review),
    ):
        result = await review_service.create_review(
            mock_db, resident_id=_RESIDENT_ID, data=_review_data()
        )

    assert result.provider_id == _PROVIDER_ID


@pytest.mark.asyncio
async def test_create_review_fails_if_resident_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.review.profile_repo.get_by_id", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await review_service.create_review(
                mock_db, resident_id=_RESIDENT_ID, data=_review_data()
            )


@pytest.mark.asyncio
async def test_create_review_fails_if_user_is_prestador() -> None:
    mock_db = AsyncMock()
    prestador = ProfileFactory.build(id=_RESIDENT_ID, user_type="prestador")

    with patch("app.services.review.profile_repo.get_by_id", return_value=prestador):
        with pytest.raises(NotAResidentError):
            await review_service.create_review(
                mock_db, resident_id=_RESIDENT_ID, data=_review_data()
            )
