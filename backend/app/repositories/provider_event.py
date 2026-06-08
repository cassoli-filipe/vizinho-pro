import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import ProviderEvent


async def record(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    event_type: str,
    out_of_area: bool = False,
) -> ProviderEvent:
    event = ProviderEvent(
        provider_id=provider_id,
        event_type=event_type,
        out_of_area=out_of_area,
    )
    db.add(event)
    await db.flush()
    return event


async def get_metrics(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    days: int = 30,
) -> dict[str, int]:
    cutoff = datetime.now(UTC) - timedelta(days=days)

    result = await db.execute(
        select(
            func.count()
            .filter(ProviderEvent.event_type == "PROFILE_VIEW")
            .label("profile_views"),
            func.count()
            .filter(ProviderEvent.event_type == "WHATSAPP_CLICK")
            .label("whatsapp_clicks"),
            func.count()
            .filter(
                ProviderEvent.event_type == "WHATSAPP_CLICK",
                ProviderEvent.out_of_area.is_(True),
            )
            .label("out_of_area_clicks"),
        ).where(
            ProviderEvent.provider_id == provider_id,
            ProviderEvent.created_at >= cutoff,
        )
    )
    row = result.one()
    return {
        "profile_views": row.profile_views,
        "whatsapp_clicks": row.whatsapp_clicks,
        "out_of_area_clicks": row.out_of_area_clicks,
    }
