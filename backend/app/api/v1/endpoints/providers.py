# app/api/v1/endpoints/providers.py
import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.core.rate_limit import check_rate_limit
from app.domain.enums import ServiceCategory
from app.domain.exceptions import ProfileNotFoundError
from app.schemas.provider import (
    PaginatedProviders,
    ProviderDetailResponse,
    ProviderSearchParams,
    UpdateProviderRequest,
)
from app.schemas.provider_event import ProviderMetricsResponse, RecordEventRequest
from app.services import provider as provider_service
from app.services import provider_event as provider_event_service

router = APIRouter(prefix="/providers")


@router.get("", response_model=PaginatedProviders)
async def search_providers(
    db: DbSession,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=10.0, gt=0, le=100),
    category: ServiceCategory | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedProviders:
    params = ProviderSearchParams(
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        category=category,
        page=page,
        page_size=page_size,
    )
    return await provider_service.search(db, params=params)


@router.get("/me", response_model=ProviderDetailResponse)
async def get_my_provider_profile(
    current_user: CurrentUser,
    db: DbSession,
) -> ProviderDetailResponse:
    """Return the authenticated provider's own profile (ignores subscription_status)."""
    provider_id = uuid.UUID(current_user["sub"])
    try:
        return await provider_service.get_detail_for_owner(db, provider_id=provider_id)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil de prestador não encontrado")


@router.get("/me/metrics", response_model=ProviderMetricsResponse)
async def get_my_metrics(
    current_user: CurrentUser,
    db: DbSession,
) -> ProviderMetricsResponse:
    provider_id = uuid.UUID(current_user["sub"])
    return await provider_event_service.get_metrics(db, provider_id=provider_id)


@router.patch("/me", status_code=status.HTTP_204_NO_CONTENT)
async def update_my_provider(
    body: UpdateProviderRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    provider_id = uuid.UUID(current_user["sub"])
    try:
        await provider_service.update_provider(db, provider_id=provider_id, data=body)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil de prestador não encontrado")


@router.get("/{provider_id}", response_model=ProviderDetailResponse)
async def get_provider(
    provider_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
) -> ProviderDetailResponse:
    try:
        detail = await provider_service.get_detail(
            db, provider_id=provider_id, viewer_lat=lat, viewer_lng=lng
        )
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Prestador não encontrado")

    user_id = current_user["sub"]
    check_rate_limit(f"profile_view:{user_id}:{provider_id}")
    await provider_event_service.record_event(
        db,
        provider_id=provider_id,
        event_type="PROFILE_VIEW",
    )
    return detail


@router.post("/{provider_id}/events", status_code=status.HTTP_204_NO_CONTENT)
async def record_provider_event(
    provider_id: uuid.UUID,
    body: RecordEventRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    user_id = current_user["sub"]
    check_rate_limit(f"event:{user_id}:{provider_id}")
    await provider_event_service.record_event(
        db,
        provider_id=provider_id,
        event_type=body.event_type,
        out_of_area=body.out_of_area,
    )
