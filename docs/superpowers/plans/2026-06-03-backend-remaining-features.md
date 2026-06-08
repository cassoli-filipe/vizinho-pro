# Backend Remaining Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all remaining CondoServ backend features — provider search (PostGIS), provider detail, reviews, profile/provider update, LGPD account deletion, and dev seed.

**Architecture:** Layered pattern already established: schemas → repositories → services → endpoints. Provider search uses `ST_DWithin` with a GIST index. Reviews are gated at the service layer (morador-only). Account deletion does soft delete + CPF hash anonymization. Each task is TDD-first.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, GeoAlchemy2, asyncpg, Pydantic v2, pytest-asyncio, factory-boy, httpx

---

## File Map

**New files:**
- `app/schemas/provider.py` — ProviderSearchParams, ProviderSearchItem, ProviderDetailResponse, UpdateProviderRequest, PaginatedProviders
- `app/schemas/review.py` — CreateReviewRequest, ReviewResponse
- `app/repositories/review.py` — list_by_provider, create
- `app/services/provider.py` — search, get_detail, update_provider
- `app/services/review.py` — create_review
- `app/api/v1/endpoints/providers.py` — GET /providers, GET /providers/{id}, GET /providers/{id}/reviews, PATCH /providers/me
- `app/api/v1/endpoints/reviews.py` — POST /reviews
- `scripts/seed.py` — local dev seed
- `tests/unit/test_provider_service.py`
- `tests/unit/test_review_service.py`

**Modified files:**
- `app/schemas/auth.py` — add UpdateProfileRequest
- `app/repositories/profile.py` — add update, soft_delete
- `app/repositories/provider.py` — add search, get_by_id, update
- `app/services/auth.py` — add update_profile, delete_account
- `app/api/v1/endpoints/auth.py` — add PATCH /me, DELETE /me
- `app/api/v1/router.py` — wire providers and reviews routers

---

## Task 1: Provider and review schemas

**Files:**
- Create: `app/schemas/provider.py`
- Create: `app/schemas/review.py`

- [ ] **Step 1.1 — Create `app/schemas/provider.py`**

```python
# app/schemas/provider.py
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


class UpdateProviderRequest(BaseModel):
    business_name: str | None = None
    category: ServiceCategory | None = None
    description: str | None = None
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    radius_km: float | None = Field(default=None, gt=0, le=100)

    model_config = ConfigDict(extra="forbid")
```

- [ ] **Step 1.2 — Create `app/schemas/review.py`**

```python
# app/schemas/review.py
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreateReviewRequest(BaseModel):
    provider_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    resident_full_name: str
    rating: int
    comment: str | None
    verified_hire: bool
    created_at: datetime
```

- [ ] **Step 1.3 — Commit**

```bash
git add app/schemas/provider.py app/schemas/review.py
git commit -m "feat: add provider and review schemas"
```

---

## Task 2: Provider repository — search + get_by_id + update

**Files:**
- Modify: `app/repositories/provider.py`

The search query uses `ST_DWithin` (filters) and `ST_Distance` (ordering). Returns raw SQLAlchemy `Row` objects.

- [ ] **Step 2.1 — Write failing test**

```python
# tests/unit/test_provider_repository.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.repositories import provider as provider_repo
from app.domain.enums import ServiceCategory

@pytest.mark.asyncio
async def test_search_providers_applies_filters() -> None:
    mock_db = AsyncMock()
    mock_db.execute.return_value.all.return_value = []
    mock_db.execute.return_value.scalar_one.return_value = 0

    rows, total = await provider_repo.search(
        mock_db,
        lat=-23.55,
        lng=-46.63,
        radius_km=10.0,
        category=None,
        page=1,
        page_size=20,
    )

    assert rows == []
    assert total == 0
    assert mock_db.execute.call_count == 1  # só a count query; total=0 pula a data query
```

Run: `uv run pytest tests/unit/test_provider_repository.py -v`
Expected: `FAILED` — `search` does not exist yet.

- [ ] **Step 2.2 — Replace `app/repositories/provider.py` with full implementation**

