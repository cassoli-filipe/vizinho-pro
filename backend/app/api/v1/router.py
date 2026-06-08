from fastapi import APIRouter

from app.api.v1.endpoints import auth, health, providers, residents, reviews

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(providers.router, tags=["providers"])
api_router.include_router(reviews.router, tags=["reviews"])
api_router.include_router(residents.router, tags=["residents"])
