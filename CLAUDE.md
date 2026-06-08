# CondoServ

Plataforma que conecta moradores de condomínios a prestadores de serviço (piscineiros, eletricistas, jardineiros, etc.) via busca geolocalizada e avaliações verificadas.

## Comandos essenciais

```bash
# Backend
cd backend
uvicorn app.main:app --reload          # dev server (porta 8000)
pytest                                  # todos os testes
pytest tests/unit/ -v                   # só testes unitários
pytest tests/integration/ -v            # só testes de integração
alembic upgrade head                    # aplica migrations
alembic revision --autogenerate -m ""  # gera nova migration

# Frontend
cd frontend
npm run dev                             # dev server (porta 5173)
npm run build                           # build de produção
npm run test                            # Vitest
npm run lint                            # ESLint

# Banco (Supabase local)
supabase start                          # sobe stack local
supabase db reset                       # reset + seed
supabase gen types typescript           # gera tipos TS do schema
```

## Arquitetura

```
condoserv/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # routers FastAPI (endpoints REST)
│   │   ├── core/            # config, security, dependencies
│   │   ├── domain/          # entidades e regras de negócio puras
│   │   ├── services/        # casos de uso (orquestração)
│   │   ├── repositories/    # acesso ao banco (SQLAlchemy)
│   │   └── schemas/         # Pydantic (request/response)
│   └── tests/
│       ├── unit/            # testa domain/ e services/ isolados
│       └── integration/     # testa com banco real (Supabase local)
└── frontend/
    ├── src/
    │   ├── components/      # componentes reutilizáveis
    │   ├── pages/           # páginas (React Router)
    │   ├── hooks/           # custom hooks
    │   ├── services/        # chamadas de API (axios)
    │   └── types/           # tipos TypeScript gerados + manuais
    └── tests/
```

## Regras críticas — NUNCA violar

**Segurança e LGPD**:
- CPF nunca aparece em logs, respostas de API ou mensagens de erro
- CPF em repouso: armazenar apenas o hash SHA-256 com salt fixo por tenant para buscas; o valor mascarado (`***.***.***-**`) para exibição
- RLS obrigatório em TODA tabela do Supabase — sem exceção
- Validar CPF (algoritmo oficial) antes de qualquer operação de cadastro
- Soft delete + anonimização de CPF para atender direito de exclusão LGPD

**API**:
- Versionamento `/api/v1/` em todos os endpoints
- Erros sempre no formato `{"error": {"code": "SNAKE_CASE", "message": "mensagem legível"}}`
- Nunca retornar stack traces em produção
- Rate limiting nos endpoints públicos de busca e cadastro

**Banco**:
- Migrations via Alembic — nunca alterar schema manualmente
- Índices obrigatórios: `provider_location` (PostGIS GIST), `cpf_hash`
- Toda query geoespacial usa `ST_DWithin` (índice GIST) — nunca `ST_Distance` em WHERE
- Transações explícitas em operações que tocam múltiplas tabelas

**Testes**:
- Toda função de domínio/serviço tem teste unitário antes do PR
- Factories (factory_boy) para fixtures — nunca dados hardcoded nos testes
- Mocks apenas na camada de repositório nos testes unitários

## Regras de negócio (resumo)

- Dois perfis exclusivos: `morador` e `prestador` — um CPF não pode ter os dois
- Prestador só aparece nas buscas com `subscription_status = 'active'`
- Somente moradores que marcaram "contratei" podem avaliar — flag `verified_hire`
- Geolocalização: prestador define `center_lat/lng` + `radius_km`; busca usa `ST_DWithin`

## Assinatura — MOCKADA (pagamentos fora do escopo do MVP)

- Stripe e qualquer integração de pagamento estão **fora do escopo**. Não implementar.
- O campo `subscription_status` existe no banco mas é gerenciado manualmente (seed/admin).
- Novos prestadores são criados com `subscription_status = 'active'` por padrão no seed.
- Quando a lógica real de pagamento for adicionada, o ponto de entrada será `repositories/subscription.py` — manter esse arquivo vazio reservado.
- **Nunca** adicionar dependências do Stripe (`stripe`, `stripe-python`) enquanto estiver mockado.

## Padrões de código

- **Idioma**: código e comentários em inglês; UI e mensagens de erro ao usuário em pt-BR
- **Python**: type hints em tudo; dataclasses ou Pydantic para DTOs; sem `Any` sem justificativa
- **TypeScript**: `strict: true`; sem `any`; tipos gerados pelo `supabase gen types`
- **Imports**: absolutos no backend (`from app.services.provider import ...`); path aliases no frontend (`@/components/...`)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

## Armadilhas conhecidas

- `ST_DWithin` recebe distância em **metros** quando o SRID é 4326 geográfico — use `ST_DWithin(geom, point, radius_km * 1000)`
- Supabase Auth JWT contém `sub` (UUID do usuário), não o CPF — fazer lookup na tabela `profiles` para obter `user_type`
- CPF com dígitos todos iguais (111.111.111-11) passa na máscara mas é inválido — validar no algoritmo
- `asyncpg` não suporta `psycopg2`-style `%s` — usar `:param` ou ORM