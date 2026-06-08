import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CreateReviewRequest(BaseModel):
    provider_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class RespondToReviewRequest(BaseModel):
    response: str = Field(min_length=1, max_length=1000)

    @field_validator("response")
    @classmethod
    def response_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("A resposta não pode estar em branco")
        return v.strip()


class ReviewResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    resident_full_name: str
    rating: int
    comment: str | None
    verified_hire: bool
    provider_response: str | None
    responded_at: datetime | None
    created_at: datetime