```python
# app/repositories/provider.py
import uuid

from geoalchemy2.elements import WKTElement
from sqlalchemy import Row, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ServiceCategory, SubscriptionStatus
from app.domain.models import Profile, Provider, Review


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
    )
    db.add(provider)
    await db.flush()
    return provider


async def get_by_id(db: AsyncSession, provider_id: uuid.UUID) -> Row | None:
    point_expr = func.ST_SetSRID(func.ST_MakePoint(Provider.center_lng, Provider.center_lat), 4326)
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
        )
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
        func.ST_DWithin(Provider.location, point, radius_km * 1000),
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
            func.ST_Distance(Provider.location, point).label("distance_m"),
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
    description: str | None = None,
    center_lat: float | None = None,
    center_lng: float | None = None,
    radius_km: float | None = None,
) -> Provider | None:
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if provider is None:
        return None

    if business_name is not None:
        provider.business_name = business_name
    if category is not None:
        provider.category = category
    if description is not None:
        provider.description = description

    # Recompute geometry only when at least one coord changes
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
```

- [ ] **Step 2.3 — Run tests**

```bash
uv run pytest tests/unit/test_provider_repository.py -v
```
Expected: `PASSED`

- [ ] **Step 2.4 — Commit**

```bash
git add app/repositories/provider.py tests/unit/test_provider_repository.py
git commit -m "feat: provider repository — search, get_by_id, update"
```

---

## Task 3: Review repository

**Files:**
- Create: `app/repositories/review.py`

- [ ] **Step 3.1 — Write failing test**

```python
# tests/unit/test_review_repository.py
import uuid
from unittest.mock import AsyncMock

import pytest

from app.repositories import review as review_repo


@pytest.mark.asyncio
async def test_create_review_adds_to_session() -> None:
    mock_db = AsyncMock()
    review = await review_repo.create(
        mock_db,
        provider_id=uuid.uuid4(),
        resident_id=uuid.uuid4(),
        rating=4,
        comment="Ótimo serviço",
    )
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()
```

Run: `uv run pytest tests/unit/test_review_repository.py -v`
Expected: `FAILED` — module `review` not found in repositories.

- [ ] **Step 3.2 — Create `app/repositories/review.py`**

```python
# app/repositories/review.py
import uuid

from sqlalchemy import Row, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Review


async def create(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    resident_id: uuid.UUID,
    rating: int,
    comment: str | None,
) -> Review:
    review = Review(
        provider_id=provider_id,
        resident_id=resident_id,
        rating=rating,
        comment=comment,
        verified_hire=False,
    )
    db.add(review)
    await db.flush()
    return review


async def get_by_provider_and_resident(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    resident_id: uuid.UUID,
) -> Review | None:
    result = await db.execute(
        select(Review).where(
            Review.provider_id == provider_id,
            Review.resident_id == resident_id,
            Review.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()
```

- [ ] **Step 3.3 — Run tests**

```bash
uv run pytest tests/unit/test_review_repository.py -v
```
Expected: `PASSED`

- [ ] **Step 3.4 — Commit**

```bash
git add app/repositories/review.py tests/unit/test_review_repository.py
git commit -m "feat: review repository — create, get_by_provider_and_resident"
```

---

## Task 4: Provider service — search + get_detail + update_provider

**Files:**
- Create: `app/services/provider.py`
- Create: `tests/unit/test_provider_service.py`

- [ ] **Step 4.1 — Write failing tests**

