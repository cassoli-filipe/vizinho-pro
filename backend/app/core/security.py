import hashlib
import re
from datetime import UTC, datetime

from jose import JWTError, jwt

from app.core.config import settings


def validate_cpf(cpf: str) -> bool:
    digits = re.sub(r"\D", "", cpf)
    if len(digits) != 11 or len(set(digits)) == 1:
        return False

    total = sum(int(digits[i]) * (10 - i) for i in range(9))
    if (total * 10 % 11) % 10 != int(digits[9]):
        return False

    total = sum(int(digits[i]) * (11 - i) for i in range(10))
    return (total * 10 % 11) % 10 == int(digits[10])


def hash_cpf(cpf: str) -> str:
    digits = re.sub(r"\D", "", cpf)
    salted = f"{settings.cpf_hash_salt}{digits}"
    return hashlib.sha256(salted.encode()).hexdigest()


def mask_cpf(_cpf: str) -> str:
    return "***.***.***-**"


def decode_supabase_token(token: str) -> dict:
    """Decode and validate a Supabase JWT.

    Always verifies signature with SUPABASE_JWT_SECRET (HS256).
    The only exception is when allow_unsigned_jwt=True in settings,
    which must never be set in production.
    """
    try:
        if not settings.allow_unsigned_jwt:
            payload: dict = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return payload

        # Local dev only — config.py guarantees this branch is unreachable outside
        # _DEV_ENVIRONMENTS. Expiry is checked manually; signature is not verified.
        claims: dict = jwt.get_unverified_claims(token)
        exp = claims.get("exp")
        if exp is not None and datetime.fromtimestamp(exp, UTC) < datetime.now(UTC):
            raise JWTError("Token expirado")
        return claims

    except JWTError as exc:
        raise ValueError("Token inválido ou expirado") from exc
