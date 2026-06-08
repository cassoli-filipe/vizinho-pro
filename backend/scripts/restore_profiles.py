# scripts/restore_profiles.py
"""
Script utilitário para restaurar os perfis dos usuários que já estão no Supabase Auth.
Isso ajuda a recuperar o banco local após downgrades/resets do Alembic sem precisar
recriar as contas no Supabase Auth.
"""
import asyncio
import os
import sys
import uuid
import re

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.core.security import hash_cpf
from app.domain.enums import ServiceCategory, UserType
from app.domain.models import Profile, Provider, Review
from geoalchemy2.elements import WKTElement

_ENGINE = create_async_engine(settings.database_url, echo=False)
_SESSION = async_sessionmaker(_ENGINE, expire_on_commit=False)

# Dados customizados para usuários específicos que possam estar no auth
_CUSTOM_PROFILES = {
    "paulosilva@gmail.com": {
        "full_name": "Paulo Silva",
        "user_type": UserType.PRESTADOR,
        "cpf": "123.456.789-09",
        "phone": "(11) 98765-1234",
        "provider": {
            "business_name": "Paulo Silva Eletricista",
            "category": ServiceCategory.ELETRICISTA,
            "description": "Eletricista residencial com ampla experiência em condomínios. Faço manutenção, reparos, cabeamento estruturado e instalação de iluminação.",
            "center_lat": -23.5615,
            "center_lng": -46.6565,
            "radius_km": 10.0
        }
    },
    "cassolipro@gmail.com": {
        "full_name": "Filipe Cassoli Morador",
        "user_type": UserType.MORADOR,
        "cpf": "987.654.321-00",
        "phone": "(11) 99999-8888"
    },
    "cassolifilipe@gmail.com": {
        "full_name": "Filipe Cassoli",
        "user_type": UserType.MORADOR,
        "cpf": "444.333.222-11",
        "phone": None
    },
    "pedrosilva@gmail.com": {
        "full_name": "Pedro Silva",
        "user_type": UserType.MORADOR,
        "cpf": "555.444.333-22",
        "phone": None
    },
    "morador1@condoserv.dev": {
        "full_name": "Carlos Morador",
        "user_type": UserType.MORADOR,
        "cpf": "529.982.247-25",
        "phone": None
    },
    "morador2@condoserv.dev": {
        "full_name": "Ana Moradora",
        "user_type": UserType.MORADOR,
        "cpf": "295.423.910-04",
        "phone": None
    },
    "piscineiro@condoserv.dev": {
        "full_name": "Roberto Piscineiro",
        "user_type": UserType.PRESTADOR,
        "cpf": "871.336.680-00",
        "phone": "(11) 97777-6666",
        "provider": {
            "business_name": "Piscinas SP",
            "category": ServiceCategory.PISCINEIRO,
            "description": "Limpeza, tratamento químico e manutenção geral de piscinas residenciais e de condomínios.",
            "center_lat": -23.5505,
            "center_lng": -46.6333,
            "radius_km": 15.0
        }
    },
    "eletricista@condoserv.dev": {
        "full_name": "Marcos Eletricista",
        "user_type": UserType.PRESTADOR,
        "cpf": "011.748.760-82",
        "phone": "(11) 98765-4321",
        "provider": {
            "business_name": "Elétrica Rápida",
            "category": ServiceCategory.ELETRICISTA,
            "description": "Instalações e reparos elétricos",
            "center_lat": -23.5615,
            "center_lng": -46.6565,
            "radius_km": 10.0
        }
    }
}