```python
# tests/unit/test_provider_service.py
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domain.exceptions import ProfileNotFoundError
from app.schemas.provider import ProviderSearchParams
from app.services import provider as provider_service


_PROVIDER_ID = uuid.uuid4()


def _make_search_row(**kwargs):
    """Creates a mock Row with provider search fields."""
    defaults = {
        "id": _PROVIDER_ID,
        "business_name": "Elétrica SP",
        "category": "eletricista",
        "description": None,
        "center_lat": -23.55,
        "center_lng": -46.63,
        "radius_km": 10.0,
        "subscription_status": "active",
        "full_name": "João Silva",
        "avg_rating": 4.5,
        "review_count": 3,
        "distance_m": 500.0,
    }
    defaults.update(kwargs)
    row = MagicMock()
    for k, v in defaults.items():
        setattr(row, k, v)
    return row


@pytest.mark.asyncio
async def test_search_returns_paginated_result() -> None:
    mock_db = AsyncMock()
    params = ProviderSearchParams(lat=-23.55, lng=-46.63)
    rows = [_make_search_row()]

    with patch("app.services.provider.provider_repo.search", return_value=(rows, 1)):
        result = await provider_service.search(mock_db, params=params)

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].business_name == "Elétrica SP"
    assert result.items[0].distance_km == pytest.approx(0.5)


@pytest.mark.asyncio
async def test_search_empty_returns_empty_page() -> None:
    mock_db = AsyncMock()
    params = ProviderSearchParams(lat=-23.55, lng=-46.63)

    with patch("app.services.provider.provider_repo.search", return_value=([], 0)):
        result = await provider_service.search(mock_db, params=params)

    assert result.total == 0
    assert result.items == []


@pytest.mark.asyncio
async def test_get_detail_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.provider.provider_repo.get_by_id", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await provider_service.get_detail(mock_db, provider_id=_PROVIDER_ID)


@pytest.mark.asyncio
async def test_update_provider_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.provider.provider_repo.update", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await provider_service.update_provider(
                mock_db, provider_id=_PROVIDER_ID, data=MagicMock()
            )
```

Run: `uv run pytest tests/unit/test_provider_service.py -v`
Expected: `FAILED` — `app.services.provider` does not exist.

- [ ] **Step 4.2 — Create `app/services/provider.py`**

```python
# app/services/provider.py
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


async def get_detail(db: AsyncSession, *, provider_id: uuid.UUID) -> ProviderDetailResponse:
    row = await provider_repo.get_by_id(db, provider_id)
    if row is None:
        raise ProfileNotFoundError("Prestador não encontrado")

    review_rows = await provider_repo.get_recent_reviews(db, provider_id)
    reviews = [
        ReviewInDetail(
            id=r.id,
            resident_full_name=r.resident_full_name,
            rating=r.rating,
            comment=r.comment,
            verified_hire=r.verified_hire,
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
    )


async def update_provider(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID,
    data: UpdateProviderRequest,
) -> None:
    provider = await provider_repo.update(
        db,
        provider_id=provider_id,
        **{k: v for k, v in data.model_dump().items() if v is not None},
    )
    if provider is None:
        raise ProfileNotFoundError("Prestador não encontrado")
```

- [ ] **Step 4.3 — Run tests**

```bash
uv run pytest tests/unit/test_provider_service.py -v
```
Expected: all 4 `PASSED`.

- [ ] **Step 4.4 — Commit**

```bash
git add app/services/provider.py tests/unit/test_provider_service.py
git commit -m "feat: provider service — search, get_detail, update_provider"
```

---

## Task 5: Review service — create_review

**Files:**
- Create: `app/services/review.py`
- Create: `tests/unit/test_review_service.py`

- [ ] **Step 5.1 — Write failing tests**

```python
# tests/unit/test_review_service.py
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.exceptions import ProfileNotFoundError
from app.schemas.review import CreateReviewRequest
from app.services import review as review_service
from tests.factories import ProfileFactory, ProviderFactory, ReviewFactory


_RESIDENT_ID = uuid.uuid4()
_PROVIDER_ID = uuid.uuid4()


def _review_data() -> CreateReviewRequest:
    return CreateReviewRequest(
        provider_id=_PROVIDER_ID,
        rating=4,
        comment="Ótimo serviço",
    )


@pytest.mark.asyncio
async def test_create_review_success() -> None:
    mock_db = AsyncMock()
    morador = ProfileFactory.build(id=_RESIDENT_ID, user_type="morador")
    review = ReviewFactory.build(provider_id=_PROVIDER_ID, resident_id=_RESIDENT_ID)

    with (
        patch("app.services.review.profile_repo.get_by_id", return_value=morador),
        patch("app.services.review.review_repo.create", return_value=review),
    ):
        result = await review_service.create_review(
            mock_db, resident_id=_RESIDENT_ID, data=_review_data()
        )

    assert result.provider_id == _PROVIDER_ID


@pytest.mark.asyncio
async def test_create_review_fails_if_resident_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.review.profile_repo.get_by_id", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await review_service.create_review(
                mock_db, resident_id=_RESIDENT_ID, data=_review_data()
            )


@pytest.mark.asyncio
async def test_create_review_fails_if_user_is_prestador() -> None:
    mock_db = AsyncMock()
    prestador = ProfileFactory.build(id=_RESIDENT_ID, user_type="prestador")

    with patch("app.services.review.profile_repo.get_by_id", return_value=prestador):
        with pytest.raises(PermissionError):
            await review_service.create_review(
                mock_db, resident_id=_RESIDENT_ID, data=_review_data()
            )
```

