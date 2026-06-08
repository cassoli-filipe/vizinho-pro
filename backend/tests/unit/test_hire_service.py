import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.exceptions import NotAResidentError, ProfileNotFoundError
from app.schemas.hire import CreateHireRequest
from app.services import hire as hire_service
from tests.factories import HireFactory, ProfileFactory

_RESIDENT_ID = uuid.uuid4()
_PROVIDER_ID = uuid.uuid4()


def _hire_data(estimated_value: Decimal | None = Decimal("350.00")) -> CreateHireRequest:
    return CreateHireRequest(provider_id=_PROVIDER_ID, estimated_value=estimated_value)


@pytest.mark.asyncio
async def test_create_hire_manual_success() -> None:
    mock_db = AsyncMock()
    morador = ProfileFactory.build(id=_RESIDENT_ID, user_type="morador")

    with (
        patch("app.services.hire.profile_repo.get_by_id", return_value=morador),
        patch("app.services.hire.hire_repo.create", return_value=None) as mock_create,
    ):
        await hire_service.create_hire(mock_db, resident_id=_RESIDENT_ID, data=_hire_data())

    mock_create.assert_awaited_once()
    _, kwargs = mock_create.call_args
    assert kwargs["source_type"] == "MANUAL"
    assert kwargs["estimated_value"] == Decimal("350.00")


@pytest.mark.asyncio
async def test_create_hire_fails_if_profile_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.hire.profile_repo.get_by_id", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await hire_service.create_hire(mock_db, resident_id=_RESIDENT_ID, data=_hire_data())


@pytest.mark.asyncio
async def test_create_hire_fails_if_prestador() -> None:
    mock_db = AsyncMock()
    prestador = ProfileFactory.build(id=_RESIDENT_ID, user_type="prestador")

    with patch("app.services.hire.profile_repo.get_by_id", return_value=prestador):
        with pytest.raises(NotAResidentError):
            await hire_service.create_hire(mock_db, resident_id=_RESIDENT_ID, data=_hire_data())


@pytest.mark.asyncio
async def test_ensure_hire_exists_creates_from_review() -> None:
    mock_db = AsyncMock()

    with patch("app.services.hire.hire_repo.ensure_exists") as mock_ensure:
        await hire_service.ensure_hire_exists(
            mock_db, resident_id=_RESIDENT_ID, provider_id=_PROVIDER_ID
        )

    mock_ensure.assert_awaited_once()
    _, kwargs = mock_ensure.call_args
    assert kwargs["source_type"] == "REVIEW"


@pytest.mark.asyncio
async def test_ensure_hire_exists_does_not_duplicate() -> None:
    """ensure_exists at repo level avoids creating a second record when one already exists."""
    mock_db = AsyncMock()

    with (
        patch("app.repositories.hire.exists_for_pair", return_value=True),
        patch("app.repositories.hire.Hire") as MockHire,
    ):
        from app.repositories import hire as hire_repo

        await hire_repo.ensure_exists(
            mock_db,
            resident_id=_RESIDENT_ID,
            provider_id=_PROVIDER_ID,
            source_type="REVIEW",
        )

    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_list_hires_paginates() -> None:
    from datetime import UTC, datetime

    mock_db = AsyncMock()
    now = datetime.now(UTC)

    fake_row = type(
        "Row",
        (),
        {
            "id": _RESIDENT_ID,
            "provider_id": _PROVIDER_ID,
            "hired_at": now,
            "estimated_value": None,
            "source_type": "MANUAL",
            "created_at": now,
            "business_name": "Elétrica Silva",
            "category": "eletricista",
            "review_count": 0,
        },
    )()

    with patch("app.services.hire.hire_repo.get_for_resident", return_value=([fake_row], 1)):
        result = await hire_service.list_hires(
            mock_db, resident_id=_RESIDENT_ID, page=1, limit=20
        )

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].has_review is False
