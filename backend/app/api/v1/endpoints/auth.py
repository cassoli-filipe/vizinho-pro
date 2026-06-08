import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.core.dependencies import CurrentUser, DbSession
from app.domain.exceptions import CPFAlreadyRegisteredError, ProfileAlreadyExistsError, ProfileNotFoundError
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Perfil já cadastrado para este usuário",
        )
    except CPFAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF já cadastrado",
        )

    await db.refresh(profile, ["provider"])
    return ProfileResponse.from_orm_with_mask(profile)


@router.get("/me", response_model=ProfileResponse)
async def me(
    current_user: CurrentUser,
    db: DbSession,
) -> ProfileResponse:
    user_id = uuid.UUID(current_user["sub"])
    profile = await auth_service.get_current_profile(db, user_id=user_id)

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado",
        )

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