Run: `uv run pytest tests/unit/test_review_service.py -v`
Expected: `FAILED` — `ReviewFactory` and `app.services.review` not found.

- [ ] **Step 5.2 — Add `ReviewFactory` to `tests/factories.py`**

Open `tests/factories.py` and append:

```python
from app.domain.models import Review  # add to existing imports


class ReviewFactory(factory.Factory):
    class Meta:
        model = Review

    id = factory.LazyFunction(uuid.uuid4)
    provider_id = factory.LazyFunction(uuid.uuid4)
    resident_id = factory.LazyFunction(uuid.uuid4)
    rating = 5
    comment = None
    verified_hire = False
    deleted_at = None
```

Full updated `tests/factories.py`:

```python
import uuid

import factory

from app.domain.enums import ServiceCategory, SubscriptionStatus, UserType
from app.domain.models import Profile, Provider, Review


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
    deleted_at = None
```

- [ ] **Step 5.3 — Create `app/services/review.py`**

```python
# app/services/review.py
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserType
from app.domain.exceptions import ProfileNotFoundError
from app.domain.models import Review
from app.repositories import profile as profile_repo
from app.repositories import review as review_repo
from app.schemas.review import CreateReviewRequest


async def create_review(
    db: AsyncSession,
    *,
    resident_id: uuid.UUID,
    data: CreateReviewRequest,
) -> Review:
    profile = await profile_repo.get_by_id(db, resident_id)
    if profile is None:
        raise ProfileNotFoundError("Perfil não encontrado")
    if profile.user_type != UserType.MORADOR:
        raise PermissionError("Somente moradores podem avaliar prestadores")

    return await review_repo.create(
        db,
        provider_id=data.provider_id,
        resident_id=resident_id,
        rating=data.rating,
        comment=data.comment,
    )
```

- [ ] **Step 5.4 — Run tests**

```bash
uv run pytest tests/unit/test_review_service.py -v
```
Expected: all 3 `PASSED`.

- [ ] **Step 5.5 — Commit**

```bash
git add app/services/review.py tests/unit/test_review_service.py tests/factories.py
git commit -m "feat: review service — create_review with morador gate"
```

---

## Task 6: Profile update + account deletion

**Files:**
- Modify: `app/schemas/auth.py`
- Modify: `app/repositories/profile.py`
- Modify: `app/services/auth.py`
- Modify: `app/api/v1/endpoints/auth.py`

- [ ] **Step 6.1 — Add `UpdateProfileRequest` to `app/schemas/auth.py`**

Append to the existing file after `RegisterRequest`:

```python
class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="forbid")
```

- [ ] **Step 6.2 — Add `update` and `soft_delete` to `app/repositories/profile.py`**

Append to the existing file:

```python
import secrets
from datetime import UTC, datetime  # add to imports


async def update(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    full_name: str | None = None,
    phone: str | None = None,
) -> Profile | None:
    result = await db.execute(
        select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return None
    if full_name is not None:
        profile.full_name = full_name
    if phone is not None:
        profile.phone = phone
    await db.flush()
    return profile


async def soft_delete(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    """Soft-delete and anonymize CPF hash to comply with LGPD right of erasure."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return
    profile.deleted_at = datetime.now(UTC)
    profile.cpf_hash = secrets.token_hex(32)  # unrecoverable, satisfies unique constraint
    await db.flush()
```

Full updated `app/repositories/profile.py`:

