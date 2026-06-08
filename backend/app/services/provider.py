import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.exceptions import ProfileNotFoundError
from app.repositories import provider as provider_repo
from app.schemas.provider import (
    PaginatedProviders,
    ProviderDetailResponse,
    ProviderSearchItem,
    ProviderSearchParams,
    ReviewInDetail,
    UpdateProviderRequest,
)


async def search(db: AsyncSession, *, params: ProviderSearchParams) -> PaginatedProviders:
    rows, total = await provider_repo.search(
        db,
        lat=params.lat,
        lng=params.lng,
        radius_km=params.radius_km,
        category=params.category,
        page=params.page,
        page_size=params.page_size,
    )
    items = [
        ProviderSearchItem(
            id=row.id,
            full_name=row.full_name,
            business_name=row.business_name,
            category=row.category,
            description=row.description,
            center_lat=row.center_lat,
            center_lng=row.center_lng,
            radius_km=row.radius_km,
            subscription_status=row.subscription_status,
            avg_rating=float(row.avg_rating) if row.avg_rating is not None else None,
            review_count=row.review_count,
            distance_km=round(row.distance_m / 1000, 2),
        )
        for row in rows
    ]
    return PaginatedProviders(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
    )


def _build_detail_response(
    row,
    review_rows,
    is_within_service_area: bool | None = None,
) -> ProviderDetailResponse:
    reviews = [
        ReviewInDetail(
            id=r.id,
            resident_full_name=r.resident_full_name,
            rating=r.rating,
            comment=r.comment,
            verified_hire=r.verified_hire,
            provider_response=r.provider_response,
            responded_at=r.responded_at,
            created_at=r.created_at,
        )
        for r in review_rows
    ]
    return ProviderDetailResponse(
        id=row.id,
        full_name=row.full_name,
        business_name=row.business_name,
        category=row.category,
        description=row.description,
        center_lat=row.center_lat,
        center_lng=row.center_lng,
        radius_km=row.radius_km,
        subscription_status=row.subscription_status,
        avg_rating=float(row.avg_rating) if row.avg_rating is not None else None,
        review_count=row.review_count,
        recent_reviews=reviews,
        phone=row.phone,
        email=row.email,
        contact_whatsapp=row.contact_whatsapp,
        experience_years=row.experience_years,
        services=row.services,
        is_within_service_area=is_within_service_area,
    )


async def get_detail(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    viewer_lat: float | None = None,
    viewer_lng: float | None = None,
) -> ProviderDetailResponse:
    """Return provider detail visible to the public (active providers only)."""
    from app.domain.geo import is_within_radius

    row = await provider_repo.get_by_id(db, provider_id)
    if row is None:
        raise ProfileNotFoundError("Prestador não encontrado")
    review_rows = await provider_repo.get_recent_reviews(db, provider_id)
    within = (
        is_within_radius(viewer_lat, viewer_lng, row.center_lat, row.center_lng, row.radius_km)
        if viewer_lat is not None and viewer_lng is not None
        else None
    )
    return _build_detail_response(row, review_rows, is_within_service_area=within)


async def get_detail_for_owner(db: AsyncSession, *, provider_id: uuid.UUID) -> ProviderDetailResponse:
    """Return provider detail for the owner regardless of subscription_status."""
    row = await provider_repo.get_by_id_for_owner(db, provider_id)
    if row is None:
        raise ProfileNotFoundError("Perfil de prestador não encontrado")
    review_rows = await provider_repo.get_recent_reviews(db, provider_id)
    return _build_detail_response(row, review_rows)


async def update_provider(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    data: UpdateProviderRequest,
) -> None:
    # Use exclude_unset so that fields not included in the request are not touched,
    # while fields explicitly set to null (e.g. description=null) are passed through.
    update_data = data.model_dump(exclude_unset=True)
    provider = await provider_repo.update(
        db,
        provider_id=provider_id,
        **update_data,
    )
    if provider is None:
        raise ProfileNotFoundError("Prestador não encontrado")
