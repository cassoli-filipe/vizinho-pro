import pytest
from unittest.mock import AsyncMock, MagicMock
from app.repositories import provider as provider_repo
from app.domain.enums import ServiceCategory


@pytest.mark.asyncio
async def test_search_providers_applies_filters() -> None:
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_result.scalar_one.return_value = 0
    mock_db.execute.return_value = mock_result

    rows, total = await provider_repo.search(
        mock_db,
        lat=-23.55,
        lng=-46.63,
        radius_km=10.0,
        category=None,
        page=1,
        page_size=20,
    )

    assert rows == []
    assert total == 0
    assert mock_db.execute.call_count == 1  # only count query; total=0 skips data query