```python
import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models import Profile


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> Profile | None:
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.provider))
        .where(Profile.id == user_id, Profile.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_by_cpf_hash(db: AsyncSession, cpf_hash: str) -> Profile | None:
    result = await db.execute(
        select(Profile).where(Profile.cpf_hash == cpf_hash)
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    *,
    id: uuid.UUID,
    user_type,
    full_name: str,
    cpf_hash: str,
    email: str,
    phone: str | None,
) -> Profile:
    profile = Profile(
        id=id,
        user_type=user_type,
        full_name=full_name,
        cpf_hash=cpf_hash,
        email=email,
        phone=phone,
    )
    db.add(profile)
    await db.flush()
    return profile


async def update(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    full_name: str | None = None,
    phone: str | None = None,
) -> Profile | None:
    result = await db.execute(
        select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return None
    if full_name is not None:
        profile.full_name = full_name
    if phone is not None:
        profile.phone = phone
    await db.flush()
    return profile


async def soft_delete(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return
    profile.deleted_at = datetime.now(UTC)
    profile.cpf_hash = secrets.token_hex(32)
    await db.flush()
```

- [ ] **Step 6.3 — Add `update_profile` and `delete_account` to `app/services/auth.py`**

Append to the existing file:

```python
from app.domain.exceptions import ProfileNotFoundError  # add to imports
from app.schemas.auth import UpdateProfileRequest        # add to imports


async def update_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    data: UpdateProfileRequest,
) -> Profile:
    profile = await profile_repo.update(
        db,
        user_id=user_id,
        full_name=data.full_name,
        phone=data.phone,
    )
    if profile is None:
        raise ProfileNotFoundError("Perfil não encontrado")
    return profile


async def delete_account(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    await profile_repo.soft_delete(db, user_id=user_id)
```

Full updated `app/services/auth.py`:

```python
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_cpf
from app.domain.exceptions import (
    CPFAlreadyRegisteredError,
    ProfileAlreadyExistsError,
    ProfileNotFoundError,
)
from app.domain.models import Profile
from app.repositories import profile as profile_repo
from app.repositories import provider as provider_repo
from app.schemas.auth import (
    RegisterMoradorRequest,
    RegisterPrestadorRequest,
    RegisterRequest,
    UpdateProfileRequest,
)


async def register_user(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    email: str,
    data: RegisterRequest,
) -> Profile:
    if await profile_repo.get_by_id(db, user_id) is not None:
        raise ProfileAlreadyExistsError("Perfil já cadastrado para este usuário")

    cpf_hash = hash_cpf(data.cpf)
    if await profile_repo.get_by_cpf_hash(db, cpf_hash) is not None:
        raise CPFAlreadyRegisteredError("CPF já cadastrado")

    profile = await profile_repo.create(
        db,
        id=user_id,
        user_type=data.user_type,
        full_name=data.full_name,
        cpf_hash=cpf_hash,
        email=email,
        phone=data.phone,
    )

    if isinstance(data, RegisterPrestadorRequest):
        await provider_repo.create(
            db,
            id=user_id,
            business_name=data.business_name,
            category=data.category,
            description=data.description,
            center_lat=data.center_lat,
            center_lng=data.center_lng,
            radius_km=data.radius_km,
        )

    return profile


async def get_current_profile(db: AsyncSession, *, user_id: uuid.UUID) -> Profile | None:
    return await profile_repo.get_by_id(db, user_id)


async def update_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    data: UpdateProfileRequest,
) -> Profile:
    profile = await profile_repo.update(
        db,
        user_id=user_id,
        full_name=data.full_name,
        phone=data.phone,
    )
    if profile is None:
        raise ProfileNotFoundError("Perfil não encontrado")
    return profile


async def delete_account(db: AsyncSession, *, user_id: uuid.UUID) -> None:
    await profile_repo.soft_delete(db, user_id=user_id)
```

- [ ] **Step 6.4 — Add PATCH /me and DELETE /me to `app/api/v1/endpoints/auth.py`**

Full updated `app/api/v1/endpoints/auth.py`:

