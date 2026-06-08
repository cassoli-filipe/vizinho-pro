import uuid
from unittest.mock import AsyncMock

import pytest

from app.repositories import review as review_repo


@pytest.mark.asyncio
async def test_create_review_adds_to_session() -> None:
    mock_db = AsyncMock()
    review = await review_repo.create(
        mock_db,
        provider_id=uuid.uuid4(),
        resident_id=uuid.uuid4(),
        rating=4,
        comment="Ótimo serviço",
    )
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()
