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
        select(Profile).where(
            Profile.cpf_hash == cpf_hash,
            Profile.deleted_at.is_(None),
        )
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