```python
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DbSession
from app.domain.exceptions import (
    CPFAlreadyRegisteredError,
    ProfileAlreadyExistsError,
    ProfileNotFoundError,
)
from app.schemas.auth import ProfileResponse, RegisterRequest, UpdateProfileRequest
from app.services import auth as auth_service

router = APIRouter(prefix="/auth")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=ProfileResponse)
async def register(
    body: RegisterRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    user_id = uuid.UUID(current_user["sub"])
    email: str = current_user.get("email", "")
    try:
        profile = await auth_service.register_user(db, user_id=user_id, email=email, data=body)
    except ProfileAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Perfil já cadastrado para este usuário")
    except CPFAlreadyRegisteredError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="CPF já cadastrado")

    await db.refresh(profile, ["provider"])
    return ProfileResponse.from_orm_with_mask(profile)


@router.get("/me", response_model=ProfileResponse)
async def me(current_user: CurrentUser, db: DbSession) -> ProfileResponse:
    user_id = uuid.UUID(current_user["sub"])
    profile = await auth_service.get_current_profile(db, user_id=user_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")
    return ProfileResponse.from_orm_with_mask(profile)


@router.patch("/me", response_model=ProfileResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    user_id = uuid.UUID(current_user["sub"])
    try:
        profile = await auth_service.update_profile(db, user_id=user_id, data=body)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")
    await db.refresh(profile, ["provider"])
    return ProfileResponse.from_orm_with_mask(profile)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(current_user: CurrentUser, db: DbSession) -> None:
    user_id = uuid.UUID(current_user["sub"])
    await auth_service.delete_account(db, user_id=user_id)
```

- [ ] **Step 6.5 — Write unit tests for update + delete service functions**

```python
# tests/unit/test_auth_service.py — append these tests to the existing file

@pytest.mark.asyncio
async def test_update_profile_success() -> None:
    mock_db = AsyncMock()
    profile = ProfileFactory.build(id=_USER_ID, full_name="Novo Nome")

    with patch("app.services.auth.profile_repo.update", return_value=profile):
        result = await auth_service.update_profile(
            mock_db,
            user_id=_USER_ID,
            data=UpdateProfileRequest(full_name="Novo Nome"),
        )

    assert result.full_name == "Novo Nome"


@pytest.mark.asyncio
async def test_update_profile_raises_if_not_found() -> None:
    mock_db = AsyncMock()

    with patch("app.services.auth.profile_repo.update", return_value=None):
        with pytest.raises(ProfileNotFoundError):
            await auth_service.update_profile(
                mock_db,
                user_id=_USER_ID,
                data=UpdateProfileRequest(full_name="X"),
            )


@pytest.mark.asyncio
async def test_delete_account_calls_soft_delete() -> None:
    mock_db = AsyncMock()

    with patch("app.services.auth.profile_repo.soft_delete") as mock_delete:
        await auth_service.delete_account(mock_db, user_id=_USER_ID)

    mock_delete.assert_awaited_once_with(mock_db, user_id=_USER_ID)
```

Add these imports to the top of the test file:
```python
from app.domain.exceptions import ProfileNotFoundError
from app.schemas.auth import UpdateProfileRequest
from app.services import auth as auth_service
```

- [ ] **Step 6.6 — Run all unit tests**

```bash
uv run pytest tests/unit/ -v
```
Expected: all tests `PASSED`.

- [ ] **Step 6.7 — Commit**

```bash
git add app/schemas/auth.py app/repositories/profile.py app/services/auth.py \
        app/api/v1/endpoints/auth.py tests/unit/test_auth_service.py
git commit -m "feat: profile update and LGPD account deletion"
```

---

## Task 7: Provider endpoints

**Files:**
- Create: `app/api/v1/endpoints/providers.py`

- [ ] **Step 7.1 — Create `app/api/v1/endpoints/providers.py`**

```python
# app/api/v1/endpoints/providers.py
import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.domain.enums import ServiceCategory
from app.domain.exceptions import ProfileNotFoundError
from app.schemas.provider import (
    PaginatedProviders,
    ProviderDetailResponse,
    ProviderSearchParams,
    UpdateProviderRequest,
)
from app.schemas.review import ReviewResponse
from app.services import provider as provider_service

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
    provider_id = uuid.UUID(current_user["sub"])
    try:
        return await provider_service.get_detail(db, provider_id=provider_id)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil de prestador não encontrado")


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
    db: DbSession,
) -> ProviderDetailResponse:
    try:
        return await provider_service.get_detail(db, provider_id=provider_id)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Prestador não encontrado")
```

- [ ] **Step 7.2 — Commit**

```bash
git add app/api/v1/endpoints/providers.py
git commit -m "feat: provider endpoints — search, detail, update"
```

---

## Task 8: Review endpoint

**Files:**
- Create: `app/api/v1/endpoints/reviews.py`

- [ ] **Step 8.1 — Create `app/api/v1/endpoints/reviews.py`**

