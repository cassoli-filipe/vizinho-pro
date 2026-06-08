import uuid
from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.enums import ServiceCategory, SubscriptionStatus, UserType


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_type: Mapped[UserType] = mapped_column(
        Enum(UserType, name="usertype", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    provider: Mapped["Provider | None"] = relationship(back_populates="profile", uselist=False)
    reviews_given: Mapped[list["Review"]] = relationship(
        back_populates="resident", foreign_keys="Review.resident_id"
    )
    hires_made: Mapped[list["Hire"]] = relationship(
        back_populates="resident", foreign_keys="Hire.resident_id"
    )


class Provider(Base):
    __tablename__ = "providers"
    __table_args__ = (
        Index("ix_providers_location", "location", postgresql_using="gist"),
        Index("ix_providers_subscription_status", "subscription_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[ServiceCategory] = mapped_column(
        Enum(ServiceCategory, name="servicecategory", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_km: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[WKBElement] = mapped_column(
        Geometry("POINT", srid=4326), nullable=False
    )
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscriptionstatus", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=SubscriptionStatus.ACTIVE,
        server_default=SubscriptionStatus.ACTIVE.value,
        nullable=False,
    )
    contact_whatsapp: Mapped[str | None] = mapped_column(String(20))
    experience_years: Mapped[int | None] = mapped_column(Integer)
    services: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    profile: Mapped["Profile"] = relationship(back_populates="provider")
    reviews: Mapped[list["Review"]] = relationship(back_populates="provider")
    hires: Mapped[list["Hire"]] = relationship(back_populates="provider")
    events: Mapped[list["ProviderEvent"]] = relationship(back_populates="provider")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
        Index("ix_reviews_provider_id", "provider_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id"), nullable=False
    )
    resident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    verified_hire: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    provider_response: Mapped[str | None] = mapped_column(Text)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    provider: Mapped["Provider"] = relationship(back_populates="reviews")
    resident: Mapped["Profile"] = relationship(
        back_populates="reviews_given", foreign_keys=[resident_id]
    )


class Hire(Base):
    __tablename__ = "hires"
    __table_args__ = (
        Index("ix_hires_resident_id", "resident_id"),
        Index("ix_hires_provider_id", "provider_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id"), nullable=False
    )
    hired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    resident: Mapped["Profile"] = relationship(
        back_populates="hires_made", foreign_keys=[resident_id]
    )
    provider: Mapped["Provider"] = relationship(back_populates="hires")


class ProviderEvent(Base):
    __tablename__ = "provider_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    out_of_area: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    provider: Mapped["Provider"] = relationship(back_populates="events")
