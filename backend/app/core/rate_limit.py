from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

_store: dict[str, list[datetime]] = defaultdict(list)


def check_rate_limit(key: str, limit: int = 5, window_seconds: int = 60) -> None:
    """Raise HTTP 429 if more than `limit` calls have been made within `window_seconds`."""
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=window_seconds)
    _store[key] = [t for t in _store[key] if t > cutoff]
    if len(_store[key]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas requisições. Aguarde um momento.",
        )
    _store[key].append(now)
