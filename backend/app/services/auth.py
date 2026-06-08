import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_cpf
from app.domain.exceptions import CPFAlreadyRegisteredError, ProfileAlreadyExistsError, ProfileNotFoundError
from app.domain.models import Profile
from app.repositories import profile as profile_repo
from app.repositories import provider as provider_repo
from app.schemas.auth import RegisterMoradorRequest, RegisterPrestadorRequest, RegisterRequest, UpdateProfileRequest


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
            contact_whatsapp=data.contact_whatsapp,
            experience_years=data.experience_years,
            services=data.services,
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
