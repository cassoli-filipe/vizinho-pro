import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domain.exceptions import ProfileNotFoundError
from app.schemas.provider import ProviderSearchParams
from app.services import provider as provider_service


_PROVIDER_ID = uuid.uuid4()


def _make_search_row(**kwargs):
    defaults = {
        "id": _PROVIDER_ID,
        "business_name": "Elétrica SP",
        "category": "eletricista",
        "description": None,
        "center_lat": -23.55,
        "center_lng": -46.63,
        "radius_km": 10.0,
        "subscription_status": "active",
        "full_name": "João Silva",
        "avg_rating": 4.5,
        "review_count": 3,
        "distance_m": 500.0,
    }
    defaults.update(kwargs)
    row = MagicMock()
    for k, v in defaults.items():
        setattr(row, k, v)
    return row


@pytest.mark.asyncio
async def test_search_returns_paginated_result() -> None:
    mock_db = AsyncMock()
    params = ProviderSearchParams(lat=-23.55, lng=-46.63)
    rows = [_make_search_row()]

    with patch("app.services.provider.provider_repo.search", return_value=(rows, 1)):
        result = await provider_service.search(mock_db, params=params)

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].business_name == "Elétrica SP"
    assert result.items[0].distance_km == pytest.approx(0.5)


@pytest.mark.asyncio
async def test_search_empty_returns_empty_page() -> None:
    mock_db = AsyncMock()
    params = ProviderSearchParams(lat=-23.55, lng=-46.63)

    with patch("app.services.provider.provider_repo.search", return_value=([], 0)):
        result = await provider_service.search(mock_db, params=params)

    assert result.total == 0
    assert result.items == []


@pytest.mark.asyncio
async def test_get_detail_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.provider.provider_repo.get_by_id", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await provider_service.get_detail(mock_db, provider_id=_PROVIDER_ID)


@pytest.mark.asyncio
async def test_update_provider_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.provider.provider_repo.update", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await provider_service.update_provider(
                mock_db, provider_id=_PROVIDER_ID, data=MagicMock()
            )
