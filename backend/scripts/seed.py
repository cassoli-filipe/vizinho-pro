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
            "apikey": settings.supabase_service_role_key,
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
        from sqlalchemy import text
        await db.execute(text("TRUNCATE TABLE reviews, providers, profiles CASCADE"))
        await db.commit()
        
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
                try:
                    await _create_auth_user(client, user)
                    print(f"Auth user criado: {user['email']}")
                except Exception as e:
                    print(f"Erro ao criar auth user {user['email']}: {e}")

    await _seed_db(_USERS)


if __name__ == "__main__":
    asyncio.run(main())
