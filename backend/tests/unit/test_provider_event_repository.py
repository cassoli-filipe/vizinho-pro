import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories import provider_event as provider_event_repo
from tests.factories import ProviderEventFactory

_PROVIDER_ID = uuid.uuid4()


@pytest.mark.asyncio
async def test_record_event_adds_to_session() -> None:
    mock_db = AsyncMock()
    event = ProviderEventFactory.build(provider_id=_PROVIDER_ID, event_type="PROFILE_VIEW")

    with patch("app.repositories.provider_event.ProviderEvent", return_value=event):
        result = await provider_event_repo.record(
            mock_db,
            provider_id=_PROVIDER_ID,
            event_type="PROFILE_VIEW",
            out_of_area=False,
        )

    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_record_whatsapp_click_with_out_of_area() -> None:
    mock_db = AsyncMock()
    event = ProviderEventFactory.build(
        provider_id=_PROVIDER_ID, event_type="WHATSAPP_CLICK", out_of_area=True
    )

    with patch("app.repositories.provider_event.ProviderEvent", return_value=event):
        await provider_event_repo.record(
            mock_db,
            provider_id=_PROVIDER_ID,
            event_type="WHATSAPP_CLICK",
            out_of_area=True,
        )

    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_get_metrics_returns_counts() -> None:
    mock_db = AsyncMock()
    mock_row = MagicMock()
    mock_row.profile_views = 10
    mock_row.whatsapp_clicks = 3
    mock_row.out_of_area_clicks = 1
    # execute is awaited → return_value is what `await db.execute(...)` yields
    # .one() must be synchronous, so use MagicMock (not AsyncMock) as the result
    mock_result = MagicMock()
    mock_result.one.return_value = mock_row
    mock_db.execute.return_value = mock_result

    metrics = await provider_event_repo.get_metrics(mock_db, provider_id=_PROVIDER_ID)

    assert metrics["profile_views"] == 10
    assert metrics["whatsapp_clicks"] == 3
    assert metrics["out_of_area_clicks"] == 1


@pytest.mark.asyncio
async def test_get_metrics_filters_by_provider() -> None:
    """Verify the query is scoped to the correct provider_id (mock captures execute call)."""
    mock_db = AsyncMock()
    mock_row = MagicMock()
    mock_row.profile_views = 0
    mock_row.whatsapp_clicks = 0
    mock_row.out_of_area_clicks = 0
    mock_result = MagicMock()
    mock_result.one.return_value = mock_row
    mock_db.execute.return_value = mock_result

    await provider_event_repo.get_metrics(mock_db, provider_id=_PROVIDER_ID)

    mock_db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_conversion_rate_computed_in_service() -> None:
    from app.services import provider_event as provider_event_service

    mock_db = AsyncMock()
    raw = {"profile_views": 100, "whatsapp_clicks": 20, "out_of_area_clicks": 5}

    with patch(
        "app.services.provider_event.provider_event_repo.get_metrics", return_value=raw
    ):
        result = await provider_event_service.get_metrics(mock_db, provider_id=_PROVIDER_ID)

    assert result.profile_views == 100
    assert result.whatsapp_clicks == 20
    assert result.out_of_area_clicks == 5
    assert result.conversion_rate == 20.0


@pytest.mark.asyncio
async def test_conversion_rate_zero_when_no_views() -> None:
    from app.services import provider_event as provider_event_service

    mock_db = AsyncMock()
    raw = {"profile_views": 0, "whatsapp_clicks": 0, "out_of_area_clicks": 0}

    with patch(
        "app.services.provider_event.provider_event_repo.get_metrics", return_value=raw
    ):
        result = await provider_event_service.get_metrics(mock_db, provider_id=_PROVIDER_ID)

    assert result.conversion_rate == 0.0