```python
# app/api/v1/endpoints/reviews.py
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import CurrentUser, DbSession
from app.domain.exceptions import ProfileNotFoundError
from app.schemas.review import CreateReviewRequest, ReviewResponse
from app.services import review as review_service

router = APIRouter(prefix="/reviews")


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ReviewResponse)
async def create_review(
    body: CreateReviewRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewResponse:
    resident_id = uuid.UUID(current_user["sub"])
    try:
        review = await review_service.create_review(db, resident_id=resident_id, data=body)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc))

    await db.refresh(review, ["resident"])
    return ReviewResponse(
        id=review.id,
        provider_id=review.provider_id,
        resident_full_name=review.resident.full_name,
        rating=review.rating,
        comment=review.comment,
        verified_hire=review.verified_hire,
        created_at=review.created_at,
    )
```

- [ ] **Step 8.2 — Commit**

```bash
git add app/api/v1/endpoints/reviews.py
git commit -m "feat: review endpoint — POST /reviews"
```

---

## Task 9: Wire routers

**Files:**
- Modify: `app/api/v1/router.py`

- [ ] **Step 9.1 — Update `app/api/v1/router.py`**

```python
# app/api/v1/router.py
from fastapi import APIRouter

from app.api.v1.endpoints import auth, health, providers, reviews

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(providers.router, tags=["providers"])
api_router.include_router(reviews.router, tags=["reviews"])
```

- [ ] **Step 9.2 — Start dev server and verify docs load**

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Open http://localhost:8000/docs — verify these routes appear:
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `DELETE /api/v1/auth/me`
- `GET /api/v1/providers`
- `GET /api/v1/providers/me`
- `PATCH /api/v1/providers/me`
- `GET /api/v1/providers/{provider_id}`
- `POST /api/v1/reviews`

Stop server (`Ctrl+C`).

- [ ] **Step 9.3 — Run all unit tests**

```bash
uv run pytest tests/unit/ -v
```
Expected: all tests `PASSED` with 0 errors.

- [ ] **Step 9.4 — Commit**

```bash
git add app/api/v1/router.py
git commit -m "feat: wire providers and reviews routers"
```

---

## Task 10: Seed script

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/seed.py`
- Modify: `app/core/config.py` — add optional `supabase_service_role_key`
- Modify: `backend/.env.example` — add service role key

The seed creates Supabase Auth users via the admin API, then inserts profiles/providers/reviews directly.

- [ ] **Step 10.1 — Add `supabase_service_role_key` to settings**

In `app/core/config.py`, add one optional field:

```python
# Full updated app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "development"
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]

    database_url: str

    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    supabase_service_role_key: str = ""  # required only for seed

    cpf_hash_salt: str


settings = Settings()
```

Add to `.env.example`:
```
# Required only for running scripts/seed.py
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

(Supabase local service role key is printed by `supabase start` or visible in `supabase status`.)

- [ ] **Step 10.2 — Create `scripts/seed.py`**

