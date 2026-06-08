import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import ServiceCategory, SubscriptionStatus


class ProviderSearchParams(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=10.0, gt=0, le=100)
    category: ServiceCategory | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ProviderSearchItem(BaseModel):
    id: uuid.UUID
    full_name: str
    business_name: str
    category: ServiceCategory
    description: str | None
    center_lat: float
    center_lng: float
    radius_km: float
    subscription_status: SubscriptionStatus
    avg_rating: float | None
    review_count: int
    distance_km: float


class PaginatedProviders(BaseModel):
    items: list[ProviderSearchItem]
    total: int
    page: int
    page_size: int


class ReviewInDetail(BaseModel):
    id: uuid.UUID
    resident_full_name: str
    rating: int
    comment: str | None
    verified_hire: bool
    provider_response: str | None
    responded_at: datetime | None
    created_at: datetime


class ProviderDetailResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    business_name: str
    category: ServiceCategory
    description: str | None
    center_lat: float
    center_lng: float
    radius_km: float
    subscription_status: SubscriptionStatus
    avg_rating: float | None
    review_count: int
    recent_reviews: list[ReviewInDetail]
    # contact fields (nullable for providers created before this migration)
    phone: str | None = None
    email: str | None = None
    contact_whatsapp: str | None = None
    experience_years: int | None = None
    services: list[str] | None = None
    is_within_service_area: bool | None = None


class UpdateProviderRequest(BaseModel):
    business_name: str | None = None
    category: ServiceCategory | None = None
    description: str | None = None
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    radius_km: float | None = Field(default=None, gt=0, le=100)
    contact_whatsapp: str | None = Field(default=None, max_length=20)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    services: list[str] | None = None

    model_config = ConfigDict(extra="forbid")
