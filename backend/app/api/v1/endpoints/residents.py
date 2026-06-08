# app/api/v1/endpoints/residents.py
import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.domain.exceptions import NotAResidentError, ProfileNotFoundError
from app.schemas.hire import CreateHireRequest, PaginatedHires
from app.services import hire as hire_service

router = APIRouter(prefix="/residents")


@router.post("/hires", status_code=status.HTTP_201_CREATED)
async def create_hire(
    body: CreateHireRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    resident_id = uuid.UUID(current_user["sub"])
    try:
        await hire_service.create_hire(db, resident_id=resident_id, data=body)
    except ProfileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado")
    except NotAResidentError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Somente moradores podem registrar contratações",
        )


@router.get("/hires", response_model=PaginatedHires)
async def list_hires(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> PaginatedHires:
    resident_id = uuid.UUID(current_user["sub"])
    return await hire_service.list_hires(db, resident_id=resident_id, page=page, limit=limit)
