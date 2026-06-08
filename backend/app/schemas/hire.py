import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.enums import ServiceCategory


class CreateHireRequest(BaseModel):
    provider_id: uuid.UUID
    estimated_value: Decimal | None = Field(default=None, ge=0)


class HireItem(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    provider_business_name: str
    provider_category: ServiceCategory
    hired_at: datetime
    estimated_value: Decimal | None
    source_type: str
    has_review: bool
    created_at: datetime


class PaginatedHires(BaseModel):
    items: list[HireItem]
    total: int
    page: int
    page_size: int
