from pydantic import BaseModel, Field, field_validator


class RankChunksRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    page_text: str = Field(..., min_length=1)
    top_k: int | None = Field(default=None, ge=1)
    url: str | None = None

    @field_validator("prompt", "page_text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class RankedChunk(BaseModel):
    rank: int
    score: float
    text: str
    explanation: str


class RankChunksResponse(BaseModel):
    chunks: list[RankedChunk]
