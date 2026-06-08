import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import provider_event as provider_event_repo
from app.schemas.provider_event import ProviderMetricsResponse

PROFILE_VIEW = "PROFILE_VIEW"
WHATSAPP_CLICK = "WHATSAPP_CLICK"


async def record_event(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    event_type: str,
    out_of_area: bool = False,
) -> None:
    await provider_event_repo.record(
        db, provider_id=provider_id, event_type=event_type, out_of_area=out_of_area
    )


async def get_metrics(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
) -> ProviderMetricsResponse:
    raw = await provider_event_repo.get_metrics(db, provider_id=provider_id)
    profile_views = raw["profile_views"]
    whatsapp_clicks = raw["whatsapp_clicks"]
    out_of_area_clicks = raw["out_of_area_clicks"]
    conversion_rate = (
        round(whatsapp_clicks / profile_views * 100, 2) if profile_views > 0 else 0.0
    )
    return ProviderMetricsResponse(
        profile_views=profile_views,
        whatsapp_clicks=whatsapp_clicks,
        out_of_area_clicks=out_of_area_clicks,
        conversion_rate=conversion_rate,
    )
