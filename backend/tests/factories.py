import uuid

import factory

from app.domain.enums import ServiceCategory, SubscriptionStatus, UserType
from app.domain.models import Hire, Profile, Provider, ProviderEvent, Review


class ProfileFactory(factory.Factory):
    class Meta:
        model = Profile

    id = factory.LazyFunction(uuid.uuid4)
    user_type = UserType.MORADOR
    full_name = factory.Faker("name")
    cpf_hash = factory.LazyFunction(lambda: "a" * 64)
    email = factory.Faker("email")
    phone = None
    deleted_at = None
    provider = None


class ProviderFactory(factory.Factory):
    class Meta:
        model = Provider

    id = factory.LazyFunction(uuid.uuid4)
    business_name = factory.Faker("company")
    category = ServiceCategory.ELETRICISTA
    description = None
    center_lat = -23.5505
    center_lng = -46.6333
    radius_km = 10.0
    location = None
    subscription_status = SubscriptionStatus.ACTIVE


class ReviewFactory(factory.Factory):
    class Meta:
        model = Review

    id = factory.LazyFunction(uuid.uuid4)
    provider_id = factory.LazyFunction(uuid.uuid4)
    resident_id = factory.LazyFunction(uuid.uuid4)
    rating = 5
    comment = None
    verified_hire = False
    provider_response = None
    responded_at = None
    deleted_at = None


class HireFactory(factory.Factory):
    class Meta:
        model = Hire

    id = factory.LazyFunction(uuid.uuid4)
    resident_id = factory.LazyFunction(uuid.uuid4)
    provider_id = factory.LazyFunction(uuid.uuid4)
    estimated_value = None
    source_type = "MANUAL"


class ProviderEventFactory(factory.Factory):
    class Meta:
        model = ProviderEvent

    id = factory.LazyFunction(uuid.uuid4)
    provider_id = factory.LazyFunction(uuid.uuid4)
    event_type = "PROFILE_VIEW"
    out_of_area = False
