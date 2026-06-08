import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import validate_cpf
from app.domain.enums import ServiceCategory, SubscriptionStatus, UserType


class _RegisterBase(BaseModel):
    cpf: str
    full_name: str
    phone: str | None = None

    @field_validator("cpf")
    @classmethod
    def cpf_must_be_valid(cls, v: str) -> str:
        if not validate_cpf(v):
            raise ValueError("CPF inválido")
        return v


class RegisterMoradorRequest(_RegisterBase):
    user_type: Literal[UserType.MORADOR]


class RegisterPrestadorRequest(_RegisterBase):
    user_type: Literal[UserType.PRESTADOR]
    business_name: str
    category: ServiceCategory
    description: str | None = None
    center_lat: float = Field(ge=-90, le=90)
    center_lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(gt=0, le=100)
    contact_whatsapp: str | None = Field(default=None, max_length=20)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    services: list[str] | None = None


RegisterRequest = Annotated[
    RegisterMoradorRequest | RegisterPrestadorRequest,
    Field(discriminator="user_type"),
]


class ProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    business_name: str
    category: ServiceCategory
    description: str | None
    center_lat: float
    center_lng: float
    radius_km: float
    subscription_status: SubscriptionStatus
    contact_whatsapp: str | None = None
    experience_years: int | None = None
    services: list[str] | None = None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_type: UserType
    full_name: str
    cpf_masked: str
    email: str
    phone: str | None
    created_at: datetime
    provider: ProviderResponse | None = None

    @classmethod
    def from_orm_with_mask(cls, profile) -> "ProfileResponse":
        return cls(
            id=profile.id,
            user_type=profile.user_type,
            full_name=profile.full_name,
            cpf_masked="***.***.***-**",
            email=profile.email,
            phone=profile.phone,
            created_at=profile.created_at,
            provider=ProviderResponse.model_validate(profile.provider)
            if profile.provider
            else None,
        )


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="forbid")
