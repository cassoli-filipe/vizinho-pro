from fastapi import APIRouter
from sqlalchemy import text

from app.core.dependencies import DbSession

router = APIRouter()


@router.get("/health")
async def health_check(db: DbSession) -> dict:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}
