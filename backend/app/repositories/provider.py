import uuid
from typing import Any

from geoalchemy2.elements import WKTElement
from geoalchemy2.types import Geography
from sqlalchemy import Row, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ServiceCategory, SubscriptionStatus
from app.domain.models import Profile, Provider, Review

_GEOG = Geography(srid=4326)

# Sentinel used to distinguish "field not provided" from "field set to None"
_UNSET: Any = object()


async def create(
    db: AsyncSession,
    *,
    id: uuid.UUID,
    business_name: str,
    category: ServiceCategory,
    description: str | None,
    center_lat: float,
    center_lng: float,
    radius_km: float,
    contact_whatsapp: str | None = None,
    experience_years: int | None = None,
    services: list[str] | None = None,
) -> Provider:
    location = WKTElement(f"POINT({center_lng} {center_lat})", srid=4326)
    provider = Provider(
        id=id,
        business_name=business_name,
        category=category,
        description=description,
        center_lat=center_lat,
        center_lng=center_lng,
        radius_km=radius_km,
        location=location,
        subscription_status=SubscriptionStatus.ACTIVE,
        contact_whatsapp=contact_whatsapp,
        experience_years=experience_years,
        services=services,
    )
    db.add(provider)
    await db.flush()
    return provider


_PROVIDER_DETAIL_COLUMNS = [
    Provider.id,
    Provider.business_name,
    Provider.category,
    Provider.description,
    Provider.center_lat,
    Provider.center_lng,
    Provider.radius_km,
    Provider.subscription_status,
    Provider.contact_whatsapp,
    Provider.experience_years,
    Provider.services,
    Profile.full_name,
    Profile.phone,
    Profile.email,
    func.avg(Review.rating).label("avg_rating"),
    func.count(Review.id).label("review_count"),
]

_PROVIDER_DETAIL_GROUP_BY = [
    Provider.id,
    Provider.business_name,
    Provider.category,
    Provider.description,
    Provider.center_lat,
    Provider.center_lng,
    Provider.radius_km,
    Provider.subscription_status,
    Provider.contact_whatsapp,
    Provider.experience_years,
    Provider.services,
    Profile.full_name,
    Profile.phone,
    Profile.email,
]


async def get_by_id(db: AsyncSession, provider_id: uuid.UUID) -> Row | None:
    """Return a provider row visible to the public (subscription_status=ACTIVE only)."""
    stmt = (
        select(*_PROVIDER_DETAIL_COLUMNS)
        .join(Profile, Profile.id == Provider.id)
        .outerjoin(
            Review,
            (Review.provider_id == Provider.id) & Review.deleted_at.is_(None),
        )
        .where(
            Provider.id == provider_id,
            Provider.subscription_status == SubscriptionStatus.ACTIVE,
            Profile.deleted_at.is_(None),
        )
        .group_by(*_PROVIDER_DETAIL_GROUP_BY)
    )
    result = await db.execute(stmt)
    return result.one_or_none()


async def get_by_id_for_owner(db: AsyncSession, provider_id: uuid.UUID) -> Row | None:
    """Return a provider row for its owner, regardless of subscription_status."""
    stmt = (
        select(*_PROVIDER_DETAIL_COLUMNS)
        .join(Profile, Profile.id == Provider.id)
        .outerjoin(
            Review,
            (Review.provider_id == Provider.id) & Review.deleted_at.is_(None),
        )
        .where(
            Provider.id == provider_id,
            Profile.deleted_at.is_(None),
        )
        .group_by(*_PROVIDER_DETAIL_GROUP_BY)
    )
    result = await db.execute(stmt)
    return result.one_or_none()


async def get_recent_reviews(
    db: AsyncSession, provider_id: uuid.UUID, *, limit: int = 10
) -> list[Row]:
    stmt = (
        select(
            Review.id,
            Review.rating,
            Review.comment,
            Review.verified_hire,
            Review.provider_response,
            Review.responded_at,
            Review.created_at,
            Profile.full_name.label("resident_full_name"),
        )
        .join(Profile, Profile.id == Review.resident_id)
        .where(
            Review.provider_id == provider_id,
            Review.deleted_at.is_(None),
        )
        .order_by(Review.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.all()


async def search(
    db: AsyncSession,
    *,
    lat: float,
    lng: float,
    radius_km: float,
    category: ServiceCategory | None,
    page: int,
    page_size: int,
) -> tuple[list[Row], int]:
    point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)

    base_filters = [
        Provider.subscription_status == SubscriptionStatus.ACTIVE,
        Profile.deleted_at.is_(None),
        func.ST_DWithin(
            cast(Provider.location, _GEOG),
            cast(point, _GEOG),
            radius_km * 1000,
        ),
    ]
    if category is not None:
        base_filters.append(Provider.category == category)

    count_stmt = (
        select(func.count(Provider.id))
        .join(Profile, Profile.id == Provider.id)
        .where(*base_filters)
    )
    total: int = (await db.execute(count_stmt)).scalar_one()

    if total == 0:
        return [], 0

    stmt = (
        select(
            Provider.id,
            Provider.business_name,
            Provider.category,
            Provider.description,
            Provider.center_lat,
            Provider.center_lng,
            Provider.radius_km,
            Provider.subscription_status,
            Profile.full_name,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
            func.ST_Distance(
                cast(Provider.location, _GEOG),
                cast(point, _GEOG),
            ).label("distance_m"),
        )
        .join(Profile, Profile.id == Provider.id)
        .outerjoin(
            Review,
            (Review.provider_id == Provider.id) & Review.deleted_at.is_(None),
        )
        .where(*base_filters)
        .group_by(
            Provider.id,
            Provider.business_name,
            Provider.category,
            Provider.description,
            Provider.center_lat,
            Provider.center_lng,
            Provider.radius_km,
            Provider.subscription_status,
            Profile.full_name,
        )
        .order_by(func.ST_Distance(Provider.location, point))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).all()
    return rows, total


async def update(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    business_name: str | None = None,
    category: ServiceCategory | None = None,
    description: Any = _UNSET,
    center_lat: float | None = None,
    center_lng: float | None = None,
    radius_km: float | None = None,
    contact_whatsapp: Any = _UNSET,
    experience_years: Any = _UNSET,
    services: Any = _UNSET,
) -> Provider | None:
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if provider is None:
        return None

    if business_name is not None:
        provider.business_name = business_name
    if category is not None:
        provider.category = category
    if description is not _UNSET:
        provider.description = description
    if contact_whatsapp is not _UNSET:
        provider.contact_whatsapp = contact_whatsapp
    if experience_years is not _UNSET:
        provider.experience_years = experience_years
    if services is not _UNSET:
        provider.services = services

    new_lat = center_lat if center_lat is not None else provider.center_lat
    new_lng = center_lng if center_lng is not None else provider.center_lng
    if center_lat is not None or center_lng is not None:
        provider.center_lat = new_lat
        provider.center_lng = new_lng
        provider.location = WKTElement(f"POINT({new_lng} {new_lat})", srid=4326)

    if radius_km is not None:
        provider.radius_km = radius_km

    await db.flush()
    return provider