async def restore():
    async with _SESSION() as db:
        # 1. Obter todos os usuários da tabela auth.users do Supabase
        print("Buscando usuários em auth.users...")
        res = await db.execute(text("SELECT id, email FROM auth.users"))
        auth_users = [(row[0], row[1]) for row in res]
        
        print(f"Encontrados {len(auth_users)} usuários no Supabase Auth.")
        
        for user_id, email in auth_users:
            # Verificar se já existe perfil na tabela public.profiles
            res_profile = await db.execute(
                text("SELECT id FROM public.profiles WHERE id = :id"),
                {"id": user_id}
            )
            if res_profile.first() is not None:
                print(f"Perfil já existe para {email}. Pulando.")
                continue
                
            print(f"Restaurando perfil para {email}...")
            
            # Verificar se temos dados customizados para o email
            custom = _CUSTOM_PROFILES.get(email)
            if custom:
                full_name = custom["full_name"]
                user_type = custom["user_type"]
                cpf = custom["cpf"]
                phone = custom["phone"]
            else:
                # Gerar dados dinâmicos baseados no email
                name_part = email.split("@")[0]
                full_name = name_part.replace(".", " ").title()
                user_type = UserType.MORADOR
                cpf = "111.111.111-11" # Fallback cpf
                phone = None
                
            # Criar perfil
            profile = Profile(
                id=user_id,
                user_type=user_type,
                full_name=full_name,
                cpf_hash=hash_cpf(cpf),
                email=email,
                phone=phone
            )
            db.add(profile)
            await db.flush()
            
            # Se for prestador e tiver dados de provider
            if user_type == UserType.PRESTADOR:
                provider_data = None
                if custom and "provider" in custom:
                    provider_data = custom["provider"]
                else:
                    # Dados default de provider
                    provider_data = {
                        "business_name": f"{full_name} Serviços",
                        "category": ServiceCategory.ELETRICISTA,
                        "description": "Prestação de serviços gerais para condomínios.",
                        "center_lat": -23.5615,
                        "center_lng": -46.6565,
                        "radius_km": 10.0
                    }
                    
                lat = provider_data["center_lat"]
                lng = provider_data["center_lng"]
                provider = Provider(
                    id=user_id,
                    business_name=provider_data["business_name"],
                    category=provider_data["category"],
                    description=provider_data["description"],
                    center_lat=lat,
                    center_lng=lng,
                    radius_km=provider_data["radius_km"],
                    location=WKTElement(f"POINT({lng} {lat})", srid=4326),
                )
                db.add(provider)
                await db.flush()
                
        await db.commit()
        print("Restauração de perfis concluída com sucesso.")

        # 2. Inserir avaliações de teste para o Paulo Silva
        print("Adicionando avaliações de teste para Paulo Silva...")
        paulo_id = uuid.UUID("ef035432-6f2a-4bcc-bdc7-870953147ead")
        carlos_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        ana_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

        # Garantir que o Paulo existe como provider no banco antes de adicionar avaliações
        res_provider = await db.execute(
            text("SELECT id FROM public.providers WHERE id = :paulo_id"),
            {"paulo_id": paulo_id}
        )
        if res_provider.first() is not None:
            # Deletar avaliações de teste antigas do Paulo para evitar duplicação se rodado múltiplas vezes
            await db.execute(
                text("DELETE FROM public.reviews WHERE provider_id = :paulo_id"),
                {"paulo_id": paulo_id}
            )
            await db.commit()

            # Inserir avaliações
            r1 = Review(
                id=uuid.uuid4(),
                provider_id=paulo_id,
                resident_id=carlos_id,
                rating=5,
                comment="Excelente profissional! O Paulo resolveu o problema do disjuntor da cozinha muito rápido e foi extremamente educado e limpo.",
                verified_hire=True
            )
            r2 = Review(
                id=uuid.uuid4(),
                provider_id=paulo_id,
                resident_id=ana_id,
                rating=4,
                comment="Gostei muito do serviço de instalação das luminárias da sala. Recomendo com certeza para o condomínio.",
                verified_hire=True
            )
            db.add(r1)
            db.add(r2)
            await db.flush()
            await db.commit()
            print("Avaliações de teste do Paulo Silva adicionadas com sucesso.")
        else:
            print("Paulo Silva não encontrado como prestador no banco. Pulando inserção de avaliações.")

if __name__ == "__main__":
    asyncio.run(restore())