```python
# scripts/seed.py
"""
Local development seed. Run with:
    supabase start
    uv run python scripts/seed.py
"""
import asyncio
import os
import sys
import uuid

import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.core.security import hash_cpf
from app.domain.enums import ServiceCategory, UserType
from app.domain.models import Profile, Provider, Review
from geoalchemy2.elements import WKTElement

_ENGINE = create_async_engine(settings.database_url, echo=False)
_SESSION = async_sessionmaker(_ENGINE, expire_on_commit=False)

_USERS = [
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000001"),
        "email": "morador1@condoserv.dev",
        "password": "Condo@1234",
        "cpf": "529.982.247-25",
        "full_name": "Carlos Morador",
        "user_type": UserType.MORADOR,
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000002"),
        "email": "morador2@condoserv.dev",
        "password": "Condo@1234",
        "cpf": "295.423.910-04",
        "full_name": "Ana Moradora",
        "user_type": UserType.MORADOR,
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000003"),
        "email": "piscineiro@condoserv.dev",
        "password": "Condo@1234",
        "cpf": "871.336.680-00",
        "full_name": "Roberto Piscineiro",
        "user_type": UserType.PRESTADOR,
        "business_name": "Piscinas SP",
        "category": ServiceCategory.PISCINEIRO,
        "description": "Manutenção e limpeza de piscinas em SP",
        "center_lat": -23.5505,
        "center_lng": -46.6333,
        "radius_km": 15.0,
    },
    {
        "id": uuid.UUID("00000000-0000-0000-0000-000000000004"),
        "email": "eletricista@condoserv.dev",
        "password": "Condo@1234",
        "cpf": "011.748.760-82",
        "full_name": "Marcos Eletricista",
        "user_type": UserType.PRESTADOR,
        "business_name": "Elétrica Rápida",
        "category": ServiceCategory.ELETRICISTA,
        "description": "Instalações e reparos elétricos",
        "center_lat": -23.5615,
        "center_lng": -46.6565,
        "radius_km": 10.0,
    },
]


async def _create_auth_user(client: httpx.AsyncClient, user: dict) -> None:
    resp = await client.post(
        f"{settings.supabase_url}/auth/v1/admin/users",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        json={
            "id": str(user["id"]),
            "email": user["email"],
            "password": user["password"],
            "email_confirm": True,
        },
    )
    if resp.status_code not in (200, 201, 422):  # 422 = already exists
        resp.raise_for_status()


async def _seed_db(users: list[dict]) -> None:
    async with _SESSION() as db:
        for user in users:
            profile = Profile(
                id=user["id"],
                user_type=user["user_type"],
                full_name=user["full_name"],
                cpf_hash=hash_cpf(user["cpf"]),
                email=user["email"],
                phone=None,
            )
            db.add(profile)
            await db.flush()

            if user["user_type"] == UserType.PRESTADOR:
                lat, lng = user["center_lat"], user["center_lng"]
                provider = Provider(
                    id=user["id"],
                    business_name=user["business_name"],
                    category=user["category"],
                    description=user["description"],
                    center_lat=lat,
                    center_lng=lng,
                    radius_km=user["radius_km"],
                    location=WKTElement(f"POINT({lng} {lat})", srid=4326),
                )
                db.add(provider)
                await db.flush()

        # Seed a verified review
        review = Review(
            provider_id=uuid.UUID("00000000-0000-0000-0000-000000000003"),
            resident_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            rating=5,
            comment="Excelente serviço, super recomendo!",
            verified_hire=True,
        )
        db.add(review)
        await db.commit()
        print("Seed concluído com sucesso.")


async def main() -> None:
    if not settings.supabase_service_role_key:
        print("SUPABASE_SERVICE_ROLE_KEY não configurado. Pulando criação de auth users.")
    else:
        async with httpx.AsyncClient() as client:
            for user in _USERS:
                await _create_auth_user(client, user)
                print(f"Auth user criado: {user['email']}")

    await _seed_db(_USERS)


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 10.3 — Create `scripts/__init__.py`**

```python
```
(empty file)

- [ ] **Step 10.4 — Commit**

```bash
git add scripts/ app/core/config.py backend/.env.example
git commit -m "feat: dev seed script with Supabase auth + DB records"
```

---

## Verificação final

- [ ] **Run full test suite**

```bash
uv run pytest tests/unit/ -v --tb=short
```
Expected: all tests `PASSED`, 0 errors, 0 warnings about missing fixtures.

- [ ] **Verify server starts cleanly**

```bash
uv run uvicorn app.main:app --reload
```
Expected: no import errors, `/docs` shows all 10 routes.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete backend MVP — providers, reviews, profile update, LGPD deletion, seed"
```

---

## Resumo dos endpoints implementados

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/health` | — | Health check + DB ping |
| POST | `/api/v1/auth/register` | JWT | Cria perfil (morador ou prestador) |
| GET | `/api/v1/auth/me` | JWT | Retorna perfil do usuário |
| PATCH | `/api/v1/auth/me` | JWT | Atualiza nome/telefone |
| DELETE | `/api/v1/auth/me` | JWT | Soft delete + anonimização CPF (LGPD) |
| GET | `/api/v1/providers` | — | Busca prestadores por localização |
| GET | `/api/v1/providers/me` | JWT | Perfil do próprio prestador |
| PATCH | `/api/v1/providers/me` | JWT | Atualiza dados do prestador |
| GET | `/api/v1/providers/{id}` | — | Detalhe do prestador + avaliações recentes |
| POST | `/api/v1/reviews` | JWT | Cria avaliação (somente moradores) |
