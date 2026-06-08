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

    # Set to True only for local dev when Supabase JWT secret is unavailable.
    # Must be False in production — the app refuses to start otherwise.
    allow_unsigned_jwt: bool = False


settings = Settings()

_DEV_ENVIRONMENTS: frozenset[str] = frozenset({"local", "development", "test"})

if settings.allow_unsigned_jwt and settings.environment not in _DEV_ENVIRONMENTS:
    raise RuntimeError(
        f"allow_unsigned_jwt cannot be True for environment={settings.environment!r}. "
        f"Permitted only in: {_DEV_ENVIRONMENTS}"
    )
